/* Site chrome behaviour: colour mode, context, navigation filter.

   The preview cards are same-origin iframes that watch `data-theme` on their
   own <html>. Setting that attribute is how a theme change reaches inside
   them — there is no message channel and none is needed. */

(function () {
  "use strict";

  var MODE_KEY = "dovetail-docs-mode";
  var CONTEXT_KEY = "dovetail-docs-context";
  var CONTEXTS = ["dt-context-product", "dt-context-marketing"];
  var root = document.documentElement;

  function store(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (e) {
      /* Private mode, or storage is blocked. The page still works. */
    }
  }

  function readStore(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  var mode = readStore(MODE_KEY, "light");
  var context = readStore(CONTEXT_KEY, "");

  /* Dark mode and the contexts key on classes; the cards key on data-theme.
     One state, written both ways. */
  function apply() {
    root.classList.toggle("dark", mode === "dark");
    CONTEXTS.forEach(function (c) {
      root.classList.toggle(c, c === context);
    });
    root.setAttribute("data-theme", mode === "dark" ? "dark" : context || "light");

    var toggle = document.getElementById("mode-toggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
      var label = toggle.querySelector("[data-mode-label]");
      if (label) label.textContent = mode === "dark" ? "Light" : "Dark";
    }

    forEachFrame(paintFrame);
  }

  function forEachFrame(fn) {
    Array.prototype.forEach.call(document.querySelectorAll("iframe"), fn);
  }

  function paintFrame(frame) {
    var doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      return; /* Not same-origin. Nothing to do and nothing broken. */
    }
    if (!doc || !doc.documentElement) return;
    var el = doc.documentElement;
    el.setAttribute("data-theme", mode === "dark" ? "dark" : context || "light");
    /* The card's own observer reads that one attribute and so can express one
       theme at a time. Setting the classes after it has reacted is what lets
       dark mode and a context apply together. */
    setTimeout(function () {
      el.classList.toggle("dark", mode === "dark");
      CONTEXTS.forEach(function (c) {
        el.classList.toggle(c, c === context);
      });
    }, 0);
  }

  var modeToggle = document.getElementById("mode-toggle");
  if (modeToggle) {
    modeToggle.addEventListener("click", function () {
      mode = mode === "dark" ? "light" : "dark";
      store(MODE_KEY, mode === "dark" ? "dark" : "");
      apply();
    });
  }

  var contextSelect = document.getElementById("context-select");
  if (contextSelect) {
    contextSelect.value = context;
    contextSelect.addEventListener("change", function () {
      context = contextSelect.value;
      store(CONTEXT_KEY, context);
      apply();
    });
  }

  /* Cards are lazy-loaded, so each one is themed as it arrives. */
  forEachFrame(function (frame) {
    frame.addEventListener("load", function () {
      paintFrame(frame);
    });
  });

  var navToggle = document.getElementById("nav-toggle");
  var sidebar = document.getElementById("sidebar");
  if (navToggle && sidebar) {
    navToggle.addEventListener("click", function () {
      var open = sidebar.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Filtering hides links, not sections: an empty section says the filter
     matched nothing there, which is information. */
  var filter = document.getElementById("nav-search");
  if (filter && sidebar) {
    filter.addEventListener("input", function () {
      var q = filter.value.trim().toLowerCase();
      Array.prototype.forEach.call(sidebar.querySelectorAll("li"), function (li) {
        if (li.classList.contains("nav-group")) return;
        var link = li.querySelector("a");
        if (!link) return;
        li.hidden = q ? link.textContent.toLowerCase().indexOf(q) === -1 : false;
      });
      Array.prototype.forEach.call(sidebar.querySelectorAll(".nav-section"), function (section) {
        if (q) section.open = true;
      });
    });
  }

  apply();
})();
