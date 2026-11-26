# MultiView

A modular, installable multi-website workspace inspired by split-screen browser apps.

## What is included

- Up to 20 URL panels in one workspace, with a custom panel-count selector from 1 to 20.
- Paste one URL to load that same website in every visible panel.
- Convert YouTube watch, Shorts, live and playlist links into embedded players.
- Play direct MP4, WebM, Ogg and other browser-supported video URLs with native controls.
- Embed supported Vimeo and Dailymotion video links.
- Optional muted automatic video playback, disabled by default.
- Save direct-video playback positions in a local IndexedDB database and resume when you return.
- Picture-in-Picture for browser-supported direct videos, plus a shortcut to open configured video links in separate tabs.
- Responsive grid layouts that adapt to the selected panel count.
- Lazy-load off-screen website and video panels as you scroll toward them, with a 360px prefetch margin.
- Reuse panel elements during workspace updates, and unload hidden/removed panels when the layout shrinks.
- Clear all windows in one action, freeing their embedded pages and resetting to one blank panel.
- Independent address bars, reload buttons, focus mode and open-in-new-tab actions.
- Open every configured website in its own browser tab, then close the MultiView dashboard while those tabs stay open.
- Paste multiple URLs at once (one per line) to populate different panels.
- Multiple named workspaces, automatically saved in local browser storage.
- Duplicate or delete workspaces without losing the original.
- Save favourite websites to a quick-access shelf and launch them into the next available panel.
- Drag panels to reorder their position.
- Per-workspace auto-refresh for loaded web pages only (15 seconds, 30 seconds, 1 minute or 5 minutes).
- Per-panel free country proxy launch: opens the selected provider's proxy page in a separate browser tab and copies that panel's URL for pasting into the proxy.
- Background resilience: saves workspace state on page hide/freeze and runs one catch-up refresh when Chrome makes the page visible again.
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

The optional free country-proxy launcher is an external handoff, not per-panel VPN routing inside the embedded MultiView iframes. It currently opens Shifter's free web-proxy page in a separate tab and copies the selected panel URL for manual pasting. The provider chooses an exit IP in the selected country, but separate tabs are not guaranteed to receive unique IP addresses or distinct cities. Its free proxy is designed for lightweight browsing; video streaming and personal-account logins may fail or be unsuitable. The MultiView auto-close timer attempts to close the launched tab after the selected duration, but Android may throttle the dashboard while it is in the background, so the timer can be delayed. Do not rely on it as a hard security timeout.

Background resilience does not keep embedded websites executing while Chrome is in the background. Chrome and Android can freeze or discard hidden pages; MultiView saves its own workspace state and checks for one overdue auto-refresh when the page becomes visible again. On a Samsung Galaxy, adding Chrome to Settings > Battery > Background usage limits > Never sleeping apps may reduce Samsung's app sleep, but it cannot disable Chrome's own background-tab lifecycle controls or guarantee continuous playback.

YouTube watch, Shorts, live and playlist URLs are converted to YouTube embed-player URLs; Vimeo and Dailymotion video links are also converted to their player URLs. Direct MP4, WebM and Ogg video files use the browser video player. The video owner or provider can still disable embedding, restrict a video by region or age, require authentication, or reject playback. Autoplay starts muted where the player and browser permit it; unmute manually for sound. HLS (.m3u8) playback depends on the browser, and some formats may not be supported on every device. Direct video progress is saved locally in IndexedDB (with a local-storage fallback); embedded YouTube, Vimeo and Dailymotion progress is controlled by their own players.

Third-party cookie rules and website login policies can also differ inside embedded pages. This first version does not provide separate browser profiles or isolated cookie jars.

Installing the PWA gives the app its own launch icon and preserves workspace configuration on that browser/device. You can use **Open all in tabs** and then close the MultiView dashboard; the websites remain in their own ordinary browser tabs while the browser keeps those tabs open. Use **Open video links** to open unique configured video links for manual playback; those tabs can remain open after closing the dashboard. Use the Picture-in-Picture button for supported direct video files. If pop-ups are blocked, allow them for the MultiView site. Closing a video tab or the browser ends that page session, and browsers may suspend inactive tabs to save resources. A database can save settings and playback positions, but it cannot keep a video running after its browser tab or browser has been closed. The same applies to website rendering: GitHub or a remote database can store URLs/configuration, but it cannot render third-party pages on behalf of the phone. This app reduces startup work by leaving off-screen panels unloaded until they are close to the viewport; any panel that is actually opened still runs on the device.

MultiView is intentionally a website-only product. A website/PWA cannot keep arbitrary remote pages, videos or iframe JavaScript running after every page and browser window has been closed. A service worker is event-driven and may be stopped by the browser when idle. Auto-refresh inside the MultiView dashboard runs only while the dashboard is open and visible. Use **Open all in tabs** to leave the websites running in ordinary browser tabs after closing the dashboard; the browser remains responsible for how long those tabs stay active.

## Playback verification and network status

Direct video panels report local playback state using native media events (loading, paused, buffering, playing, ended and errors). These states describe the local player only. Embedded third-party players are labeled as requested rather than confirmed because an iframe load is not proof of playback or a counted view. For YouTube channel metrics, use the dashboard link to YouTube Studio or the official authorized analytics API; MultiView does not create or validate external platform views.

The external proxy panel reports a requested country and tracks the tab, not a verified tunnel. It cannot establish a device VPN or route individual iframes. Use a trusted OS-level VPN for ordinary privacy needs and independently verify connectivity with that VPN client. Do not use proxies or repeated playback to manufacture engagement.

## Privacy

Workspace names, layout choices, autoplay settings and entered URLs are stored in localStorage on the current browser. Direct-video resume positions are stored in a local IndexedDB database on that browser. The app does not send this configuration or playback history to a MultiView server. Opening a URL still makes a normal connection to that website. The favicon helper requests a site's icon from Google's favicon endpoint.

## Deploy

This is a static Vite project. Import the repository into Vercel or another static host and use:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

No server-side environment variables are required.

## Release verification checklist

- Run `npm test` and `npm run build` with Node 22.
- Import a backup containing invalid URLs, credential-bearing URLs and duplicate IDs; invalid panels should be blank and IDs unique.
- Confirm a direct video reports loading, playing, paused, buffering or errors as appropriate; a provider iframe must not claim a counted view.
- Confirm automatic refresh never reloads a video player, and the video-tab action opens links for manual playback.
- Confirm an offline asset failure does not return HTML, and unrelated service-worker caches survive activation.
- Check actual browser playback on desktop and Android. For channel metrics, sign into YouTube Studio; a local playback state is not an external view count.
- External proxy handoff is unverified, not a VPN tunnel. Device VPN connectivity is managed outside this application.

## Local link activity

The dashboard records manual panel navigation/configuration actions and requests to open external tabs. Each user action counts once, including bulk operations, regardless of the number of panels or tabs. No URLs, browsing history, IP addresses or third-party analytics are stored by this counter. Reset removes the local counts. Automatic refresh, startup restoration, and proxy launches do not increment these counts. Browser restrictions and third-party iframe isolation mean these counts do not establish a successful page load or a destination website’s analytics event. For websites you own, verify real visits with your own server logs or first-party analytics.

### Reliability and privacy hardening

Imported backups are limited to 2 MB. Import creates independent workspace and panel IDs, deduplicates saved bookmarks, and keeps existing workspaces. Bulk input expects one URL per line (commas inside URLs are preserved). Ordinary workspace edits do not restart a paused direct video, and unchanged refresh preferences retain their scheduled deadline. Production assets use content-hashed names and the service worker pre-caches the app entry assets. Offline operation applies to the workspace shell, not external websites.
