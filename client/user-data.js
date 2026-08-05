import { db, hasInstant } from "./db.js";
import {
  debounce,
  emptyData,
  hasMerged,
  loadLocal,
  mergeUserData,
  normalizeData,
  normalizePath,
  saveLocal,
  setMerged,
} from "./storage.js";

/** @type {import("@instantdb/core").User | null} */
let authUser = null;
/** @type {{ bookmarks: string[], notes: Record<string, string> } | null} */
let remoteData = null;
let unsubQuery = null;
/** @type {Set<() => void>} */
const listeners = new Set();

export function getAuthUser() {
  return authUser;
}

export function getData() {
  if (authUser && remoteData) return remoteData;
  return loadLocal();
}

export function onDataChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

async function writeRemote(data) {
  if (!db || !authUser) return;
  const next = normalizeData(data);
  remoteData = next;
  saveLocal(next);
  await db.transact(
    db.tx.userData[authUser.id].update({
      bookmarks: next.bookmarks,
      notes: next.notes,
    })
  );
}

export async function persist(data) {
  const next = normalizeData(data);
  if (authUser && db) {
    await writeRemote(next);
  } else {
    saveLocal(next);
  }
  notify();
}

export function isBookmarked(data, path) {
  return data.bookmarks.includes(path);
}

export async function toggleBookmark(path) {
  const data = getData();
  const i = data.bookmarks.indexOf(path);
  if (i >= 0) data.bookmarks.splice(i, 1);
  else data.bookmarks.push(path);
  await persist(data);
  return isBookmarked(data, path);
}

export async function setNote(path, text) {
  const data = getData();
  if (!text || !text.trim()) delete data.notes[path];
  else data.notes[path] = text;
  await persist(data);
}

function parseRemoteRow(row) {
  if (!row) return emptyData();
  return normalizeData({
    bookmarks: row.bookmarks,
    notes: row.notes,
  });
}

async function ensureMerged(user, cloudRow) {
  const cloud = parseRemoteRow(cloudRow);
  if (hasMerged(user.id)) {
    remoteData = cloud;
    saveLocal(cloud);
    return;
  }
  const local = loadLocal();
  const merged = mergeUserData(local, cloud);
  remoteData = merged;
  saveLocal(merged);
  await db.transact(
    db.tx.userData[user.id].update({
      bookmarks: merged.bookmarks,
      notes: merged.notes,
    })
  );
  setMerged(user.id);
}

function stopQuery() {
  if (unsubQuery) {
    unsubQuery();
    unsubQuery = null;
  }
}

function startQuery(user) {
  stopQuery();
  if (!db) return;

  let first = true;
  unsubQuery = db.subscribeQuery(
    { userData: { $: { where: { id: user.id } } } },
    async (resp) => {
      if (resp.error) {
        console.error("Instant query error", resp.error);
        return;
      }
      const row = resp.data?.userData?.[0];
      if (first) {
        first = false;
        try {
          await ensureMerged(user, row);
        } catch (err) {
          console.error("Instant merge failed", err);
          remoteData = parseRemoteRow(row);
        }
        notify();
        return;
      }
      remoteData = parseRemoteRow(row);
      saveLocal(remoteData);
      notify();
    }
  );
}

export function initAuth() {
  if (!hasInstant() || !db) {
    authUser = null;
    remoteData = null;
    notify();
    return () => {};
  }

  return db.subscribeAuth((auth) => {
    authUser = auth.user || null;
    if (!authUser) {
      stopQuery();
      remoteData = null;
      notify();
      return;
    }
    startQuery(authUser);
  });
}

export function initLetterPage() {
  const btn = document.querySelector("[data-bookmark-toggle]");
  const notes = document.querySelector("[data-notes-input]");
  if (!btn && !notes) return;

  const path = normalizePath(window.location.pathname);

  const render = () => {
    const data = getData();
    if (btn) {
      const on = isBookmarked(data, path);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "Bookmarked" : "Bookmark";
      btn.classList.toggle("is-active", on);
    }
    if (notes && document.activeElement !== notes) {
      notes.value = data.notes[path] || "";
    }
  };

  render();
  onDataChange(render);

  if (btn) {
    btn.addEventListener("click", () => {
      toggleBookmark(path);
    });
  }

  if (notes) {
    notes.addEventListener(
      "input",
      debounce(() => setNote(path, notes.value), 300)
    );
  }
}

export function initBookmarksPage() {
  const listEl = document.querySelector("[data-bookmarks-list]");
  const emptyEl = document.querySelector("[data-bookmarks-empty]");
  if (!listEl || !emptyEl) return;

  const catalogEl = document.getElementById("letter-catalog");
  let catalog = [];
  try {
    catalog = JSON.parse(catalogEl ? catalogEl.textContent : "[]");
  } catch {
    catalog = [];
  }
  const byPath = Object.fromEntries(
    catalog.map((item) => [normalizePath(item.path), item])
  );

  function render() {
    const data = getData();
    const paths = data.bookmarks.slice().sort((a, b) => {
      const na = byPath[a]?.num ?? 9999;
      const nb = byPath[b]?.num ?? 9999;
      return na - nb;
    });

    listEl.innerHTML = "";
    if (!paths.length) {
      emptyEl.hidden = false;
      listEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;

    for (const path of paths) {
      const meta = byPath[path];
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = path;
      const num = document.createElement("span");
      num.className = "toc-num";
      num.textContent = meta ? `Letter ${meta.num}` : "Letter";
      const title = document.createElement("span");
      title.className = "toc-title";
      title.textContent = meta ? meta.title : path;
      link.append(num, title);
      li.appendChild(link);

      const note = data.notes[path];
      if (note && note.trim()) {
        const preview = document.createElement("p");
        preview.className = "bookmark-note-preview";
        preview.textContent = note.trim();
        li.appendChild(preview);
      }

      listEl.appendChild(li);
    }
  }

  render();
  onDataChange(render);

  const exportBtn = document.querySelector("[data-export]");
  const importInput = document.querySelector("[data-import]");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(getData(), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "moral-letters-bookmarks.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        await persist(normalizeData(parsed));
        render();
      } catch {
        alert("Could not import that file. Expect a JSON export from this site.");
      }
      importInput.value = "";
    });
  }
}

export function initTocPage() {
  const toc = document.querySelector("[data-toc]");
  if (!toc) return;

  function render() {
    const data = getData();
    const bookmarked = new Set(data.bookmarks);

    toc.querySelectorAll("a[data-path]").forEach((link) => {
      const path = normalizePath(link.getAttribute("data-path"));
      const bookmark = link.querySelector(".toc-bookmark");
      const note = link.querySelector(".toc-note");
      if (bookmark) bookmark.hidden = !bookmarked.has(path);
      if (note) {
        const text = data.notes[path];
        note.hidden = !(text && text.trim());
      }
    });
  }

  render();
  onDataChange(render);
}

export function initAccountPage() {
  const root = document.querySelector("[data-account-root]");
  if (!root) return;

  const signedOut = root.querySelector("[data-account-signed-out]");
  const signedIn = root.querySelector("[data-account-signed-in]");
  const emailStep = root.querySelector("[data-account-email-step]");
  const codeStep = root.querySelector("[data-account-code-step]");
  const emailForm = root.querySelector("[data-account-email-form]");
  const codeForm = root.querySelector("[data-account-code-form]");
  const emailInput = root.querySelector("[data-account-email]");
  const codeInput = root.querySelector("[data-account-code]");
  const sentEmailEl = root.querySelector("[data-account-sent-email]");
  const userEmailEl = root.querySelector("[data-account-user-email]");
  const statusEl = root.querySelector("[data-account-status]");
  const errorEl = root.querySelector("[data-account-error]");
  const signOutBtn = root.querySelector("[data-account-sign-out]");
  const backBtn = root.querySelector("[data-account-back]");
  const unavailable = root.querySelector("[data-account-unavailable]");

  let sentEmail = "";

  function setError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
  }

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.hidden = !msg;
  }

  function showSignedOut() {
    if (signedOut) signedOut.hidden = false;
    if (signedIn) signedIn.hidden = true;
    if (emailStep) emailStep.hidden = Boolean(sentEmail);
    if (codeStep) codeStep.hidden = !sentEmail;
    if (sentEmailEl) sentEmailEl.textContent = sentEmail;
  }

  function showSignedIn(user) {
    if (signedOut) signedOut.hidden = true;
    if (signedIn) signedIn.hidden = false;
    if (userEmailEl) userEmailEl.textContent = user.email || "Signed in";
    sentEmail = "";
    setError("");
    setStatus("Your bookmarks and notes sync across devices while you’re signed in.");
  }

  function render() {
    if (!hasInstant()) {
      if (unavailable) unavailable.hidden = false;
      if (signedOut) signedOut.hidden = true;
      if (signedIn) signedIn.hidden = true;
      return;
    }
    if (unavailable) unavailable.hidden = true;
    const user = getAuthUser();
    if (user) showSignedIn(user);
    else showSignedOut();
  }

  render();
  onDataChange(render);

  if (emailForm) {
    emailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setError("");
      if (!db) return;
      const email = (emailInput?.value || "").trim();
      if (!email) return;
      sentEmail = email;
      showSignedOut();
      setStatus("Sending code…");
      try {
        await db.auth.sendMagicCode({ email });
        setStatus("Check your email for a sign-in code.");
      } catch (err) {
        sentEmail = "";
        showSignedOut();
        setStatus("");
        setError(err?.body?.message || err?.message || "Could not send code.");
      }
    });
  }

  if (codeForm) {
    codeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setError("");
      if (!db) return;
      const code = (codeInput?.value || "").trim();
      if (!code || !sentEmail) return;
      setStatus("Verifying…");
      try {
        await db.auth.signInWithMagicCode({ email: sentEmail, code });
        setStatus("");
        if (codeInput) codeInput.value = "";
      } catch (err) {
        setStatus("");
        setError(err?.body?.message || err?.message || "Invalid code.");
        if (codeInput) codeInput.value = "";
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      sentEmail = "";
      setError("");
      setStatus("");
      showSignedOut();
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      setError("");
      if (!db) return;
      try {
        await db.auth.signOut();
      } catch (err) {
        setError(err?.body?.message || err?.message || "Could not sign out.");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initLetterPage();
  initBookmarksPage();
  initTocPage();
  initAccountPage();
});
