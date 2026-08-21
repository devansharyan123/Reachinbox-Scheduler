import express from "express";
import cors from "cors";
import { getEmailQueue } from "./queue/email.queue";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/dev/test-queue", async (_req, res) => {
  const queue = getEmailQueue("test-sender");

  const job = await queue.add(
    "send-email",
    {
      emailId: "test-email",
      senderId: "test-sender",
    },
    {
      delay: 10000,
      jobId: "test-job-1",
    }
  );

  res.json({
    message: "Test job created",
    jobId: job.id,
    queue: queue.name,
  });
});

export default app;