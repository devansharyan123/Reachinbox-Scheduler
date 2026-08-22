import express from "express";
import cors from "cors";
import { getEmailQueue } from "./queue/email.queue";
import { prisma } from "./config/database";
import emailRoutes from "./routes/email.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/emails", emailRoutes);
app.use("/api/dashboard", dashboardRoutes);

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
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
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

app.post("/dev/test-stale-processing", async (_req, res) => {
  const user = await prisma.user.create({
    data: {
      googleId: `stale-test-${Date.now()}`,
      name: "Stale Test User",
      email: `stale-test-${Date.now()}@example.com`,
    },
  });

  const sender = await prisma.sender.create({
    data: {
      email: `stale-sender-${Date.now()}@example.com`,
      name: "Stale Test Sender",
      hourlyLimit: 200,
      userId: user.id,
    },
  });

  const email = await prisma.email.create({
    data: {
      recipient: "stale-recipient@example.com",
      subject: "Stale Processing Test",
      body: "Testing crash recovery.",
      scheduledAt: new Date(),
      status: "PROCESSING",
      senderId: sender.id,
    },
  });

  await prisma.email.update({
    where: {
      id: email.id,
    },
    data: {
      updatedAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  });

  res.json({
    message: "Created stale PROCESSING email",
    emailId: email.id,
  });
});

export default app;
