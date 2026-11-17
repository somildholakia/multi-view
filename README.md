# MultiView — Persistent Media QA Lab

MultiView is a final-year-project-ready platform for running repeatable, multi-session playback tests against media hosted on domains you own or are explicitly authorized to test.

It recreates the useful productivity ideas of a multi-view browser—parallel sessions, automatic reload cycles, timers and progress tracking—while adding a persistent job queue, isolated browser contexts, a durable job history and a separate worker process.

> **Important scope:** this project is for authorized QA and load testing of your own media delivery infrastructure. It does not generate YouTube views, watch time, likes or other platform engagement. YouTube URLs are deliberately rejected. Sessions are synthetic test clients and must never be presented as real people or organic audience traffic.

## What is implemented

- Up to 12 isolated Playwright browser sessions per worker batch.
- A target measured as **completed QA playback sessions**, not public platform views.
- Persistent jobs stored in MongoDB and dispatched through Redis/BullMQ.
- A separate worker process, so a job keeps running after the dashboard tab is closed.
- Configurable playback/reload interval, active-time break threshold and break duration.
- Pause, resume and stop controls.
- Live progress polling and a session dashboard.
- HTTPS-only media links restricted to exact allowlisted hosts.
- Explicit blocking of YouTube and Google video delivery hosts.
- API bearer-token protection, request validation, rate limits and security headers.
- Isolated browser contexts with no shared cookies or local storage.
- A worker-region label sourced from the worker deployment environment; it is never randomized or fabricated.

## Architecture

\`\`\`text
React dashboard (Vite)
        |
        | HTTPS + Bearer token
        v
Express API ---- MongoDB (durable jobs/history)
        |
        v
Redis / BullMQ
        |
        v
Playwright worker ---- Authorized HTTPS media host
        |
        v
12 isolated browser contexts (maximum)
\`\`\`

The worker region label represents the real infrastructure region where that worker is deployed. For multi-region QA, deploy separately managed workers in cloud regions you control, use a shared Redis/MongoDB deployment with appropriate network security, and allowlist the test origin. Do not use residential proxy pools or disguise the source of test traffic.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker with Docker Compose
- A direct MP4/WebM media URL hosted on a domain you control
- Permission to run automated playback tests against that media host

## Local setup

1. Install dependencies:

   \`\`\`bash
   pnpm install
   \`\`\`

2. Start MongoDB and Redis:

   \`\`\`bash
   docker compose up -d
   \`\`\`

3. Create environment configuration:

   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Set \`ALLOWED_MEDIA_HOSTS\` to the exact host serving your test media. For example:

   \`\`\`env
   ALLOWED_MEDIA_HOSTS=media.yourdomain.com
   API_AUTH_TOKEN=use-a-long-random-secret
   \`\`\`

5. Install the Playwright browser:

   \`\`\`bash
   pnpm --filter @multiview/worker install:browsers
   \`\`\`

6. Start the API, worker and dashboard:

   \`\`\`bash
   pnpm dev
   \`\`\`

7. Open the Vite URL shown in the terminal, usually \`http://localhost:5173\`. Enter the same API token configured in \`.env\`.

## Create a QA task

Paste a direct media-file URL hosted on an allowlisted domain. Configure:

- **Target sessions:** the number of successful playback test cycles to complete.
- **Parallel sessions:** 1–12 isolated browser contexts.
- **Playback / reload interval:** how long each browser session is tested before it is closed and recreated.
- **Break after:** active test time before the worker pauses.
- **Break length:** how long the worker remains on break.

For example, a target of 120 with 12 parallel sessions means ten successful batches if every session succeeds. Failed sessions are reported separately and do not count toward the target.

A session only counts when the media starts and remains in a valid playback state for the configured test interval. These counters describe QA work performed by this application; they are not YouTube analytics or audience views.

## Deployment notes

Deploy the dashboard as a static Vite site, the API as a persistent Node service, and the worker as a separate persistent Node service. Both backend services need the same MongoDB and Redis connection settings. Configure the web origin, API token and allowed media hosts explicitly. Do not deploy the worker as a short-lived serverless function: it is a long-running queue consumer.

## Security checklist

- Keep \`API_AUTH_TOKEN\`, MongoDB credentials and Redis credentials server-side.
- Use TLS for public API, Redis and MongoDB connections.
- Set \`ALLOWED_MEDIA_HOSTS\` to exact owned hostnames only.
- Restrict inbound access to MongoDB and Redis.
- Run the worker with resource limits and a dedicated service account.
- Start with a small concurrency and increase only after observing the media origin.
- Do not point the load generator at third-party services without written authorization.

## Current limitations

- The first version accepts direct browser-playable MP4/WebM URLs. HLS/DASH manifests need a dedicated player adapter and should be added only for media infrastructure you control.
- A worker executes a job in batches of up to 12 contexts. Horizontal multi-region scheduling and a live agent registry are planned extensions, not claimed as implemented.
- This repository is an initial working foundation. Run the local setup and verify the media host before the college demonstration.
