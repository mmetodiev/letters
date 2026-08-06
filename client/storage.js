export const STORAGE_KEY = "moral-letters-user";
export const MERGE_KEY_PREFIX = "moral-letters-merged:";

export const NOTE_APPEND_SEP = "\n\n---\n(From this device)\n---\n\n";

export function normalizePath(path) {
  if (!path) return "/";
  let p = path.split("?")[0].split("#")[0];
  if (!p.endsWith("/")) {
    if (p.endsWith("/index.html")) {
      p = p.slice(0, -"index.html".length);
    } else if (p.endsWith(".html")) {
      p = p.replace(/\.html$/, "/");
    } else {
      p = p + "/";
    }
  }
  return p;
}

export function emptyData() {
  return { bookmarks: {}, notes: {} };
}

/**
 * bookmarks: Record<path, savedAtMs> — presence means Saved.
 * Legacy array form is migrated; notes-only paths are promoted into Saved.
 */
export function normalizeData(raw) {
  if (!raw || typeof raw !== "object") return emptyData();

  const notesIn =
    raw.notes && typeof raw.notes === "object" && !Array.isArray(raw.notes)
      ? raw.notes
      : {};
  const notes = {};
  for (const [key, value] of Object.entries(notesIn)) {
    if (typeof value === "string" && value.trim()) {
      notes[normalizePath(key)] = value;
    }
  }

  /** @type {Record<string, number>} */
  const bookmarks = {};
  if (Array.isArray(raw.bookmarks)) {
    const base = Date.now();
    raw.bookmarks.forEach((path, i) => {
      bookmarks[normalizePath(path)] = base - i;
    });
  } else if (raw.bookmarks && typeof raw.bookmarks === "object") {
    for (const [key, value] of Object.entries(raw.bookmarks)) {
      const path = normalizePath(key);
      bookmarks[path] = typeof value === "number" && Number.isFinite(value) ? value : 0;
    }
  }

  for (const path of Object.keys(notes)) {
    if (bookmarks[path] == null) bookmarks[path] = 0;
  }

  return { bookmarks, notes };
}

export function savedPathsNewestFirst(data) {
  return Object.entries(data.bookmarks || {})
    .sort((a, b) => b[1] - a[1])
    .map(([path]) => path);
}

export function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return normalizeData(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
}

export function mergeFlagKey(userId) {
  return MERGE_KEY_PREFIX + userId;
}

export function hasMerged(userId) {
  try {
    return localStorage.getItem(mergeFlagKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function setMerged(userId) {
  try {
    localStorage.setItem(mergeFlagKey(userId), "1");
  } catch {
    /* ignore */
  }
}

export function mergeBookmarks(localMap, cloudMap) {
  const keys = new Set([
    ...Object.keys(localMap || {}),
    ...Object.keys(cloudMap || {}),
  ]);
  const out = {};
  for (const key of keys) {
    const local = localMap?.[key];
    const cloud = cloudMap?.[key];
    if (local == null) out[key] = cloud;
    else if (cloud == null) out[key] = local;
    else out[key] = Math.max(local, cloud);
  }
  return out;
}

export function mergeNotes(localNotes, cloudNotes) {
  const keys = new Set([
    ...Object.keys(localNotes || {}),
    ...Object.keys(cloudNotes || {}),
  ]);
  const out = {};
  for (const key of keys) {
    const local = (localNotes && localNotes[key]) || "";
    const cloud = (cloudNotes && cloudNotes[key]) || "";
    const lt = local.trim();
    const ct = cloud.trim();
    if (!lt && !ct) continue;
    if (!lt) out[key] = cloud;
    else if (!ct) out[key] = local;
    else if (lt === ct) out[key] = cloud;
    else out[key] = cloud + NOTE_APPEND_SEP + local;
  }
  return out;
}

export function mergeUserData(local, cloud) {
  return normalizeData({
    bookmarks: mergeBookmarks(local.bookmarks, cloud.bookmarks),
    notes: mergeNotes(local.notes, cloud.notes),
  });
}

export function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
