import "dotenv/config";

const main = async () => {
  /*
   * Load application modules only after dotenv
   * has initialized process.env.
   */
  const { prisma } = await import(
    "./src/config/database"
  );

  const { redis } = await import(
    "./src/config/redis"
  );

  const { getEmailQueue } = await import(
    "./src/queue/email.queue"
  );

  const TEST_PREFIX = "testburst";

  const HOUR_MS = 60 * 60 * 1000;

  console.log(
    "Preparing rate-limit burst test...",
  );

  /*
   * Find the 10 test emails created earlier.
   */
  const emails = await prisma.email.findMany({
    where: {
      recipient: {
        startsWith: TEST_PREFIX,
      },
    },
    orderBy: {
      recipient: "asc",
    },
  });

  if (emails.length !== 10) {
    throw new Error(
      `Expected exactly 10 testburst emails, found ${emails.length}`,
    );
  }

  const senderId = emails[0].senderId;

  /*
   * Make sure all 10 emails belong to the
   * same sender.
   */
  const differentSender = emails.some(
    (email) => email.senderId !== senderId,
  );

  if (differentSender) {
    throw new Error(
      "Test emails do not all belong to the same sender.",
    );
  }

  /*
   * Verify sender configuration.
   */
  const sender =
    await prisma.sender.findUnique({
      where: {
        id: senderId,
      },
      select: {
        id: true,
        email: true,
        hourlyLimit: true,
      },
    });

  if (!sender) {
    throw new Error(
      `Sender ${senderId} not found.`,
    );
  }

  console.log(
    `Sender: ${sender.email}`,
  );

  console.log(
    `Hourly limit: ${sender.hourlyLimit}`,
  );

  if (sender.hourlyLimit !== 3) {
    throw new Error(
      `Expected hourlyLimit=3, but found ${sender.hourlyLimit}.`,
    );
  }

  /*
   * Get the sender-specific BullMQ queue.
   */
  const queue = getEmailQueue(senderId);

  /*
   * Remove existing BullMQ jobs for these
   * test emails.
   */
  for (const email of emails) {
    const existingJob =
      await queue.getJob(email.id);

    if (existingJob) {
      console.log(
        `Removing existing BullMQ job ${email.id}`,
      );

      await existingJob.remove();
    }
  }

  /*
   * Reset this sender's current-hour rate-limit
   * counter so previous tests don't consume slots.
   */
  const hourWindow = Math.floor(
    Date.now() / HOUR_MS,
  );

  const rateLimitKey =
    `email-rate:${senderId}:${hourWindow}`;

  await redis.del(rateLimitKey);

  console.log(
    `Reset rate-limit key: ${rateLimitKey}`,
  );

  /*
   * Reset the database state for the test emails.
   */
  await prisma.email.updateMany({
    where: {
      id: {
        in: emails.map(
          (email) => email.id,
        ),
      },
    },
    data: {
      status: "SCHEDULED",
      failedAt: null,
      sentAt: null,
      lastError: null,
    },
  });

  /*
   * Re-add all 10 jobs with delay = 0.
   *
   * This is the actual concurrency test.
   */
  await queue.addBulk(
    emails.map((email) => ({
      name: "send-email",
      data: {
        emailId: email.id,
        senderId,
      },
      opts: {
        jobId: email.id,
        delay: 0,
        attempts: 3,
        backoff: {
          type: "exponential" as const,
          delay: 5000,
        },
      },
    })),
  );

  console.log("");
  console.log(
    "========================================",
  );
  console.log(
    "BURST TEST READY",
  );
  console.log(
    "========================================",
  );
  console.log(
    `Emails: ${emails.length}`,
  );
  console.log(
    `Hourly limit: ${sender.hourlyLimit}`,
  );
  console.log(
    "BullMQ delay: 0ms",
  );
  console.log(
    "Worker concurrency should be: 5",
  );
  console.log("");
  console.log(
    "Now start the worker with:",
  );
  console.log("");
  console.log(
    "npm run worker",
  );
  console.log("");
  console.log(
    "Expected result: 3 SENT, 7 delayed/SCHEDULED",
  );
  console.log(
    "========================================",
  );

  await queue.close();
  await prisma.$disconnect();
  await redis.quit();
};

main().catch((error) => {
  console.error(
    "Burst test preparation failed:",
    error,
  );

  process.exit(1);
});