import { Worker } from "bullmq";

import { redis } from "../config/redis";
import { prisma } from "../config/database";
import { env } from "../config/env";

import { SendEmailJob } from "../queue/types";

import { sendEmail } from "../services/mail.service";

import {
  reserveEmailSlot,
  releaseEmailSlot,
} from "../services/email.rate-limit.service";

import {
  enforceMinimumSendDelay,
  recordSendTime,
} from "../services/email.send-delay.service";

import { reconcileStaleProcessingEmails } from "../services/email.reconciliation.service";

import { getEmailQueue } from "../queue/email.queue";

const workers = new Map<string, Worker<SendEmailJob>>();

const createWorkerForSender = (senderId: string) => {
  if (workers.has(senderId)) {
    return;
  }

  const queueName = `email-sender-${senderId}`;

  const worker = new Worker<SendEmailJob>(
    queueName,

    async (job) => {
      console.log(`[${queueName}] Processing job ${job.id}`);

      const { emailId } = job.data;

      /*
       * Atomic idempotency claim.
       *
       * Only one worker can change:
       * SCHEDULED/FAILED -> PROCESSING
       */
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

      /*
       * Zero rows means:
       * - another worker claimed it
       * - or it was already completed
       */
      if (claimedEmails.length === 0) {
        console.log(
          `[${queueName}] Email ${emailId} was already claimed or completed. Skipping.`,
        );

        return;
      }

      const email = claimedEmails[0];

      /*
       * Keep track of the Redis rate-limit reservation.
       *
       * If SMTP fails after reserving a slot,
       * the slot will be released.
       */
      let rateLimitKey: string | undefined;

      try {
        /*
         * Get the sender before applying the rate limit
         * because the hourly limit is sender-specific.
         */
        const sender = await prisma.sender.findUnique({
          where: {
            id: senderId,
          },
          select: {
            email: true,
            hourlyLimit: true,
          },
        });

        if (!sender) {
          throw new Error(`Sender ${senderId} not found`);
        }

        /*
         * Atomically reserve an hourly sending slot.
         *
         * Redis INCR guarantees that concurrent workers
         * cannot reserve the same slot.
         */
        const rateLimit = await reserveEmailSlot(
          senderId,
          sender.hourlyLimit,
        );

        /*
         * Hourly limit has been reached.
         *
         * IMPORTANT:
         *
         * We do NOT call job.moveToDelayed() here.
         *
         * The current job is active and owned by the worker.
         * Manually moving it to delayed state causes BullMQ
         * lock errors when the worker later tries to finish it.
         *
         * Instead:
         * 1. Put the database record back into SCHEDULED.
         * 2. Create a new delayed BullMQ job.
         * 3. Return normally so BullMQ can complete this job.
         */
        if (!rateLimit.allowed) {
          console.log(
            `[${queueName}] Hourly limit reached for job ${job.id}. Rescheduling.`,
          );

          const retryJobId =
            `${email.id}:rate-limit:${Math.floor(
              Date.now() / (60 * 60 * 1000),
            )}`;

          /*
           * Put the email back into SCHEDULED state.
           */
          await prisma.email.update({
            where: {
              id: email.id,
            },
            data: {
              status: "SCHEDULED",
              lastError:
                "Delayed because sender hourly limit was reached",
            },
          });

          /*
           * Create a new delayed BullMQ job.
           *
           * The current active job will simply return and
           * complete normally.
           */
          const queue = getEmailQueue(senderId);

          await queue.add(
            "send-email",
            {
              emailId: email.id,
              senderId,
            },
            {
              jobId: retryJobId,
              delay: rateLimit.delay,
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 5000,
              },
            },
          );

          console.log(
            `[${queueName}] Email ${email.id} rescheduled for ${
              rateLimit.delay
            }ms later.`,
          );

          return;
        }

        /*
         * The hourly slot has now been successfully reserved.
         *
         * Save the key so that it can be released if
         * the SMTP operation fails.
         */
        rateLimitKey = rateLimit.key;

        /*
         * Enforce minimum delay between sends.
         *
         * This will be made concurrency-safe in the next task.
         */
        await enforceMinimumSendDelay(senderId);

        console.log(
          `[${queueName}] Sending email ${email.id} to ${email.recipient}`,
        );

        /*
         * Send through Ethereal SMTP.
         */
        const result = await sendEmail({
          from: sender.email,
          to: email.recipient,
          subject: email.subject,
          text: email.body,
        });

        /*
         * Record the successful send time.
         */
        await recordSendTime(senderId);

        /*
         * Mark database state as SENT.
         */
        await prisma.email.update({
          where: {
            id: email.id,
          },
          data: {
            status: "SENT",
            sentAt: new Date(),
            failedAt: null,
            lastError: null,
          },
        });

        console.log(
          `[${queueName}] Email ${email.id} sent successfully.`,
        );

        if (result.previewUrl) {
          console.log(
            `[${queueName}] Preview: ${result.previewUrl}`,
          );
        }
      } catch (error) {
        /*
         * If an hourly slot was reserved but SMTP failed,
         * release that reservation so the failed email
         * does not permanently consume the hourly capacity.
         */
        if (rateLimitKey) {
          try {
            await releaseEmailSlot(rateLimitKey);
          } catch (releaseError) {
            console.error(
              `[${queueName}] Failed to release rate-limit slot:`,
              releaseError,
            );
          }
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unknown email sending error";

        await prisma.email.update({
          where: {
            id: email.id,
          },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            lastError: message,
          },
        });

        console.error(
          `[${queueName}] Email ${email.id} failed: ${message}`,
        );

        /*
         * Throw so BullMQ knows the job failed
         * and can apply its retry configuration.
         */
        throw error;
      }
    },

    {
      connection: redis,
      concurrency: env.WORKER_CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    console.log(
      `[${queueName}] Job ${job.id} completed.`,
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[${queueName}] Job ${job?.id} failed:`,
      error.message,
    );
  });

  worker.on("error", (error) => {
    console.error(
      `[${queueName}] Worker error:`,
      error,
    );
  });

  workers.set(senderId, worker);

  console.log(
    `Worker created for sender ${senderId}`,
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

  /*
   * Recover emails that were left PROCESSING
   * because of an earlier worker crash.
   */
  await reconcileStaleProcessingEmails();

  /*
   * Create workers for existing senders.
   */
  await discoverSenders();

  /*
   * Discover newly-created senders.
   */
  setInterval(() => {
    discoverSenders().catch((error) => {
      console.error(
        "Failed to discover senders:",
        error,
      );
    });
  }, 5000);

  /*
   * Periodically reconcile stale PROCESSING emails.
   */
  setInterval(() => {
    reconcileStaleProcessingEmails().catch((error) => {
      console.error(
        "Failed to reconcile stale emails:",
        error,
      );
    });
  }, 60_000);
};

const shutdown = async (signal: string) => {
  console.log(
    `${signal} received. Shutting down workers...`,
  );

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
  console.error(
    "Worker failed to start:",
    error,
  );

  await prisma.$disconnect();

  await redis.quit();

  process.exit(1);
});