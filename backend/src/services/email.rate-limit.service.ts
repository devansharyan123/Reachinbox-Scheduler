import { redis } from "../config/redis";
import { env } from "../config/env";

export const getSenderRateLimit = async (
  senderId: string
) => {
  const now = Date.now();

  const hourWindow = Math.floor(
    now / (60 * 60 * 1000)
  );

  const counterKey =
    `email-rate:${senderId}:${hourWindow}`;

  const currentCount = Number(
    (await redis.get(counterKey)) ?? 0
  );

  const maxEmails =
    env.MAX_EMAILS_PER_HOUR;

  if (currentCount >= maxEmails) {
    const nextHour =
      (hourWindow + 1) * 60 * 60 * 1000;

    return {
      allowed: false,
      delay: Math.max(1000, nextHour - now),
    };
  }

  return {
    allowed: true,
    delay: 0,
  };
};

export const recordEmailSend = async (
  senderId: string
) => {
  const now = Date.now();

  const hourWindow = Math.floor(
    now / (60 * 60 * 1000)
  );

  const counterKey =
    `email-rate:${senderId}:${hourWindow}`;

  const count = await redis.incr(counterKey);

  if (count === 1) {
    await redis.expire(counterKey, 3700);
  }
};