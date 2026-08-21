import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import { redis } from "./config/redis";

const startServer = async () => {
  await redis.ping();
  console.log("Redis ping successful");

  const server = app.listen(env.PORT, () => {
    console.log(`Backend running on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Shutting down...`);

    server.close(() => {
      redis.quit();
      console.log("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});