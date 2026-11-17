# MultiView — Persistent Media QA Lab

MultiView is a multi-session playback QA application for media hosted on domains you own or are explicitly authorized to test. It combines a React dashboard, authenticated API, durable MongoDB job records, Redis/BullMQ queue and a persistent Playwright browser worker.

> **Important scope:** this is a QA tool, not a viewer or engagement generator. It does not create YouTube views, watch time, likes or other platform engagement. YouTube and Google video delivery URLs are rejected. Automated sessions must not be represented as real people or organic audience traffic.

## Features

- 1–12 isolated Chromium playback sessions per worker batch.
- Targets measured as completed QA playback sessions.
- Persistent task queue and task history; closing the dashboard does not stop the worker.
- Playback/reload interval, active-time break threshold and break duration.
- Pause, resume and stop controls.
- Live task progress, failed test counts, worker label and session status.
- 12-pane local preview wall for visually inspecting a permitted media file.
- HTTPS-only URLs on explicitly allowlisted hostnames.
- DNS checks reject private, loopback, link-local and reserved destinations.
- Request validation, bearer-token authentication, rate limiting and security headers.

The preview wall is a browser-side visual tool; its players are not included in the background QA counters. The worker region is the actual configured worker location label, not a simulated location.

## Architecture

```text
React dashboard (Nginx static hosting)
          |
          | HTTP(S) + Bearer token
          v
       Express API ------ MongoDB
          |
          v
       Redis / BullMQ
          |
          v
   Persistent Playwright worker
          |
          v
   Up to 12 isolated browser contexts
          |
          v
   Allowlisted HTTPS media server
```

## Quick start — Docker (recommended)

Requirements: Docker Engine/Desktop with Compose v2.

1. Clone the repository and enter the folder:

   ```bash
   git clone https://github.com/somildholakia/multi-view.git
   cd multi-view
   ```

2. Create the environment file:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env`. Set a long random `API_AUTH_TOKEN` and the exact hostname(s) that serve your own test media:

   ```env
   API_AUTH_TOKEN=replace-with-a-long-random-secret
   ALLOWED_MEDIA_HOSTS=media.yourdomain.com,cdn.yourdomain.com
   ```

   Do not enter a URL or wildcard in `ALLOWED_MEDIA_HOSTS`; use hostnames only. Add each redirect/CDN hostname separately.

4. Build and start the full stack:

   ```bash
   docker compose up -d --build
   ```

5. Open **http://localhost:8080** and enter the same `API_AUTH_TOKEN` value from `.env`.

Useful operations:

```bash
docker compose ps
docker compose logs -f api worker
docker compose restart worker
docker compose down
```

Tasks and queue state persist in Docker volumes. `docker compose down -v` deletes the MongoDB and Redis volumes and therefore removes saved task history; do not use it unless you intend to reset the installation.

The Docker stack binds the UI, API, MongoDB and Redis ports to localhost by default. For a public deployment, put the UI and API behind HTTPS, set `WEB_ORIGIN_DOCKER` to the exact UI origin, set `VITE_API_URL` to the public API URL **at build time**, and expose only the services that must be public. Never expose MongoDB or Redis directly to the internet.

## Local development (without containerized app services)

Requirements: Node.js 22+, pnpm 10+, Docker Compose.

1. Install dependencies and create the env file:

   ```bash
   pnpm install
   cp .env.example .env
   ```

2. Start only the databases:

   ```bash
   docker compose up -d mongodb redis
   ```

3. Install the matching Playwright Chromium build:

   ```bash
   pnpm --filter @multiview/worker install:browsers
   ```

4. Start API, worker and Vite dashboard:

   ```bash
   pnpm dev
   ```

5. Open **http://localhost:5173** and enter the API token.

## Configure a QA task

Enter a direct MP4/WebM URL hosted on an allowlisted HTTPS hostname. Configure:

- **Target sessions:** number of successful test playback cycles.
- **Parallel windows:** 1–12 isolated browser contexts.
- **Playback/reload interval:** how long one test context plays before it is closed and recreated.
- **Break after:** active test time before the worker takes a break.
- **Break duration:** how long the worker waits before continuing.

A target of 120 with 12 parallel sessions completes in ten successful batches if every session passes. Failed sessions are reported separately and do not count toward the target. A session passes only when the media starts and its timeline advances through the configured test interval.

## Verification and scripts

```bash
pnpm test
pnpm typecheck
pnpm build
```

The CI workflow runs unit tests, typechecks and production builds. Tests include the media-host policy and public/private IP address checks.

## Security and operational notes

- Keep `API_AUTH_TOKEN`, database credentials and Redis credentials server-side.
- Use TLS for public UI/API traffic and private network connectivity for MongoDB/Redis.
- Keep MongoDB and Redis private; the default Compose bindings are loopback-only.
- Allowlist only exact hostnames you own or have written permission to test.
- The worker resolves hostnames and rejects private/local/reserved IP addresses.
- Set sensible concurrency limits and monitor the origin server before scaling.
- Do not send automated load to third-party services without written authorization.
- A persistent worker is required; a short-lived serverless function is not suitable for the queue consumer.

## Current limitations

- Direct browser-playable MP4/WebM sources are supported. HLS/DASH needs a dedicated player adapter.
- The preview wall is a local browser preview; it does not mirror the worker's headless Chromium windows.
- One worker handles one queue job at a time, with up to 12 playback contexts within that job. A multi-worker registry and horizontal region scheduler are future work.
- This repository has not been deployed to your cloud account. The Docker workflow is provided; production TLS, DNS, host allowlists and service credentials must be configured for your environment.
