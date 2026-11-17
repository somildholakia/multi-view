import mongoose, { Schema } from "mongoose";
import { chromium, type Browser, type BrowserContext } from "playwright";

type Status = "queued" | "running" | "paused" | "on_break" | "completed" | "stopped" | "failed";

interface JobDoc {
  mediaUrl: string;
  targetSessions: number;
  completedSessions: number;
  failedSessions: number;
  concurrency: number;
  sessionMinutes: number;
  breakAfterMinutes: number;
  breakMinutes: number;
  activeSessions: number;
  workerRegion: string;
  status: Status;
  breakUntil?: Date | null;
  lastError?: string | null;
  startedAt?: Date;
  finishedAt?: Date;
}

const jobSchema = new Schema<JobDoc>({
  mediaUrl: String,
  targetSessions: Number,
  completedSessions: { type: Number, default: 0 },
  failedSessions: { type: Number, default: 0 },
  concurrency: Number,
  sessionMinutes: Number,
  breakAfterMinutes: Number,
  breakMinutes: Number,
  activeSessions: { type: Number, default: 0 },
  workerRegion: String,
  status: String,
  breakUntil: Date,
  lastError: String,
  startedAt: Date,
  finishedAt: Date
}, { timestamps: true });

const Job = mongoose.models.MediaQaJob ?? mongoose.model<JobDoc>("MediaQaJob", jobSchema);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function allowedHosts(): string[] {
  return (process.env.ALLOWED_MEDIA_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowedHosts().some((allowed) => host === allowed || host.endsWith("." + allowed));
}

async function getJob(jobId: string) {
  return Job.findById(jobId);
}

async function waitForResume(jobId: string): Promise<"running" | "stopped"> {
  while (true) {
    const job = await getJob(jobId);
    if (!job || job.status === "stopped") return "stopped";
    if (job.status !== "paused") return "running";
    await wait(1500);
  }
}

async function runOnePlaybackTest(
  browser: Browser,
  jobId: string,
  mediaUrl: string,
  durationMs: number
): Promise<"completed" | "failed" | "stopped"> {
  let context: BrowserContext | undefined;

  try {
    const media = new URL(mediaUrl);
    if (media.protocol !== "https:" || media.username || media.password || !isAllowedHost(media.hostname)) {
      throw new Error("Worker rejected a media URL outside the configured HTTPS allowlist.");
    }

    context = await browser.newContext({
      viewport: { width: 900, height: 600 },
      reducedMotion: "reduce"
    });

    // Block redirects, embeds and subresources outside the configured media-host allowlist.
    await context.route("**/*", async (route) => {
      try {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.protocol === "https:" && isAllowedHost(requestUrl.hostname)) {
          await route.continue();
        } else {
          await route.abort("blockedbyclient");
        }
      } catch {
        await route.abort("blockedbyclient");
      }
    });

    const page = await context.newPage();
    await page.setContent('<!doctype html><html><body style="margin:0;background:#090d18"><video id="qa-video" autoplay muted playsinline controls style="width:100%;height:100%;object-fit:contain"></video></body></html>');

    await page.evaluate((source) => {
      const video = document.querySelector<HTMLVideoElement>("#qa-video");
      if (!video) throw new Error("Video element was not created.");
      const state = window as typeof window & { __qaStarted?: boolean; __qaError?: string };
      video.addEventListener("playing", () => { state.__qaStarted = true; });
      video.addEventListener("error", () => { state.__qaError = "Media element reported a playback error."; });
      video.src = source;
      void video.play().catch((error: unknown) => {
        state.__qaError = error instanceof Error ? error.message : "Playback was blocked.";
      });
    }, mediaUrl);

    await page.waitForFunction(() => {
      const state = window as typeof window & { __qaStarted?: boolean; __qaError?: string };
      return Boolean(state.__qaStarted || state.__qaError);
    }, undefined, { timeout: 30_000 });

    const initial = await page.evaluate(() => {
      const state = window as typeof window & { __qaStarted?: boolean; __qaError?: string };
      const video = document.querySelector<HTMLVideoElement>("#qa-video");
      return {
        started: Boolean(state.__qaStarted),
        error: state.__qaError,
        currentTime: video?.currentTime ?? 0
      };
    });

    if (!initial.started) throw new Error(initial.error ?? "The video did not start.");

    let remaining = durationMs;
    let lastCurrentTime = initial.currentTime;

    while (remaining > 0) {
      const currentJob = await getJob(jobId);
      if (!currentJob || currentJob.status === "stopped") return "stopped";

      if (currentJob.status === "paused") {
        await page.evaluate(() => document.querySelector<HTMLVideoElement>("#qa-video")?.pause());
        const state = await waitForResume(jobId);
        if (state === "stopped") return "stopped";
        await page.evaluate(() => document.querySelector<HTMLVideoElement>("#qa-video")?.play());
        continue;
      }

      const step = Math.min(5_000, remaining);
      await page.waitForTimeout(step);
      const playback = await page.evaluate(() => {
        const video = document.querySelector<HTMLVideoElement>("#qa-video");
        return {
          currentTime: video?.currentTime ?? 0,
          paused: video?.paused ?? true,
          ended: video?.ended ?? false,
          error: video?.error?.message ?? null
        };
      });

      if (playback.error) throw new Error(playback.error);
      if (playback.ended && remaining > step) {
        throw new Error("The media ended before the configured QA playback interval.");
      }
      if (playback.paused && remaining > step) {
        throw new Error("Playback stopped before the QA interval completed.");
      }
      if (!playback.ended && playback.currentTime <= lastCurrentTime + 0.1) {
        throw new Error("The media timeline did not advance during the playback test.");
      }

      lastCurrentTime = playback.currentTime;
      remaining -= step;
    }

    return "completed";
  } catch (error) {
    console.warn("Playback test failed:", error instanceof Error ? error.message : error);
    return "failed";
  } finally {
    await context?.close().catch(() => undefined);
  }
}

async function waitThroughBreak(jobId: string, until: Date): Promise<boolean> {
  while (Date.now() < until.getTime()) {
    const job = await getJob(jobId);
    if (!job || job.status === "stopped") return false;
    await wait(Math.min(2000, until.getTime() - Date.now()));
  }
  return true;
}

export async function runMediaQaJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job || ["completed", "stopped", "failed"].includes(job.status)) return;

  let browser: Browser | undefined;
  const region = process.env.WORKER_REGION ?? "unassigned";
  const sessionDurationMs = Math.round(job.sessionMinutes * 60_000);
  let activeMinutesSinceBreak = 0;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--autoplay-policy=no-user-gesture-required", "--disable-dev-shm-usage"]
    });

    await Job.findByIdAndUpdate(jobId, {
      $set: {
        workerRegion: region,
        startedAt: job.startedAt ?? new Date(),
        ...(job.status === "queued" ? { status: "running" } : {})
      }
    });

    while (true) {
      const current = await getJob(jobId);
      if (!current || current.status === "stopped") break;

      if (current.status === "paused") {
        const result = await waitForResume(jobId);
        if (result === "stopped") break;
        continue;
      }

      if (current.completedSessions >= current.targetSessions) {
        await Job.findByIdAndUpdate(jobId, {
          $set: { status: "completed", activeSessions: 0, finishedAt: new Date(), breakUntil: null }
        });
        break;
      }

      if (current.status === "on_break" && current.breakUntil) {
        const resumed = await waitThroughBreak(jobId, current.breakUntil);
        if (!resumed) break;
        await Job.findByIdAndUpdate(jobId, {
          $set: { status: "running", breakUntil: null }
        });
        activeMinutesSinceBreak = 0;
        continue;
      }

      const remaining = current.targetSessions - current.completedSessions;
      const laneCount = Math.min(current.concurrency, remaining);
      await Job.findByIdAndUpdate(jobId, {
        $set: { status: "running", activeSessions: laneCount, workerRegion: region }
      });

      const outcomes = await Promise.all(
        Array.from({ length: laneCount }, () =>
          runOnePlaybackTest(browser!, jobId, current.mediaUrl, sessionDurationMs)
        )
      );

      const completed = outcomes.filter((result) => result === "completed").length;
      const failed = outcomes.filter((result) => result === "failed").length;
      const stopped = outcomes.includes("stopped");

      await Job.findByIdAndUpdate(jobId, {
        $inc: { completedSessions: completed, failedSessions: failed },
        $set: { activeSessions: 0 }
      });

      if (stopped) break;

      activeMinutesSinceBreak += current.sessionMinutes;
      const refreshed = await getJob(jobId);
      if (!refreshed) break;

      if (refreshed.completedSessions >= refreshed.targetSessions) {
        await Job.findByIdAndUpdate(jobId, {
          $set: { status: "completed", activeSessions: 0, finishedAt: new Date(), breakUntil: null }
        });
        break;
      }

      if (activeMinutesSinceBreak >= current.breakAfterMinutes && current.breakMinutes > 0) {
        const breakUntil = new Date(Date.now() + current.breakMinutes * 60_000);
        await Job.findByIdAndUpdate(jobId, {
          $set: { status: "on_break", activeSessions: 0, breakUntil }
        });
      }

      if (failed === laneCount) {
        await Job.findByIdAndUpdate(jobId, {
          $set: { lastError: "Every session in the last batch failed. Check the media URL and worker logs." }
        });
        await wait(5000);
      }
    }

    const finalJob = await getJob(jobId);
    if (finalJob && finalJob.status === "stopped") {
      await Job.findByIdAndUpdate(jobId, { $set: { activeSessions: 0, finishedAt: new Date() } });
    }
  } catch (error) {
    await Job.findByIdAndUpdate(jobId, {
      $set: {
        status: "failed",
        activeSessions: 0,
        lastError: error instanceof Error ? error.message : "Worker failure.",
        finishedAt: new Date()
      }
    });
    throw error;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
