import { isIP } from "node:net";

const blockedHosts = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "googlevideo.com"
];

function isSameHostOrSubdomain(host: string, allowedHost: string): boolean {
  return host === allowedHost || host.endsWith("." + allowedHost);
}

export function validateAuthorizedMediaUrl(raw: string): string {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid direct media URL.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (url.protocol !== "https:") {
    throw new Error("Media URLs must use HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Credentials must not be embedded in media URLs.");
  }
  if (isIP(hostname) !== 0 || hostname === "localhost" ||
      hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
      hostname.endsWith(".internal")) {
    throw new Error("Private, local and IP-literal media hosts are not supported.");
  }

  if (blockedHosts.some((host) => isSameHostOrSubdomain(hostname, host))) {
    throw new Error("YouTube URLs are not supported. Use a media file hosted on a domain you control.");
  }

  const allowedHosts = (process.env.ALLOWED_MEDIA_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);

  if (allowedHosts.length === 0) {
    throw new Error("No authorized media hosts are configured. Set ALLOWED_MEDIA_HOSTS first.");
  }

  if (!allowedHosts.includes(hostname)) {
    throw new Error("This exact host is not allowlisted. Add its hostname to ALLOWED_MEDIA_HOSTS.");
  }

  return url.toString();
}
