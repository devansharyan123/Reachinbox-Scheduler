import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT ?? 5000),
  NODE_ENV: process.env.NODE_ENV ?? "development",

  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",

  WORKER_CONCURRENCY: Number(
    process.env.WORKER_CONCURRENCY ?? 5
  ),

  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? "",

  MIN_EMAIL_DELAY_SECONDS: Number(
    process.env.MIN_EMAIL_DELAY_SECONDS ?? 2
  ),

  MAX_EMAILS_PER_HOUR: Number(
    process.env.MAX_EMAILS_PER_HOUR ?? 200
  ),

  INTERNAL_API_SECRET:
    process.env.INTERNAL_API_SECRET ?? "",
};