import { redis } from "../config/redis";
import { env } from "../config/env";

const MIN_DELAY_MS =
  env.MIN_EMAIL_DELAY_SECONDS * 1000;

/*
 * Redis key storing the timestamp of the next
 * available sending slot for a sender.
 */
const getNextSendKey = (senderId: string) => {
  return `email-next-send:${senderId}`;
};

/*
 * Atomically reserve the next available send slot.
 *
 * KEYS[1] = sender's next-send timestamp
 * ARGV[1] = current timestamp
 * ARGV[2] = minimum delay in milliseconds
 *
 * Returns:
 *   - reserved timestamp for this worker
 *
 * Example with 2 second delay:
 *
 * Worker A -> now
 * Worker B -> now + 2000
 * Worker C -> now + 4000
 * Worker D -> now + 6000
 */
const RESERVE_NEXT_SEND_SLOT_SCRIPT = `
local key = KEYS[1]

local now = tonumber(ARGV[1])
local delay = tonumber(ARGV[2])

local current = redis.call("GET", key)

local nextAvailable

if not current then
  nextAvailable = now
else
  current = tonumber(current)

  if current < now then
    nextAvailable = now
  else
    nextAvailable = current
  end
end

local reservedAt = nextAvailable

local nextSlot = nextAvailable + delay

redis.call(
  "SET",
  key,
  tostring(nextSlot)
)

return reservedAt
`;

export const enforceMinimumSendDelay = async (
  senderId: string
) => {
  const key = getNextSendKey(senderId);

  const now = Date.now();

  /*
   * Atomically reserve a future sending slot.
   */
  const reservedAt = Number(
    await redis.eval(
      RESERVE_NEXT_SEND_SLOT_SCRIPT,
      1,
      key,
      now.toString(),
      MIN_DELAY_MS.toString()
    )
  );

  /*
   * If the reserved slot is in the future,
   * wait until that exact slot.
   */
  const delay = reservedAt - now;

  if (delay > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }
};

/*
 * Kept for compatibility with the existing worker.
 *
 * The actual reservation is now performed by
 * enforceMinimumSendDelay().
 *
 * We intentionally do not update the Redis timestamp
 * here because doing another SET after SMTP would
 * destroy the atomic reservation schedule.
 */
export const recordSendTime = async (
  _senderId: string
) => {
  return;
};