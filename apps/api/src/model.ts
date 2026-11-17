import mongoose, { Schema } from "mongoose";

export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "on_break"
  | "completed"
  | "stopped"
  | "failed";

export interface MediaQaJob {
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
  status: JobStatus;
  breakUntil?: Date;
  lastError?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<MediaQaJob>(
  {
    mediaUrl: { type: String, required: true },
    targetSessions: { type: Number, required: true, min: 1 },
    completedSessions: { type: Number, default: 0, min: 0 },
    failedSessions: { type: Number, default: 0, min: 0 },
    concurrency: { type: Number, required: true, min: 1, max: 12 },
    sessionMinutes: { type: Number, required: true, min: 0.1, max: 60 },
    breakAfterMinutes: { type: Number, required: true, min: 0.1, max: 240 },
    breakMinutes: { type: Number, required: true, min: 0, max: 240 },
    activeSessions: { type: Number, default: 0 },
    workerRegion: { type: String, default: "unassigned" },
    status: {
      type: String,
      enum: ["queued", "running", "paused", "on_break", "completed", "stopped", "failed"],
      default: "queued"
    },
    breakUntil: Date,
    lastError: String,
    startedAt: Date,
    finishedAt: Date
  },
  { timestamps: true }
);

export const Job = mongoose.model<MediaQaJob>("MediaQaJob", jobSchema);
