# MultiView

A modular, installable multi-website workspace inspired by split-screen browser apps.

## What is included

- Up to 8 URL panels in one workspace.
- Layout presets: 1, 2, 3, 4, 6 and 8 panels.
- Independent address bars, reload buttons, focus mode and open-in-new-tab actions.
- Paste multiple URLs at once (one per line).
- Multiple named workspaces, automatically saved in local browser storage.
- Per-workspace auto-refresh (15 seconds, 30 seconds, 1 minute or 5 minutes).
- JSON workspace backup and restore.
- Installable PWA shell with a basic offline app-shell cache.
- No backend, account system, database or paid API required for this first version.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Create a production build with:

```bash
npm run build
npm run preview
```

Run the built-in URL validation tests with `npm test`.

## Project structure

```
src/
  app.js                         App composition and UI event wiring
  main.js                        Browser entry point and PWA registration
  core/
    dom.js                       Small DOM and icon helpers
    ids.js                       Unique identifier helper
    storage.js                   Versioned local workspace persistence
    url.js                       URL validation and domain helpers
  features/
    import-export/backup.js      Workspace backup and restore
    refresh/refresh-controller.js Auto-refresh lifecycle
    views/
      view-card.js               A single website panel
      view-manager.js            URL and layout operations
    workspaces/
      workspace-model.js         Workspace and panel data model
  styles/
    tokens.css                   Theme tokens
    base.css                     Global styles and reset
    app.css                      Responsive application styles
  ui/
    toast.js                     Small feedback notifications
public/
  icons/icon.svg
  manifest.webmanifest
  sw.js
```

Each feature is intentionally isolated so bookmarks, per-panel settings, history, sync or a backend can be added without rewriting the whole app.

## Important browser limitations

MultiView uses normal browser iframes, not a native browser engine. A website can block iframe embedding using its `X-Frame-Options` or Content Security Policy `frame-ancestors` response header. Those sites cannot be forced to render by this frontend; use **Open in a new tab** for them.

Third-party cookie rules and website login policies can also differ inside embedded pages. This first version does not provide separate browser profiles or isolated cookie jars.

Installing the PWA gives the app its own launch icon and preserves workspace configuration on that browser/device. The service worker caches the app shell; it does not keep remote website pages, videos, timers or iframe JavaScript running after the app is closed. Auto-refresh runs only while MultiView is open and visible.

## Privacy

Workspace names, layout choices, refresh settings and entered URLs are stored in localStorage on the current browser. The app does not send this configuration to a MultiView server. Opening a URL still makes a normal connection to that website. The favicon helper requests a site's icon from Google's favicon endpoint.

## Deploy

This is a static Vite project. Import the repository into Vercel or another static host and use:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

No server-side environment variables are required.
