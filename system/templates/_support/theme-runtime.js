/* Theme runtime — applies a saved configurator theme across the system.

   The configurator saves a resolved set of token values to browser storage. This script
   reads them and writes them onto the document root, so every page that loads it shows
   the saved theme. It is a preview mechanism: it makes a theme judgeable across the whole
   system before you commit to it. Nothing here belongs in production.

   Commit a theme by pasting the configurator's exported CSS into
   tokens/themes/theme-custom.css. That version needs no JavaScript and survives a
   cleared cache.

   Load it after styles.css:
     <script src="templates/_support/theme-runtime.js"></script>
   Depth matters — from a subdirectory, use ../templates/_support/theme-runtime.js.

   It lives under templates/ because the design-system compiler sweeps every .js in the
   project into _ds_bundle.js, and templates/ is the one tree it skips. This is a page
   script, not a component. */
(function () {
  var KEY = "dovetail-theme-config";
  var applied = [];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function apply(cfg) {
    var root = document.documentElement;

    // Clear the previous application first, so switching themes never leaves a residue.
    applied.forEach(function (k) { root.style.removeProperty(k); });
    applied = [];

    if (!cfg) return;

    if (cfg.vars) {
      Object.keys(cfg.vars).forEach(function (k) {
        root.style.setProperty(k, cfg.vars[k]);
        applied.push(k);
      });
    }

    if (cfg.fontHref) {
      var l = document.querySelector("link[data-dt-theme-font]");
      if (!l) {
        l = document.createElement("link");
        l.rel = "stylesheet";
        l.setAttribute("data-dt-theme-font", "");
        document.head.appendChild(l);
      }
      if (l.href !== cfg.fontHref) l.href = cfg.fontHref;
    }

    root.classList.toggle("dark", !!cfg.dark);
  }

  apply(load());

  // A save in the configurator tab reaches every other open page.
  window.addEventListener("storage", function (e) { if (e.key === KEY) apply(load()); });
  window.addEventListener("dovetail:theme-change", function () { apply(load()); });
})();
