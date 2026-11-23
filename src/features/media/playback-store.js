const DATABASE_NAME = "multiview-media";
const STORE_NAME = "playback-progress";
const FALLBACK_KEY = "multiview.playback-progress.v1";
let databasePromise;

function openDatabase() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise(resolve => {
    try {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "url" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return databasePromise;
}

function readFallback() {
  try { return JSON.parse(localStorage.getItem(FALLBACK_KEY) || "{}"); }
  catch { return {}; }
}

function writeFallback(url, seconds) {
  try {
    const progress = readFallback();
    progress[url] = seconds;
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(progress));
  } catch {
    // Browser storage may be disabled or full; playback should still work.
  }
}

export async function savePlaybackPosition(url, seconds) {
  if (!url || !Number.isFinite(seconds) || seconds < 0) return;
  const position = Math.floor(seconds);
  const database = await openDatabase();
  if (!database) {
    writeFallback(url, position);
    return;
  }

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        url,
        position,
        updatedAt: Date.now()
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch {
    writeFallback(url, position);
  }
}

export async function loadPlaybackPosition(url) {
  if (!url) return 0;
  const database = await openDatabase();
  if (!database) {
    const position = Number(readFallback()[url]);
    return Number.isFinite(position) && position > 0 ? position : 0;
  }

  try {
    return await new Promise(resolve => {
      const request = database.transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME).get(url);
      request.onsuccess = () => resolve(Number(request.result?.position) || 0);
      request.onerror = () => resolve(Number(readFallback()[url]) || 0);
    });
  } catch {
    return Number(readFallback()[url]) || 0;
  }
}

export async function clearPlaybackPosition(url) {
  if (!url) return;
  const database = await openDatabase();
  if (database) {
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(url);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      // Also clear the fallback store below.
    }
  }
  try {
    const progress = readFallback();
    delete progress[url];
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(progress));
  } catch {
    // Ignore unavailable fallback storage.
  }
}
