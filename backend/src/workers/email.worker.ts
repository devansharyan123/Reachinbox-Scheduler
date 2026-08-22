import { Worker } from "bullmq";
import { redis } from "../config/redis";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { SendEmailJob } from "../queue/types";

const workers = new Map<string, Worker<SendEmailJob>>();

const createWorkerForSender = (senderId: string) => {
  if (workers.has(senderId)) {
    return;
  }

  const queueName = `email-sender-${senderId}`;

  const worker = new Worker<SendEmailJob>(
    queueName,
    async (job) => {
      console.log(
        `[${queueName}] Processing job ${job.id}`
      );

      const { emailId } = job.data;

      const claimedEmails = await prisma.$queryRaw<
        Array<{
          id: string;
          recipient: string;
          subject: string;
          body: string;
          status: string;
        }>
      >`
        UPDATE "Email"
        SET
          status = 'PROCESSING',
          attempts = attempts + 1,
          "updatedAt" = NOW()
        WHERE id = ${emailId}
          AND status IN ('SCHEDULED', 'FAILED')
        RETURNING
          id,
          recipient,
          subject,
          body,
          status;
      `;

      if (claimedEmails.length === 0) {
        console.log(
          `[${queueName}] Email ${emailId} was already claimed or completed. Skipping.`
        );

        return;
      }

      const email = claimedEmails[0];

      console.log(
        `[${queueName}] Email ${email.id} claimed successfully.`
      );

      console.log(`Recipient: ${email.recipient}`);
      console.log(`Subject: ${email.subject}`);

      // Ethereal sending will be added next.
    },
    {
      connection: redis,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(
      `[${queueName}] Job ${job.id} completed.`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[${queueName}] Job ${job?.id} failed:`,
      error
    );
  });

  worker.on("error", (error) => {
    console.error(
      `[${queueName}] Worker error:`,
      error
    );
  });

  workers.set(senderId, worker);

  console.log(
    `Worker created for sender ${senderId}`
  );
};

const discoverSenders = async () => {
  const senders = await prisma.sender.findMany({
    select: {
      id: true,
    },
  });

  for (const sender of senders) {
    createWorkerForSender(sender.id);
  }
};

const start = async () => {
  console.log("Email worker process started.");

  await discoverSenders();

  setInterval(() => {
    discoverSenders().catch((error) => {
      console.error(
        "Failed to discover senders:",
        error
      );
    });
  }, 5000);
};

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down workers...`);

  for (const worker of workers.values()) {
    await worker.close();
  }

  await prisma.$disconnect();
  await redis.quit();

  console.log("Worker shutdown complete.");

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch(async (error) => {
  console.error("Worker failed to start:", error);

  await prisma.$disconnect();
  await redis.quit();

  process.exit(1);
});