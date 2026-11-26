export function normalizeUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) throw new Error("Enter a website address first.");
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) ? value : "https://" + value;
  let parsed;
  try { parsed = new URL(candidate); } catch { throw new Error("That doesn't look like a valid website address."); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP and HTTPS website addresses are supported.");
  if (parsed.username || parsed.password) throw new Error("Addresses containing credentials are not supported.");
  return parsed.href;
}

function youtubeDescriptor(url, autoPlay) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const youtubeHosts = new Set(["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"]);
  let videoId = "";
  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (youtubeHosts.has(host)) {
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
    else if (["embed", "shorts", "live", "v"].includes(segments[0])) videoId = segments[1] || "";
    if (!videoId && segments[0] === "playlist" && url.searchParams.get("list")) {
      const playlist = new URL("https://www.youtube-nocookie.com/embed/videoseries");
      playlist.searchParams.set("list", url.searchParams.get("list"));
      if (autoPlay) { playlist.searchParams.set("autoplay", "1"); playlist.searchParams.set("mute", "1"); }
      return { type: "youtube-playlist", src: playlist.href };
    }
  } else {
    return null;
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  const embed = new URL("https://www.youtube-nocookie.com/embed/" + videoId);
  embed.searchParams.set("playsinline", "1");
  embed.searchParams.set("rel", "0");
  if (autoPlay) { embed.searchParams.set("autoplay", "1"); embed.searchParams.set("mute", "1"); }
  const start = url.searchParams.get("start") || url.searchParams.get("t");
  if (start) {
    const seconds = parseVideoTime(start);
    if (seconds > 0) embed.searchParams.set("start", String(seconds));
  }
  const playlist = url.searchParams.get("list");
  if (playlist) embed.searchParams.set("list", playlist);
  const index = url.searchParams.get("index");
  if (index) embed.searchParams.set("index", index);
  return { type: "youtube", src: embed.href };
}

function parseVideoTime(value) {
  if (/^\d+$/.test(String(value))) return Number(value);
  const match = String(value).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function vimeoDescriptor(url, autoPlay) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["vimeo.com", "player.vimeo.com"].includes(host)) return null;
  const match = url.pathname.match(/(?:video\/)?(\d{6,})/);
  if (!match) return null;
  const embed = new URL("https://player.vimeo.com/video/" + match[1]);
  const hash = url.searchParams.get("h");
  if (hash) embed.searchParams.set("h", hash);
  if (autoPlay) { embed.searchParams.set("autoplay", "1"); embed.searchParams.set("muted", "1"); }
  return { type: "vimeo", src: embed.href };
}

function dailymotionDescriptor(url, autoPlay) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["dailymotion.com", "dai.ly"].includes(host)) return null;
  const match = host === "dai.ly"
    ? url.pathname.match(/^\/([A-Za-z0-9]+)/)
    : url.pathname.match(/^\/video\/([A-Za-z0-9]+)/);
  if (!match) return null;
  const embed = new URL("https://www.dailymotion.com/embed/video/" + match[1]);
  if (autoPlay) { embed.searchParams.set("autoplay", "1"); embed.searchParams.set("mute", "1"); }
  return { type: "dailymotion", src: embed.href };
}

const DIRECT_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "ogg", "m4v", "mov", "m3u8"]);

export function getMediaDescriptor(value, { autoPlay = false } = {}) {
  try {
    const url = new URL(value);
    const hosted = youtubeDescriptor(url, autoPlay) || vimeoDescriptor(url, autoPlay) || dailymotionDescriptor(url, autoPlay);
    if (hosted) return hosted;
    const extension = url.pathname.split(".").pop()?.toLowerCase();
    if (DIRECT_VIDEO_EXTENSIONS.has(extension)) return { type: "video", src: url.href };
    return { type: "website", src: url.href };
  } catch {
    return { type: "website", src: value };
  }
}

export function getDomain(value) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return "New website"; }
}
export function getFaviconUrl(value) {
  try { return "https://www.google.com/s2/favicons?domain_url=" + encodeURIComponent(new URL(value).origin) + "&sz=64"; }
  catch { return ""; }
}
