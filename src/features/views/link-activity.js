const KEY = "multi-view.link-activity.v1";
const empty = () => ({panelActions:0,tabActions:0});
function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
export function readLinkActivity(storage) {
  try {
    const s=storage ?? globalThis.localStorage;
    const data=JSON.parse(s.getItem(KEY) || "{}");
    return {panelActions:count(data?.panelActions),tabActions:count(data?.tabActions)};
  } catch { return empty(); }
}
export function recordLinkAction(kind, storage) {
  if (kind !== "panel" && kind !== "tab") return false;
  try {
    const s=storage ?? globalThis.localStorage;
    const current=readLinkActivity(s);
    const field=kind === "panel" ? "panelActions" : "tabActions";
    current[field]=Math.min(Number.MAX_SAFE_INTEGER,current[field]+1);
    s.setItem(KEY,JSON.stringify(current));
    return true;
  } catch { return false; }
}
export function clearLinkActivity(storage) {
  try { (storage ?? globalThis.localStorage).removeItem(KEY); return true; }
  catch { return false; }
}
