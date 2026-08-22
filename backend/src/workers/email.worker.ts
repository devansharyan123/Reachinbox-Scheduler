import { Worker } from "bullmq";
import { redis } from "../config/redis";
import { prisma } from "../config/database";
import { SendEmailJob } from "../queue/types";

const senderId = process.env.WORKER_SENDER_ID;

if (!senderId) {
  throw new Error("WORKER_SENDER_ID is required");
}

const worker = new Worker<SendEmailJob>(
  `email-sender-${senderId}`,
  async (job) => {
    console.log(`Processing job ${job.id}`);

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
        `Job ${job.id} was already claimed or completed. Skipping.`
      );

      return;
    }

    const email = claimedEmails[0];

    console.log(`Email ${email.id} claimed successfully.`);
    console.log(`Recipient: ${email.recipient}`);
    console.log(`Subject: ${email.subject}`);

    // Sending will be added in the next step.
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed.`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log(`Email worker started for sender: ${senderId}`);