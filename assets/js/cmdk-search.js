/* ⌘K / "/" command-palette search overlay.
 * Progressive enhancement over the /search page: opens a dismissable modal on
 * top of the current page, lazy-loads the Fuse index on first use, and can be
 * closed with Escape, a click on the backdrop, or ⌘K/Ctrl+K again.
 * Depends on the global `Fuse` (bundled ahead of this file). */
(function () {
  "use strict";

  var root = document.getElementById("cmdk");
  if (!root || typeof Fuse === "undefined") return;

  var backdrop = root.querySelector(".cmdk-backdrop");
  var input = root.querySelector(".cmdk-input");
  var resultsEl = root.querySelector(".cmdk-results");
  var emptyEl = root.querySelector(".cmdk-empty");
  var jsonURL = root.getAttribute("data-index");
  var searchURL = root.getAttribute("data-search-url");

  var fuse = null; // built on first open
  var loading = false;
  var lastFocused = null; // element to restore focus to on close
  var activeIndex = -1; // highlighted result
  var results = [];

  var isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  function isEditable(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  function isOpen() {
    return root.classList.contains("cmdk-open");
  }

  function loadIndex() {
    if (fuse || loading) return;
    loading = true;
    emptyEl.textContent = "Loading search…";
    emptyEl.hidden = false;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", jsonURL);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      loading = false;
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          fuse = new Fuse(data, {
            distance: 100,
            threshold: 0.4,
            ignoreLocation: true,
            keys: ["title", "permalink", "summary", "content"],
          });
          if (input.value) render(input.value);
          else emptyEl.hidden = true;
        } catch (err) {
          emptyEl.textContent = "Search unavailable.";
        }
      } else {
        emptyEl.textContent = "Search unavailable.";
      }
    };
    xhr.send();
  }

  function render(query) {
    query = (query || "").trim();
    resultsEl.innerHTML = "";
    activeIndex = -1;
    results = [];

    if (!query) {
      emptyEl.hidden = true;
      return;
    }
    if (!fuse) {
      // index still loading; loadIndex() will re-render when ready
      return;
    }

    results = fuse.search(query).slice(0, 8);
    if (!results.length) {
      emptyEl.textContent = "No results for “" + query + "”";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    var frag = document.createDocumentFragment();
    results.forEach(function (r, i) {
      var item = r.item;
      var li = document.createElement("li");
      li.className = "cmdk-result";
      li.id = "cmdk-result-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");

      var a = document.createElement("a");
      a.href = item.permalink;
      a.tabIndex = -1;

      var title = document.createElement("span");
      title.className = "cmdk-result-title";
      title.textContent = item.title || item.permalink;
      a.appendChild(title);

      if (item.summary) {
        var summary = document.createElement("span");
        summary.className = "cmdk-result-summary";
        summary.textContent = item.summary;
        a.appendChild(summary);
      }

      li.appendChild(a);
      li.addEventListener("mousemove", function () {
        setActive(i);
      });
      li.addEventListener("click", function () {
        go(i);
      });
      frag.appendChild(li);
    });
    resultsEl.appendChild(frag);
    setActive(0);
  }

  function setActive(i) {
    var items = resultsEl.children;
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].classList.remove("active");
      items[activeIndex].setAttribute("aria-selected", "false");
    }
    activeIndex = i;
    if (i >= 0 && items[i]) {
      items[i].classList.add("active");
      items[i].setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", items[i].id);
      items[i].scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function move(delta) {
    if (!results.length) return;
    var next = activeIndex + delta;
    if (next < 0) next = results.length - 1;
    if (next >= results.length) next = 0;
    setActive(next);
  }

  function go(i) {
    if (i >= 0 && results[i]) {
      window.location.href = results[i].item.permalink;
    } else if (input.value.trim() && searchURL) {
      // Nothing highlighted: fall back to the full search page.
      window.location.href = searchURL + "?query=" + encodeURIComponent(input.value.trim());
    }
  }

  function open() {
    if (isOpen()) return;
    lastFocused = document.activeElement;
    root.classList.add("cmdk-open");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("cmdk-lock");
    loadIndex();
    input.focus();
    input.select();
  }

  function close() {
    if (!isOpen()) return;
    root.classList.remove("cmdk-open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cmdk-lock");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  // Backdrop click closes; clicks inside the panel do not (they don't reach here).
  backdrop.addEventListener("click", close);

  input.addEventListener("input", function () {
    render(input.value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(activeIndex);
    }
  });

  // Global shortcuts.
  document.addEventListener("keydown", function (e) {
    // ⌘K (mac) / Ctrl+K (others) toggles the overlay.
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      toggle();
      return;
    }
    // Escape closes when open.
    if (e.key === "Escape" && isOpen()) {
      e.preventDefault();
      close();
      return;
    }
    // "/" opens — but not while typing in a field and not with modifiers.
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target) && !isOpen()) {
      e.preventDefault();
      open();
    }
  });

  // Reflect the platform in the nav pill hint (⌘K vs Ctrl K).
  if (!isMac) {
    document.querySelectorAll(".search-pill kbd").forEach(function (k) {
      k.textContent = "Ctrl K";
    });
  }
})();
