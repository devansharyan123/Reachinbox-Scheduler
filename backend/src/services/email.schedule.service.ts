import { randomUUID } from "node:crypto";
import { prisma } from "../config/database";
import { getEmailQueue } from "../queue/email.queue";

interface ScheduleInput {
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  emails: string[];
}

export const scheduleEmails = async ({
  senderId,
  subject,
  body,
  startTime,
  delaySeconds,
  hourlyLimit,
  emails,
}: ScheduleInput) => {
  if (!emails.length) {
    throw new Error("0 valid emails detected");
  }

  if (delaySeconds < 0) {
    throw new Error("delaySeconds must be >= 0");
  }

  if (hourlyLimit <= 0) {
    throw new Error("hourlyLimit must be greater than 0");
  }

  const start = new Date(startTime);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid startTime");
  }

  const sender = await prisma.sender.findUnique({
    where: {
      id: senderId,
    },
  });

  if (!sender) {
    throw new Error("Sender not found");
  }

  // Save the requested per-sender hourly limit.
  await prisma.sender.update({
    where: {
      id: senderId,
    },
    data: {
      hourlyLimit,
    },
  });

  const existingLastEmail = await prisma.email.findFirst({
    where: {
      senderId,
      status: {
        in: ["SCHEDULED", "PROCESSING"],
      },
    },
    orderBy: {
      scheduledAt: "desc",
    },
    select: {
      scheduledAt: true,
    },
  });

  const delayMs = delaySeconds * 1000;

  const hourlyIntervalMs =
    60 * 60 * 1000 / hourlyLimit;

  const minimumIntervalMs = Math.max(
    delayMs,
    hourlyIntervalMs
  );

  let senderLastSlot =
    existingLastEmail?.scheduledAt &&
    existingLastEmail.scheduledAt > start
      ? existingLastEmail.scheduledAt
      : start;

  const records = emails.map((recipient, index) => {
    const requestedSlot = new Date(
      start.getTime() + index * delayMs
    );

    const rateLimitedSlot = new Date(
      senderLastSlot.getTime() + minimumIntervalMs
    );

    const scheduledAt =
      requestedSlot > rateLimitedSlot
        ? requestedSlot
        : rateLimitedSlot;

    senderLastSlot = scheduledAt;

    return {
      id: randomUUID(),
      recipient,
      subject,
      body,
      scheduledAt,
      status: "SCHEDULED" as const,
      senderId,
    };
  });

  // Bulk insert into PostgreSQL.
  await prisma.email.createMany({
    data: records,
  });

  const queue = getEmailQueue(senderId);

  // Bulk add to BullMQ.
  await queue.addBulk(
    records.map((email) => ({
      name: "send-email",
      data: {
        emailId: email.id,
        senderId,
      },
      opts: {
        jobId: email.id,
        delay: Math.max(
          0,
          email.scheduledAt.getTime() - Date.now()
        ),
        attempts: 3,
        backoff: {
          type: "exponential" as const,
          delay: 5000,
        },
      },
    }))
  );

  return {
    scheduledCount: records.length,
    firstScheduledAt: records[0].scheduledAt,
    lastScheduledAt:
      records[records.length - 1].scheduledAt,
  };
};