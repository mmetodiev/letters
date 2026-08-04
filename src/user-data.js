(function () {
  const STORAGE_KEY = "moral-letters-user";

  function normalizePath(path) {
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

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { bookmarks: [], notes: {} };
      const data = JSON.parse(raw);
      return {
        bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.map(normalizePath) : [],
        notes: data.notes && typeof data.notes === "object" ? data.notes : {},
      };
    } catch {
      return { bookmarks: [], notes: {} };
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function isBookmarked(data, path) {
    return data.bookmarks.includes(path);
  }

  function toggleBookmark(path) {
    const data = load();
    const i = data.bookmarks.indexOf(path);
    if (i >= 0) data.bookmarks.splice(i, 1);
    else data.bookmarks.push(path);
    save(data);
    return isBookmarked(data, path);
  }

  function setNote(path, text) {
    const data = load();
    if (!text || !text.trim()) delete data.notes[path];
    else data.notes[path] = text;
    save(data);
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function initLetterPage() {
    const btn = document.querySelector("[data-bookmark-toggle]");
    const notes = document.querySelector("[data-notes-input]");
    if (!btn && !notes) return;

    const path = normalizePath(window.location.pathname);
    const data = load();

    if (btn) {
      const update = (on) => {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? "Bookmarked" : "Bookmark";
        btn.classList.toggle("is-active", on);
      };
      update(isBookmarked(data, path));
      btn.addEventListener("click", () => {
        update(toggleBookmark(path));
      });
    }

    if (notes) {
      notes.value = data.notes[path] || "";
      notes.addEventListener(
        "input",
        debounce(() => setNote(path, notes.value), 300)
      );
    }
  }

  function initBookmarksPage() {
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
      const data = load();
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

    const exportBtn = document.querySelector("[data-export]");
    const importInput = document.querySelector("[data-import]");

    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(load(), null, 2)], {
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
          const next = {
            bookmarks: Array.isArray(parsed.bookmarks)
              ? parsed.bookmarks.map(normalizePath)
              : [],
            notes:
              parsed.notes && typeof parsed.notes === "object"
                ? parsed.notes
                : {},
          };
          save(next);
          render();
        } catch {
          alert("Could not import that file. Expect a JSON export from this site.");
        }
        importInput.value = "";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLetterPage();
    initBookmarksPage();
  });
})();
