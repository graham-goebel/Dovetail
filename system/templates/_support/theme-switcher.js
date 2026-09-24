/* Theme switcher — floating toolbar for demo and kit pages.

   Lets a viewer render the page under any shipped theme without leaving it. It writes the
   same token overrides the configurator writes, and fires the same "dovetail:theme-change"
   event, so a page that also loads theme-runtime.js stays in sync.

   Demo chrome, not a component. Load it after styles.css:
     <script src="../templates/_support/theme-switcher.js"></script>

   It lives under templates/ because the design-system compiler sweeps every .js in the
   project into _ds_bundle.js, and templates/ is the one tree it skips. */
(function () {
  var KEY = "dovetail-demo-theme";
  var STEPS = ["050","100","200","300","400","500","600","700","800","900","950"];

  var RAMPS = {
    primary: null,
    terracotta: ["oklch(0.971 0.016 45)","oklch(0.939 0.038 45)","oklch(0.892 0.070 45)","oklch(0.820 0.112 45)","oklch(0.735 0.148 45)","oklch(0.660 0.166 45)","oklch(0.585 0.162 45)","oklch(0.505 0.140 45)","oklch(0.430 0.117 45)","oklch(0.372 0.097 45)","oklch(0.262 0.070 45)"],
    blue: ["oklch(0.970 0.014 259)","oklch(0.936 0.032 259)","oklch(0.885 0.059 259)","oklch(0.809 0.096 259)","oklch(0.714 0.143 259)","oklch(0.623 0.188 259)","oklch(0.546 0.215 259)","oklch(0.476 0.196 259)","oklch(0.404 0.162 259)","oklch(0.344 0.128 259)","oklch(0.256 0.093 259)"],
    neutral: ["oklch(0.985 0.001 264)","oklch(0.967 0.002 264)","oklch(0.925 0.003 264)","oklch(0.869 0.005 264)","oklch(0.708 0.007 264)","oklch(0.556 0.008 264)","oklch(0.440 0.008 264)","oklch(0.360 0.008 264)","oklch(0.273 0.007 264)","oklch(0.205 0.006 264)","oklch(0.145 0.005 264)"]
  };

  var RADIUS = {
    sharp:    { control: "0", container: "0", overlay: "0", media: "0", pill: "0" },
    standard: { control: "6px", container: "8px", overlay: "12px", media: "8px", pill: "9999px" },
    soft:     { control: "9999px", container: "16px", overlay: "24px", media: "12px", pill: "9999px" }
  };

  var THEMES = {
    base:      { label: "Base",      ramp: "blue",       radius: "standard", font: null },
    editorial: { label: "Editorial", ramp: "terracotta", radius: "soft",     font: '"Newsreader", Georgia, serif', google: "Newsreader:opsz,wght@6..72,400..700" },
    mono:      { label: "Mono",      ramp: "neutral",    radius: "sharp",    font: '"Geist Mono", ui-monospace, monospace' }
  };

  var state = load();

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && THEMES[raw.theme]) return { theme: raw.theme, dark: !!raw.dark };
    } catch (e) {}
    return { theme: "base", dark: false };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var fontLink = null;

  function apply() {
    var t = THEMES[state.theme];
    var root = document.documentElement;
    var ramp = RAMPS[t.ramp];

    for (var i = 0; i < STEPS.length; i++) root.style.setProperty("--dt-color-primary-" + STEPS[i], ramp[i]);

    var r = RADIUS[t.radius];
    for (var k in r) if (Object.prototype.hasOwnProperty.call(r, k)) root.style.setProperty("--dt-radius-" + k, r[k]);

    if (t.font) root.style.setProperty("--dt-font-family-sans", t.font);
    else root.style.removeProperty("--dt-font-family-sans");

    if (t.google) {
      if (!fontLink) {
        fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
      }
      var href = "https://fonts.googleapis.com/css2?family=" + t.google + "&display=swap";
      if (fontLink.href !== href) fontLink.href = href;
    }

    root.classList.toggle("dark", state.dark);
    save();
    window.dispatchEvent(new Event("dovetail:theme-change"));
    paint();
  }

  var bar, themeBtns = {}, modeBtn;

  function paint() {
    for (var id in themeBtns) {
      if (Object.prototype.hasOwnProperty.call(themeBtns, id)) {
        themeBtns[id].setAttribute("aria-pressed", String(id === state.theme));
        style(themeBtns[id], id === state.theme);
      }
    }
    if (modeBtn) {
      modeBtn.textContent = state.dark ? "Dark" : "Light";
      modeBtn.setAttribute("aria-pressed", String(state.dark));
      style(modeBtn, state.dark);
    }
  }

  function style(el, on) {
    el.style.background = on ? "var(--dt-surface-action)" : "transparent";
    el.style.color = on ? "var(--dt-text-on-action)" : "var(--dt-text-secondary)";
  }

  function build() {
    bar = document.createElement("div");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Preview theme");
    bar.style.cssText = [
      "position:fixed", "bottom:20px", "left:50%", "transform:translateX(-50%)",
      "z-index:200", "display:flex", "align-items:center", "gap:4px",
      "padding:5px", "border-radius:var(--dt-radius-pill)",
      "background:var(--dt-surface-raised)",
      "border:var(--dt-border-width-default) solid var(--dt-border-subtle)",
      "box-shadow:var(--dt-elevation-3)",
      "font-family:var(--dt-text-label-sm-family)",
      "max-width:calc(100vw - 32px)", "overflow-x:auto"
    ].join(";");

    var lbl = document.createElement("span");
    lbl.textContent = "Theme";
    lbl.style.cssText = "padding:0 8px 0 10px;font-family:var(--dt-font-family-mono);font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--dt-text-tertiary);white-space:nowrap";
    bar.appendChild(lbl);

    Object.keys(THEMES).forEach(function (id) {
      var b = chip(THEMES[id].label);
      b.onclick = function () { state.theme = id; apply(); };
      themeBtns[id] = b;
      bar.appendChild(b);
    });

    var sep = document.createElement("span");
    sep.style.cssText = "width:var(--dt-border-width-default);align-self:stretch;margin:2px 4px;background:var(--dt-border-subtle)";
    bar.appendChild(sep);

    modeBtn = chip("Light");
    modeBtn.onclick = function () { state.dark = !state.dark; apply(); };
    bar.appendChild(modeBtn);

    document.body.appendChild(bar);
  }

  function chip(text) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-pressed", "false");
    b.style.cssText = [
      "appearance:none", "border:none", "cursor:pointer", "white-space:nowrap",
      "padding:6px 13px", "border-radius:var(--dt-radius-pill)",
      "font-family:inherit", "font-size:var(--dt-text-label-sm-size)",
      "font-weight:var(--dt-font-weight-medium)",
      "transition:background var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)"
    ].join(";");
    return b;
  }

  function init() { build(); apply(); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
