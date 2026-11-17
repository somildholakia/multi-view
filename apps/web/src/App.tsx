import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, CheckCircle2, Clock3, KeyRound, Layers3,
  LoaderCircle, Pause, Play, Plus, RefreshCw, ShieldCheck, Square,
  Video, Wifi, XCircle
} from "lucide-react";

type JobStatus = "queued" | "running" | "paused" | "on_break" | "completed" | "stopped" | "failed";

interface QaJob {
  _id: string;
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
  breakUntil?: string;
  lastError?: string;
  createdAt: string;
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
const emptyForm = {
  mediaUrl: "",
  targetSessions: 1000,
  concurrency: 12,
  sessionMinutes: 5,
  breakAfterMinutes: 5,
  breakMinutes: 5
};

function statusLabel(status: JobStatus) {
  return status.replace("_", " ");
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("multiview-api-token") ?? "");
  const [form, setForm] = useState(emptyForm);
  const [jobs, setJobs] = useState<QaJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [previewGridOpen, setPreviewGridOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const previewPlayers = useRef<(HTMLVideoElement | null)[]>([]);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token.trim()) headers.set("Authorization", "Bearer " + token.trim());
    const response = await fetch(API_URL + path, { ...init, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Request failed.");
    return body;
  }, [token]);

  const refresh = useCallback(async () => {
    try {
      const [, data] = await Promise.all([
        request("/api/health"),
        request("/api/jobs")
      ]);
      setApiOnline(true);
      const nextJobs = (data.jobs ?? []) as QaJob[];
      setJobs(nextJobs);
      setSelectedId((current) => current ?? nextJobs[0]?._id ?? null);
      setError("");
    } catch (err) {
      setApiOnline(false);
      setError(err instanceof Error ? err.message : "Cannot connect to the API.");
    }
  }, [request]);

  useEffect(() => {
    sessionStorage.setItem("multiview-api-token", token);
  }, [token]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedId) ?? jobs[0] ?? null,
    [jobs, selectedId]
  );

  const progress = selectedJob
    ? Math.min(100, Math.round((selectedJob.completedSessions / selectedJob.targetSessions) * 100))
    : 0;

  async function createJob(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/jobs", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setJobs((current) => [data.job as QaJob, ...current]);
      setSelectedId(data.job._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the QA task.");
    } finally {
      setLoading(false);
    }
  }

  async function controlJob(action: "pause" | "resume" | "stop") {
    if (!selectedJob) return;
    setBusyAction(action);
    setError("");
    try {
      const data = await request("/api/jobs/" + selectedJob._id + "/" + action, { method: "POST" });
      setJobs((current) => current.map((job) => job._id === selectedJob._id ? data.job as QaJob : job));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyAction("");
    }
  }

  const canPause = selectedJob && ["queued", "running"].includes(selectedJob.status);
  const canResume = selectedJob?.status === "paused";
  const canStop = selectedJob && !["completed", "stopped", "failed"].includes(selectedJob.status);

  function playAllPreviews() {
    const players = previewPlayers.current.filter((player): player is HTMLVideoElement => player !== null);
    setPreviewMessage("");
    void Promise.allSettled(players.map((player) => player.play())).then((results) => {
      const blocked = results.filter((result) => result.status === "rejected").length;
      setPreviewMessage(blocked ? `${blocked} player(s) could not start. Check the media format and browser support.` : "All local preview players started.");
    });
  }

  function pauseAllPreviews() {
    previewPlayers.current.forEach((player) => player?.pause());
    setPreviewMessage("All local preview players paused.");
  }

  function togglePreviewGrid() {
    if (previewGridOpen) {
      previewPlayers.current.forEach((player) => {
        if (player) {
          player.pause();
          player.currentTime = 0;
        }
      });
      setPreviewMessage("");
    }
    setPreviewGridOpen((open) => !open);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Layers3 size={21} /></div>
          <div><strong>MultiView</strong><span>MEDIA QA LAB</span></div>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <div className="nav-item active"><Activity size={17} /> Overview</div>
        <div className="nav-item"><Video size={17} /> Playback sessions</div>
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <div><strong>Authorized testing only</strong><p>Runs are synthetic QA sessions against media hosts you control.</p></div>
        </div>
        <div className="sidebar-footer">MULTIVIEW · FINAL YEAR PROJECT</div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">CONTROL CENTER / OVERVIEW</div>
            <h1>Media QA dashboard</h1>
          </div>
          <div className={"api-status " + (apiOnline ? "online" : "offline")}>
            <span className="status-dot" /> {apiOnline ? "API connected" : "API offline"}
          </div>
        </header>

        <div className="notice">
          <ShieldCheck size={18} />
          <span><strong>QA mode:</strong> Counts represent completed test playback sessions, not YouTube views, watch hours or real audience members.</span>
        </div>

        {error && <div className="error-banner"><AlertCircle size={17} />{error}</div>}

        <div className="content-grid">
          <section className="panel create-panel">
            <div className="panel-heading">
              <div><span className="section-kicker">NEW TASK</span><h2>Configure a test run</h2></div>
              <div className="heading-icon"><Plus size={19} /></div>
            </div>
            <form onSubmit={createJob} className="task-form">
              <label className="field full">
                <span>Authorized media URL</span>
                <input
                  value={form.mediaUrl}
                  onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                  placeholder="https://media.yourdomain.com/demo.mp4"
                  type="url"
                  required
                />
                <small>Direct MP4/WebM URL. The server must allowlist its hostname.</small>
              </label>

              <div className="field-grid">
                <label className="field">
                  <span>Target QA sessions</span>
                  <input type="number" min="1" max="100000" value={form.targetSessions}
                    onChange={(e) => setForm({ ...form, targetSessions: Number(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Parallel windows</span>
                  <select value={form.concurrency} onChange={(e) => setForm({ ...form, concurrency: Number(e.target.value) })}>
                    {[1, 2, 4, 6, 8, 10, 12].map((n) => <option value={n} key={n}>{n} sessions</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Playback / reload interval</span>
                  <input type="number" min="0.1" max="60" step="0.1" value={form.sessionMinutes}
                    onChange={(e) => setForm({ ...form, sessionMinutes: Number(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Break after active time</span>
                  <input type="number" min="0.1" max="240" step="0.1" value={form.breakAfterMinutes}
                    onChange={(e) => setForm({ ...form, breakAfterMinutes: Number(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Break duration</span>
                  <input type="number" min="0" max="240" step="0.1" value={form.breakMinutes}
                    onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })} />
                </label>
              </div>

              <div className="form-foot">
                <span><ShieldCheck size={15} /> Max 12 concurrent isolated test sessions</span>
                <button className="primary-btn" disabled={loading || !apiOnline}>
                  {loading ? <LoaderCircle className="spin" size={17} /> : <Play size={16} />}
                  {loading ? "Creating task..." : "Start QA task"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel access-panel">
            <div className="panel-heading">
              <div><span className="section-kicker">CONNECTION</span><h2>API access</h2></div>
              <div className="heading-icon"><KeyRound size={18} /></div>
            </div>
            <label className="field">
              <span>Bearer token</span>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter API_AUTH_TOKEN" autoComplete="off" />
              <small>Stored only in this browser tab's session storage.</small>
            </label>
            <div className="connection-row"><Wifi size={16} /><span>API endpoint</span><code>{API_URL}</code></div>
            <div className="connection-row"><ShieldCheck size={16} /><span>Network policy</span><strong>HTTPS + host allowlist</strong></div>
            <button className="secondary-btn" onClick={() => void refresh()}><RefreshCw size={15} /> Test connection</button>
          </section>
        </div>

        <section className="panel progress-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">LIVE MONITOR</span><h2>Task progress</h2></div>
            {selectedJob && <span className={"status-pill " + selectedJob.status}>{statusLabel(selectedJob.status)}</span>}
          </div>

          {selectedJob ? (
            <>
              <div className="progress-summary">
                <div><span className="metric-label">Completed sessions</span><strong className="big-number">{selectedJob.completedSessions.toLocaleString()}<small> / {selectedJob.targetSessions.toLocaleString()}</small></strong></div>
                <div><span className="metric-label">Progress</span><strong className="big-number">{progress}%</strong></div>
                <div><span className="metric-label">Failed tests</span><strong className="big-number">{selectedJob.failedSessions.toLocaleString()}</strong></div>
                <div><span className="metric-label">Active windows</span><strong className="big-number">{selectedJob.activeSessions} <small>/ {selectedJob.concurrency}</small></strong></div>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: progress + "%" }} /></div>
              <div className="progress-bottom">
                <span>{selectedJob.workerRegion === "pending" ? "Waiting for worker" : "Worker region: " + selectedJob.workerRegion}</span>
                <div className="controls">
                  {canPause && <button className="secondary-btn small" onClick={() => void controlJob("pause")} disabled={!!busyAction}><Pause size={14} /> Pause</button>}
                  {canResume && <button className="secondary-btn small" onClick={() => void controlJob("resume")} disabled={!!busyAction}><Play size={14} /> Resume</button>}
                  {canStop && <button className="danger-btn small" onClick={() => void controlJob("stop")} disabled={!!busyAction}><Square size={13} /> Stop</button>}
                </div>
              </div>
              {selectedJob.status === "on_break" && selectedJob.breakUntil && <div className="break-info"><Clock3 size={15} /> Worker break until {new Date(selectedJob.breakUntil).toLocaleTimeString()}</div>}
              {selectedJob.lastError && <div className="inline-error"><AlertCircle size={15} />{selectedJob.lastError}</div>}
              <div className="session-grid">
                {Array.from({ length: selectedJob.concurrency }, (_, i) => {
                  const active = i < selectedJob.activeSessions;
                  return <div className={"session-card " + (active ? "session-active" : "")} key={i}>
                    <div className="session-top"><span>QA SESSION {String(i + 1).padStart(2, "0")}</span>{selectedJob.status === "paused" ? <Pause size={14} /> : active ? <LoaderCircle className="spin" size={15} /> : <span className="session-idle-dot" />}</div>
                    <strong>{selectedJob.status === "paused" ? "Paused" : active ? "Testing playback" : "Standby"}</strong>
                    <small>{selectedJob.workerRegion || "Region pending"}</small>
                  </div>;
                })}
              </div>
              <p className="disclaimer-line">These are isolated automated test browsers. They are not simulated people or independent residential users.</p>
            </>
          ) : (
            <div className="empty-state"><Activity size={28} /><strong>No QA task selected</strong><span>Create a task to see live playback progress here.</span></div>
          )}
        </section>


        {selectedJob && (
          <section className="panel preview-panel">
            <div className="panel-heading">
              <div><span className="section-kicker">LOCAL MULTI-VIEW</span><h2>12-window playback preview</h2></div>
              <div className="preview-actions">
                {previewGridOpen && <>
                  <button className="secondary-btn small" onClick={pauseAllPreviews}><Pause size={13} /> Pause all</button>
                  <button className="primary-btn small" onClick={playAllPreviews}><Play size={13} /> Play all</button>
                </>}
                <button className="secondary-btn small" onClick={togglePreviewGrid}>
                  {previewGridOpen ? "Close preview" : "Open 12 windows"}
                </button>
              </div>
            </div>
            <p className="preview-caption">Visual browser preview of the allowlisted media file. These local player panes are for checking layout and playback; they are not counted as background QA sessions.</p>
            {previewGridOpen && (
              <div className="video-preview-grid">
                {Array.from({ length: 12 }, (_, index) => (
                  <div className="video-preview-tile" key={index}>
                    <div className="video-preview-label"><span>PLAYER {String(index + 1).padStart(2, "0")}</span><span>LOCAL PREVIEW</span></div>
                    <video
                      ref={(node) => { previewPlayers.current[index] = node; }}
                      src={selectedJob.mediaUrl}
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      onError={(event) => {
                        const video = event.currentTarget;
                        video.title = "This browser could not play the selected media format.";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {previewMessage && <p className="preview-message">{previewMessage}</p>}
          </section>
        )}

        <section className="panel history-panel">
          <div className="panel-heading"><div><span className="section-kicker">PERSISTENT QUEUE</span><h2>Recent tasks</h2></div><button className="icon-btn" onClick={() => void refresh()} aria-label="Refresh tasks"><RefreshCw size={16} /></button></div>
          {jobs.length === 0 ? <div className="history-empty">No tasks yet. Your created jobs will remain available here after you close the dashboard.</div> : (
            <div className="job-list">
              {jobs.map((job) => (
                <button className={"job-row " + (job._id === selectedJob?._id ? "selected" : "")} key={job._id} onClick={() => setSelectedId(job._id)}>
                  <div className="job-symbol"><Video size={17} /></div>
                  <div className="job-detail"><strong>{new URL(job.mediaUrl).hostname}</strong><span>{job.completedSessions.toLocaleString()} / {job.targetSessions.toLocaleString()} QA sessions · {new Date(job.createdAt).toLocaleString()}</span></div>
                  <span className={"status-pill " + job.status}>{statusLabel(job.status)}</span>
                  {job.status === "completed" ? <CheckCircle2 className="row-status good" size={17} /> : job.status === "failed" ? <XCircle className="row-status bad" size={17} /> : <Clock3 className="row-status" size={17} />}
                </button>
              ))}
            </div>
          )}
        </section>

        <footer className="page-footer">MultiView Media QA Lab <span>·</span> Persistent background testing <span>·</span> Authorized media only</footer>
      </section>
    </main>
  );
}

export default App;
