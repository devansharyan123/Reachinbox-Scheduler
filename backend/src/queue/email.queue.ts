import { Queue } from "bullmq";
import { redis } from "../config/redis";
import { SendEmailJob } from "./types";

const queues = new Map<string, Queue<SendEmailJob>>();

export const getEmailQueue = (senderId: string): Queue<SendEmailJob> => {
  const existingQueue = queues.get(senderId);

  if (existingQueue) {
    return existingQueue;
  }

  const queue = new Queue<SendEmailJob>(
    `email-sender-${senderId}`,
    {
      connection: redis,
    }
  );

  queues.set(senderId, queue);

  return queue;
};