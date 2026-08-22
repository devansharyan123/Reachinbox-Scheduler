import { redis } from "../config/redis";
import { env } from "../config/env";

const HOUR_MS = 60 * 60 * 1000;

export const getSenderRateLimit = async (
  senderId: string
) => {
  const now = Date.now();

  const hourWindow = Math.floor(now / HOUR_MS);

  const key = `email-rate:${senderId}:${hourWindow}`;

  const currentCount = Number(
    (await redis.get(key)) ?? "0"
  );

  if (currentCount >= env.MAX_EMAILS_PER_HOUR) {
    const nextHour =
      (hourWindow + 1) * HOUR_MS;

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

  const hourWindow = Math.floor(now / HOUR_MS);

  const key = `email-rate:${senderId}:${hourWindow}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 3700);
  }
};