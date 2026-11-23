export function normalizeUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) throw new Error("Enter a website address first.");
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) ? value : `https://${value}`;
  let parsed;
  try { parsed = new URL(candidate); } catch { throw new Error("That doesn't look like a valid website address."); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP and HTTPS website addresses are supported.");
  return parsed.href;
}
export function getDomain(value) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return "New website"; }
}
export function getFaviconUrl(value) {
  try { return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(new URL(value).origin)}&sz=64`; }
  catch { return ""; }
}