import "dotenv/config";

const main = async () => {
  const { prisma } = await import(
    "./src/config/database"
  );

  const { redis } = await import(
    "./src/config/redis"
  );

  const { getEmailQueue } = await import(
    "./src/queue/email.queue"
  );

  const TEST_PREFIX = "delaytest";

  /*
   * Find exactly 5 test emails.
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

  if (emails.length !== 5) {
    throw new Error(
      `Expected exactly 5 testdelay emails, found ${emails.length}`,
    );
  }

  const senderId = emails[0].senderId;

  /*
   * Make sure all emails use the same sender.
   */
  if (
    emails.some(
      (email) => email.senderId !== senderId,
    )
  ) {
    throw new Error(
      "Test emails do not all belong to the same sender.",
    );
  }

  const sender =
    await prisma.sender.findUnique({
      where: {
        id: senderId,
      },
      select: {
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

  /*
   * We expect the temporary test limit to be high
   * enough that hourly rate limiting does not interfere.
   */
  if (sender.hourlyLimit < 5) {
    throw new Error(
      `Hourly limit must be >= 5 for this test. Found ${sender.hourlyLimit}.`,
    );
  }

  const queue = getEmailQueue(senderId);

  /*
   * Remove old BullMQ jobs for these test emails.
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
   * Reset the minimum-delay reservation.
   */
  const nextSendKey =
    `email-next-send:${senderId}`;

  await redis.del(nextSendKey);

  console.log(
    `Reset ${nextSendKey}`,
  );

  /*
   * Reset hourly rate-limit state too.
   */
  const hourWindow = Math.floor(
    Date.now() / (60 * 60 * 1000),
  );

  const rateLimitKey =
    `email-rate:${senderId}:${hourWindow}`;

  await redis.del(rateLimitKey);

  /*
   * Reset database state.
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
      sentAt: null,
      failedAt: null,
      lastError: null,
    },
  });

  /*
   * Add all five jobs immediately.
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
        attempts: 1,
      },
    })),
  );

  console.log("");
  console.log(
    "========================================",
  );
  console.log(
    "MINIMUM SEND DELAY BURST TEST READY",
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
    "Expected minimum delay: 2 seconds",
  );
  console.log(
    "Worker concurrency should be: 5",
  );
  console.log("");
  console.log(
    "Now start the worker:",
  );
  console.log("");
  console.log(
    "npm run worker",
  );
  console.log("");
  console.log(
    "Expected send spacing:",
  );
  console.log(
    "Email 1 → ~0s",
  );
  console.log(
    "Email 2 → ~2s",
  );
  console.log(
    "Email 3 → ~4s",
  );
  console.log(
    "Email 4 → ~6s",
  );
  console.log(
    "Email 5 → ~8s",
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
    "Minimum-delay test preparation failed:",
    error,
  );

  process.exit(1);
});