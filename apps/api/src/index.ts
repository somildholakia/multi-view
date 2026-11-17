import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Job } from "./model.js";
import { validateAuthorizedMediaUrl } from "./policy.js";

const port = Number(process.env.PORT ?? 4000);
const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

function redisOptions() {
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null
  };
}

const redis = new IORedis(redisUrl.toString(), { maxRetriesPerRequest: null });
const queue = new Queue("media-qa", { connection: redisOptions() });

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: (process.env.WEB_ORIGIN ?? "http://localhost:5173").split(",").map((value) => value.trim()),
  credentials: false
}));
app.use(express.json({ limit: "32kb" }));

if (process.env.NODE_ENV === "production" && !process.env.API_AUTH_TOKEN) {
  throw new Error("API_AUTH_TOKEN is required in production.");
}

app.use("/api", (req, res, next) => {
  const expected = process.env.API_AUTH_TOKEN;
  if (!expected) return next();

  const supplied = req.header("authorization")?.replace(/^Bearer\\s+/i, "") ?? "";
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return res.status(401).json({ error: "Unauthorized. Enter the API access token." });
  }
  next();
});

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

const createJobSchema = z.object({
  mediaUrl: z.string().url().max(2048),
  targetSessions: z.number().int().min(1).max(Number(process.env.MAX_TARGET_SESSIONS ?? 100000)),
  concurrency: z.number().int().min(1).max(Math.min(12, Number(process.env.MAX_CONCURRENCY ?? 12))),
  sessionMinutes: z.number().min(0.1).max(60),
  breakAfterMinutes: z.number().min(0.1).max(240),
  breakMinutes: z.number().min(0).max(240)
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "multi-view-api", timestamp: new Date().toISOString() });
});

app.get("/api/jobs", async (_req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(30).lean();
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs/:id", async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

app.post("/api/jobs", writeLimiter, async (req, res, next) => {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid job settings.", details: parsed.error.flatten() });
    }

    let mediaUrl: string;
    try {
      mediaUrl = validateAuthorizedMediaUrl(parsed.data.mediaUrl);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Media URL rejected." });
    }

    const job = await Job.create({
      ...parsed.data,
      mediaUrl,
      workerRegion: "pending",
      status: "queued"
    });

    try {
      await queue.add("run-media-qa", { jobId: String(job._id) }, {
        jobId: String(job._id),
        removeOnComplete: 100,
        removeOnFail: 100
      });
    } catch (queueError) {
      await Job.findByIdAndUpdate(job._id, {
        status: "failed",
        lastError: "Could not enqueue this job.",
        finishedAt: new Date()
      });
      throw queueError;
    }

    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
});

app.post("/api/jobs/:id/:action", writeLimiter, async (req, res, next) => {
  try {
    const { id, action } = req.params;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ error: "Job not found." });

    if (action === "pause" && ["queued", "running"].includes(job.status)) {
      job.status = "paused";
    } else if (action === "resume" && job.status === "paused") {
      job.status = "running";
    } else if (action === "stop" && !["completed", "stopped", "failed"].includes(job.status)) {
      job.status = "stopped";
      job.finishedAt = new Date();
      job.activeSessions = 0;
    } else {
      return res.status(409).json({ error: "That action is not valid for the current job state." });
    }

    await job.save();
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/multiview_qa");
  await redis.ping();
  app.listen(port, "0.0.0.0", () => {
    console.log("MultiView API listening on port " + port);
  });
}

start().catch((error) => {
  console.error("API startup failed:", error);
  process.exit(1);
});

async function shutdown() {
  await queue.close();
  await redis.quit();
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
