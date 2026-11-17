import dotenv from "dotenv";
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? "../../.env" });

import IORedis from "ioredis";
import mongoose from "mongoose";
import { Worker } from "bullmq";
import { runMediaQaJob } from "./runner.js";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  tls: redisUrl.protocol === "rediss:" ? {} : undefined,
  maxRetriesPerRequest: null
};

const redis = new IORedis(redisUrl.toString(), { maxRetriesPerRequest: null });

async function start() {
  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/multiview_qa");

  const worker = new Worker(
    "media-qa",
    async (queueJob) => {
      await runMediaQaJob(String(queueJob.data.jobId));
    },
    { connection, concurrency: 1 }
  );

  worker.on("completed", (job) => console.log("Completed queue job:", job.id));
  worker.on("failed", (job, error) => console.error("Queue job failed:", job?.id, error));
  console.log("Media QA worker ready in region:", process.env.WORKER_REGION ?? "unassigned");

  const shutdown = async () => {
    await worker.close();
    await redis.quit();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Worker startup failed:", error);
  process.exit(1);
});
