import { redis } from "../config/redis";

const HOUR_MS = 60 * 60 * 1000;
const RATE_LIMIT_KEY_TTL_SECONDS = 3700;

const getRateLimitKey = (
  senderId: string,
  hourWindow: number
) => {
  return `email-rate:${senderId}:${hourWindow}`;
};

export const reserveEmailSlot = async (
  senderId: string,
  hourlyLimit: number
) => {
  const now = Date.now();

  const hourWindow = Math.floor(
    now / HOUR_MS
  );

  const key = getRateLimitKey(
    senderId,
    hourWindow
  );

  /*
   * INCR is atomic in Redis.
   *
   * Multiple workers can execute this concurrently,
   * but each worker receives a unique incremented count.
   */
  const count = await redis.incr(key);

  /*
   * Set expiration only when the key is first created.
   */
  if (count === 1) {
    await redis.expire(
      key,
      RATE_LIMIT_KEY_TTL_SECONDS
    );
  }

  /*
   * This worker successfully reserved a slot.
   */
  if (count <= hourlyLimit) {
    return {
      allowed: true,
      delay: 0,
      key,
    };
  }

  /*
   * We exceeded the limit.
   *
   * Release the reservation we just made.
   */
  await redis.decr(key);

  const nextHour =
    (hourWindow + 1) * HOUR_MS;

  return {
    allowed: false,
    delay: Math.max(
      1000,
      nextHour - now
    ),
    key,
  };
};

export const releaseEmailSlot = async (
  key: string
) => {
  /*
   * Release a previously reserved slot when
   * the SMTP operation fails.
   */
  const count = await redis.decr(key);

  /*
   * Defensive cleanup.
   *
   * The count should never normally become negative,
   * but deleting a zero/negative key keeps Redis clean.
   */
  if (count <= 0) {
    await redis.del(key);
  }
};