import express from "express";
import cors from "cors";
import { getEmailQueue } from "./queue/email.queue";
import { prisma } from "./config/database";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/dev/test-queue", async (_req, res) => {
  const user = await prisma.user.create({
    data: {
      googleId: `test-${Date.now()}`,
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
    },
  });

  const sender = await prisma.sender.create({
    data: {
      email: `sender-${Date.now()}@example.com`,
      name: "Test Sender",
      hourlyLimit: 200,
      userId: user.id,
    },
  });

  const email = await prisma.email.create({
    data: {
      recipient: "recipient@example.com",
      subject: "Test Email",
      body: "This is a test email.",
      scheduledAt: new Date(Date.now() + 5000),
      senderId: sender.id,
    },
  });

  const queue = getEmailQueue(sender.id);

  const job = await queue.add(
    "send-email",
    {
      emailId: email.id,
      senderId: sender.id,
    },
    {
      delay: 5000,
      jobId: email.id,
    }
  );

  res.json({
    message: "Test job created",
    userId: user.id,
    senderId: sender.id,
    emailId: email.id,
    jobId: job.id,
    queue: queue.name,
  });
});

export default app;