# MultiView

A modular, installable multi-website workspace inspired by split-screen browser apps.

## What is included

- Up to 20 URL panels in one workspace, with a custom panel-count selector from 1 to 20.
- Paste one URL to load that same website in every visible panel.
- Convert YouTube watch, Shorts, live and playlist links into embedded players.
- Play direct MP4, WebM, Ogg and other browser-supported video URLs with native controls.
- Embed supported Vimeo and Dailymotion video links.
- Optional automatic video playback, muted by default to meet browser autoplay policies.
- Save direct-video playback positions in a local IndexedDB database and resume when you return.
- Picture-in-Picture for browser-supported direct videos, plus a shortcut to open configured video links in separate tabs.
- Responsive grid layouts that adapt to the selected panel count.
- Independent address bars, reload buttons, focus mode and open-in-new-tab actions.
- Open every configured website in its own browser tab, then close the MultiView dashboard while those tabs stay open.
- Paste multiple URLs at once (one per line) to populate different panels.
- Multiple named workspaces, automatically saved in local browser storage.
- Duplicate or delete workspaces without losing the original.
- Save favourite websites to a quick-access shelf and launch them into the next available panel.
- Drag panels to reorder their position.
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
    bookmarks/
      bookmark-manager.js       Saved website operations
    views/
      view-card.js               A single website panel
      view-manager.js            URL and layout operations
    workspaces/
      workspace-model.js         Workspace and panel data model
  styles/
    tokens.css                   Theme tokens
    base.css                     Global styles and reset
    app.css                      Responsive application styles
    layouts.css                  Responsive panel grid presets
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

YouTube watch, Shorts, live and playlist URLs are converted to YouTube embed-player URLs; Vimeo and Dailymotion video links are also converted to their player URLs. Direct MP4, WebM and Ogg video files use the browser video player. The video owner or provider can still disable embedding, restrict a video by region or age, require authentication, or reject playback. Autoplay starts muted where the player and browser permit it; unmute manually for sound. HLS (.m3u8) playback depends on the browser, and some formats may not be supported on every device. Direct video progress is saved locally in IndexedDB (with a local-storage fallback); embedded YouTube, Vimeo and Dailymotion progress is controlled by their own players.

Third-party cookie rules and website login policies can also differ inside embedded pages. This first version does not provide separate browser profiles or isolated cookie jars.

Installing the PWA gives the app its own launch icon and preserves workspace configuration on that browser/device. You can use **Open all in tabs** and then close the MultiView dashboard; the websites remain in their own ordinary browser tabs while the browser keeps those tabs open. Use **Keep videos playing in tabs** to open configured video links in separate tabs first; then you can close the MultiView dashboard tab while those video tabs stay open. Use the Picture-in-Picture button for supported direct video files. If pop-ups are blocked, allow them for the MultiView site. Closing a video tab or the browser ends that page session, and browsers may suspend inactive tabs to save resources. A database can save settings and playback positions, but it cannot keep a video running after its browser tab or browser has been closed.

MultiView is intentionally a website-only product. A website/PWA cannot keep arbitrary remote pages, videos or iframe JavaScript running after every page and browser window has been closed. A service worker is event-driven and may be stopped by the browser when idle. Auto-refresh inside the MultiView dashboard runs only while the dashboard is open and visible. Use **Open all in tabs** to leave the websites running in ordinary browser tabs after closing the dashboard; the browser remains responsible for how long those tabs stay active.

## Privacy

Workspace names, layout choices, autoplay settings and entered URLs are stored in localStorage on the current browser. Direct-video resume positions are stored in a local IndexedDB database on that browser. The app does not send this configuration or playback history to a MultiView server. Opening a URL still makes a normal connection to that website. The favicon helper requests a site's icon from Google's favicon endpoint.

## Deploy

This is a static Vite project. Import the repository into Vercel or another static host and use:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

No server-side environment variables are required.
