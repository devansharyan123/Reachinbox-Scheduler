import { Worker } from "bullmq";

import { redis } from "../config/redis";
import { prisma } from "../config/database";
import { env } from "../config/env";

import { SendEmailJob } from "../queue/types";

import { sendEmail } from "../services/mail.service";

import {
  getSenderRateLimit,
  recordEmailSend,
} from "../services/email.rate-limit.service";

import {
  enforceMinimumSendDelay,
  recordSendTime,
} from "../services/email.send-delay.service";

import {
  reconcileStaleProcessingEmails,
} from "../services/email.reconciliation.service";

const workers = new Map<
  string,
  Worker<SendEmailJob>
>();

const createWorkerForSender = (
  senderId: string
) => {
  if (workers.has(senderId)) {
    return;
  }

  const queueName =
    `email-sender-${senderId}`;

  const worker =
    new Worker<SendEmailJob>(
      queueName,

      async (job) => {
        console.log(
          `[${queueName}] Processing job ${job.id}`
        );

        const { emailId } = job.data;

        /*
         * Atomic idempotency claim.
         *
         * Only one worker can change:
         * SCHEDULED/FAILED -> PROCESSING
         */
        const claimedEmails =
          await prisma.$queryRaw<
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
            `[${queueName}] Email ${emailId} was already claimed or completed. Skipping.`
          );

          return;
        }

        const email = claimedEmails[0];

        try {
          /*
           * Check hourly sender limit BEFORE sending.
           */
          const rateLimit =
            await getSenderRateLimit(
              senderId
            );

          if (!rateLimit.allowed) {
            console.log(
              `[${queueName}] Hourly limit reached for job ${job.id}.`
            );

            /*
             * Put the job back into delayed state.
             */
            await job.moveToDelayed(
              Date.now() + rateLimit.delay,
              job.token
            );

            /*
             * The email must not remain PROCESSING
             * while waiting.
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

            return;
          }

          /*
           * Enforce minimum delay between sends.
           */
          await enforceMinimumSendDelay(
            senderId
          );

          const sender =
            await prisma.sender.findUnique({
              where: {
                id: senderId,
              },
              select: {
                email: true,
              },
            });

          if (!sender) {
            throw new Error(
              `Sender ${senderId} not found`
            );
          }

          console.log(
            `[${queueName}] Sending email ${email.id} to ${email.recipient}`
          );

          /*
           * Send through Ethereal SMTP.
           */
          const result =
            await sendEmail({
              from: sender.email,
              to: email.recipient,
              subject: email.subject,
              text: email.body,
            });

          /*
           * Record successful send in Redis.
           */
          await recordEmailSend(
            senderId
          );

          await recordSendTime(
            senderId
          );

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
            `[${queueName}] Email ${email.id} sent successfully.`
          );

          if (result.previewUrl) {
            console.log(
              `[${queueName}] Preview: ${result.previewUrl}`
            );
          }
        } catch (error) {
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
            `[${queueName}] Email ${email.id} failed: ${message}`
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
        concurrency:
          env.WORKER_CONCURRENCY,
      },
    );

  worker.on(
    "completed",
    (job) => {
      console.log(
        `[${queueName}] Job ${job.id} completed.`
      );
    }
  );

  worker.on(
    "failed",
    (job, error) => {
      console.error(
        `[${queueName}] Job ${job?.id} failed:`,
        error.message
      );
    }
  );

  worker.on(
    "error",
    (error) => {
      console.error(
        `[${queueName}] Worker error:`,
        error
      );
    }
  );

  workers.set(
    senderId,
    worker
  );

  console.log(
    `Worker created for sender ${senderId}`
  );
};

const discoverSenders =
  async () => {
    const senders =
      await prisma.sender.findMany({
        select: {
          id: true,
        },
      });

    for (const sender of senders) {
      createWorkerForSender(
        sender.id
      );
    }
  };

const start = async () => {
  console.log(
    "Email worker process started."
  );

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
    discoverSenders().catch(
      (error) => {
        console.error(
          "Failed to discover senders:",
          error
        );
      }
    );
  }, 5000);

  /*
   * Periodically reconcile stale PROCESSING emails.
   */
  setInterval(() => {
    reconcileStaleProcessingEmails().catch(
      (error) => {
        console.error(
          "Failed to reconcile stale emails:",
          error
        );
      }
    );
  }, 60_000);
};

const shutdown =
  async (signal: string) => {
    console.log(
      `${signal} received. Shutting down workers...`
    );

    for (const worker of workers.values()) {
      await worker.close();
    }

    await prisma.$disconnect();

    await redis.quit();

    console.log(
      "Worker shutdown complete."
    );

    process.exit(0);
  };

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

start().catch(async (error) => {
  console.error(
    "Worker failed to start:",
    error
  );

  await prisma.$disconnect();

  await redis.quit();

  process.exit(1);
});