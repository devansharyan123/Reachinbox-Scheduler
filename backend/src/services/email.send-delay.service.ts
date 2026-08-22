import { redis } from "../config/redis";
import { env } from "../config/env";

export const enforceMinimumSendDelay = async (
  senderId: string
) => {
  const key = `email-last-send:${senderId}`;

  const lastSend = await redis.get(key);

  if (!lastSend) {
    return;
  }

  const elapsed =
    Date.now() - Number(lastSend);

  const requiredDelay =
    env.MIN_EMAIL_DELAY_SECONDS * 1000;

  if (elapsed < requiredDelay) {
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        requiredDelay - elapsed
      )
    );
  }
};

export const recordSendTime = async (
  senderId: string
) => {
  await redis.set(
    `email-last-send:${senderId}`,
    Date.now().toString()
  );
};