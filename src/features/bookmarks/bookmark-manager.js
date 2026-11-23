import { createId } from "../../core/ids.js";
import { getDomain, normalizeUrl } from "../../core/url.js";

export function addBookmark(state, view, title) {
  if (!view?.url) throw new Error("Open a website in a panel before saving it.");
  const url = normalizeUrl(view.url);
  const existing = state.bookmarks.find(item => item.url === url);
  if (existing) return { bookmark: existing, created: false };

  const bookmark = {
    id: createId("bookmark"),
    title: String(title || getDomain(url)).trim().slice(0, 48) || getDomain(url),
    url,
    createdAt: new Date().toISOString()
  };
  state.bookmarks.unshift(bookmark);
  state.bookmarks = state.bookmarks.slice(0, 100);
  return { bookmark, created: true };
}

export function removeBookmark(state, bookmarkId) {
  const before = state.bookmarks.length;
  state.bookmarks = state.bookmarks.filter(item => item.id !== bookmarkId);
  return state.bookmarks.length !== before;
}
