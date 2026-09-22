/* The bases panel: a floating toolbar and sheet that set the tokens a brand is
   allowed to touch, and show the result everywhere at once.

   State lives in one localStorage key, `dovetail-theme-config`, which is the
   key the system's own `templates/_support/theme-runtime.js` already reads.
   Using it rather than a second, site-only key is what makes a change reach
   the whole system: every page of this site, every preview card inside an
   iframe, the tearsheet, the settings template, and the theme configurator
   card itself, which writes the same payload when you press Save there.

   The presets come from `assets/bases-data.js`, extracted from the
   configurator at build time, so the panel and the configurator can never
   drift apart. */

(function () {
  "use strict";

  var DATA = window.DovetailBases;
  if (!DATA) return;

  var KEY = "dovetail-theme-config";
  var CONTEXT_KEY = "dovetail-docs-context";
  var CONTEXTS = ["dt-context-product", "dt-context-marketing"];

  var DEFAULTS = {
    accent: "blue",
    customHex: "#3366cc",
    radius: "standard",
    font: "sans",
    codeFont: "mono",
    density: false,
    dark: false,
    mono: false,
  };

  /* ------------------------------------------------------------- the model */

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* Private mode, or storage is blocked. The panel still works for this page. */
    }
  }

  function load() {
    var cfg;
    try {
      cfg = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      cfg = null;
    }
    return assign(assign({}, DEFAULTS), cfg || {});
  }

  function loadContext() {
    try {
      return localStorage.getItem(CONTEXT_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function assign(target, source) {
    for (var k in source) if (Object.prototype.hasOwnProperty.call(source, k)) target[k] = source[k];
    return target;
  }

  /* sRGB hex to an OKLCH hue in degrees. The lightness and chroma of each step
     are taken from the blue ramp, so a custom hue keeps the contrast profile
     the system was tested against instead of inventing a new one.
     This is the configurator's own conversion, kept identical on purpose. */
  function hexToOklchHue(hex) {
    var n = parseInt(hex.slice(1), 16);
    var toLin = function (c) {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    var r = toLin((n >> 16) & 255), g = toLin((n >> 8) & 255), b = toLin(n & 255);
    var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    var l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
    var A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    var B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
    var h = Math.atan2(B, A) * 180 / Math.PI;
    if (h < 0) h += 360;
    return h;
  }

  function customRamp(hex) {
    var hue = hexToOklchHue(hex);
    var ramp = {};
    DATA.steps.forEach(function (step) {
      var parts = DATA.ramps.blue[step].match(/oklch\(([\d.]+) ([\d.]+) [\d.]+\)/);
      ramp[step] = "oklch(" + parts[1] + " " + parts[2] + " " + hue.toFixed(1) + ")";
    });
    return ramp;
  }

  function rampFor(cfg) {
    return cfg.accent === "custom" ? customRamp(cfg.customHex) : DATA.ramps[cfg.accent] || DATA.ramps.blue;
  }

  function fontHrefFor(cfg) {
    var families = [];
    [DATA.fonts[cfg.font], DATA.fonts[cfg.codeFont]].forEach(function (f) {
      if (f && f.googleFont && families.indexOf(f.googleFont) === -1) families.push(f.googleFont);
    });
    if (!families.length) return null;
    return "https://fonts.googleapis.com/css2?family=" + families.join("&family=") + "&display=swap";
  }

  /* The full set of declarations a configuration produces. This is also what
     gets written to storage, so a page that only loads the system's theme
     runtime — the tearsheet, the settings template — renders the same theme
     without knowing anything about this panel. */
  function computeVars(cfg) {
    var vars = {};
    var ramp = rampFor(cfg);

    DATA.steps.forEach(function (step) {
      vars["--dt-color-accent-" + step] = ramp[step];
    });

    var radius = DATA.radii[cfg.radius] || DATA.radii.standard;
    vars["--dt-radius-control"] = radius.control;
    vars["--dt-radius-container"] = radius.container;
    vars["--dt-radius-overlay"] = radius.overlay;
    vars["--dt-radius-media"] = radius.media;
    vars["--dt-radius-pill"] = radius.pill;

    var ui = DATA.fonts[cfg.font];
    if (ui) vars["--dt-font-family-sans"] = ui.value;
    var code = DATA.fonts[cfg.codeFont];
    if (code) vars["--dt-font-family-mono"] = code.value;

    if (cfg.density) assign(vars, DATA.density);
    /* The configurator previews the monochrome overrides but leaves them out of
       what it saves, so the preset could not survive a reload. They are carried
       here, and in the export, for the same reason every other choice is. */
    if (cfg.mono) assign(vars, DATA.monochrome);

    return vars;
  }

  /* ------------------------------------------------------------ application */

  function applyTo(doc, cfg, context, vars) {
    if (!doc || !doc.documentElement) return;
    var root = doc.documentElement;

    var previous = root.__dovetailApplied || [];
    previous.forEach(function (name) {
      root.style.removeProperty(name);
    });

    var names = [];
    for (var name in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, name)) {
        root.style.setProperty(name, vars[name]);
        names.push(name);
      }
    }
    root.__dovetailApplied = names;

    var href = fontHrefFor(cfg);
    if (href) {
      var link = doc.querySelector("link[data-dt-theme-font]");
      if (!link) {
        link = doc.createElement("link");
        link.rel = "stylesheet";
        link.setAttribute("data-dt-theme-font", "");
        doc.head.appendChild(link);
      }
      if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    }

    /* A preview card watches `data-theme` on its own root and can express one
       value at a time. Setting the classes after it has reacted is what lets
       dark mode and a context apply together. */
    root.setAttribute("data-theme", cfg.dark ? "dark" : context || "light");
    var paintClasses = function () {
      root.classList.toggle("dark", !!cfg.dark);
      CONTEXTS.forEach(function (name) {
        root.classList.toggle(name, name === context);
      });
    };
    paintClasses();
    setTimeout(paintClasses, 0);
  }

  function frames() {
    return Array.prototype.filter.call(document.querySelectorAll("iframe"), function (frame) {
      try {
        return !!frame.contentDocument;
      } catch (e) {
        return false; /* Not same-origin. Nothing to do and nothing broken. */
      }
    });
  }

  var config = load();
  var context = loadContext();

  function applyEverywhere(options) {
    var vars = computeVars(config);
    applyTo(document, config, context, vars);
    frames().forEach(function (frame) {
      applyTo(frame.contentDocument, config, context, vars);
    });
    render(options);
  }

  function commit(patch, options) {
    assign(config, patch || {});
    store(KEY, JSON.stringify(assign(assign({}, config), {
      vars: computeVars(config),
      fontHref: fontHrefFor(config),
    })));
    applyEverywhere(options);
    window.dispatchEvent(new Event("dovetail:theme-change"));
  }

  function setContext(next) {
    context = next;
    store(CONTEXT_KEY, next || null);
    applyEverywhere();
  }

  function reset() {
    config = assign({}, DEFAULTS);
    store(KEY, null);
    setContext("");
    window.dispatchEvent(new Event("dovetail:theme-change"));
  }

  /* --------------------------------------------------------------- the CSS */

  function exportCss() {
    var ramp = rampFor(config);
    var radius = DATA.radii[config.radius];
    var ui = DATA.fonts[config.font];
    var code = DATA.fonts[config.codeFont];
    var accentLabel = config.accent === "custom" ? "Custom (" + config.customHex + ")" : labelFor(config.accent);
    var lines = [];

    lines.push("/* A theme is a file of token overrides. Nothing below names a component. */");
    lines.push(":root {");
    lines.push("  /* Accent — " + accentLabel + " */");
    DATA.steps.forEach(function (step) {
      lines.push("  --dt-color-accent-" + step + ": " + ramp[step] + ";");
    });
    lines.push("");
    lines.push("  /* Shape — " + radius.label + " */");
    lines.push("  --dt-radius-control: " + radius.control + ";");
    lines.push("  --dt-radius-container: " + radius.container + ";");
    lines.push("  --dt-radius-overlay: " + radius.overlay + ";");
    lines.push("  --dt-radius-media: " + radius.media + ";");
    lines.push("  --dt-radius-pill: " + radius.pill + ";");
    lines.push("");
    lines.push("  /* Type — " + ui.label + ", " + code.label + " */");
    lines.push("  --dt-font-family-sans: " + ui.value + ";");
    lines.push("  --dt-font-family-mono: " + code.value + ";");

    if (config.density) {
      lines.push("");
      lines.push("  /* Density — compact */");
      Object.keys(DATA.density).forEach(function (name) {
        lines.push("  " + name + ": " + DATA.density[name] + ";");
      });
    }
    if (config.mono) {
      lines.push("");
      lines.push("  /* Monochrome — action surfaces read as ink, not colour */");
      Object.keys(DATA.monochrome).forEach(function (name) {
        lines.push("  " + name + ": " + DATA.monochrome[name] + ";");
      });
    }
    lines.push("}");
    return lines.join("\n");
  }

  function labelFor(accentId) {
    var hit = DATA.accents.filter(function (a) {
      return a.id === accentId;
    })[0];
    return hit ? hit.label : accentId;
  }

  function matchedPreset() {
    var keys = Object.keys(DATA.presets);
    for (var i = 0; i < keys.length; i++) {
      var p = DATA.presets[keys[i]];
      if (p.accent === config.accent && p.radius === config.radius && p.font === config.font && !!p.mono === !!config.mono) {
        return keys[i];
      }
    }
    return "custom";
  }

  /* ------------------------------------------------------------- the panel */

  var el = {};

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    for (var key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      if (key === "text") node.textContent = attrs[key];
      else if (key === "html") node.innerHTML = attrs[key];
      else if (key.indexOf("on") === 0) node.addEventListener(key.slice(2), attrs[key]);
      else if (attrs[key] != null && attrs[key] !== false) node.setAttribute(key, attrs[key] === true ? "" : attrs[key]);
    }
    (children || []).forEach(function (child) {
      node.appendChild(child);
    });
    return node;
  }

  function field(label, hint, control) {
    var parts = [h("span", { class: "bases-label", text: label })];
    if (hint) parts.push(h("span", { class: "bases-hint", text: hint }));
    parts.push(control);
    return h("div", { class: "bases-field" }, parts);
  }

  function segmented(name, bid, options, current, onPick) {
    return h(
      "div",
      { class: "bases-seg", role: "group", "aria-label": name },
      options.map(function (option) {
        return h("button", {
          type: "button",
          class: "bases-seg-btn",
          "data-bid": bid + ":" + option.value,
          "aria-pressed": String(option.value === current),
          text: option.label,
          onclick: function () {
            onPick(option.value);
          },
        });
      })
    );
  }

  function select(name, bid, options, current, onPick) {
    var node = h(
      "select",
      {
        class: "bases-select",
        "data-bid": bid,
        "aria-label": name,
        onchange: function () {
          onPick(node.value);
        },
      },
      options.map(function (option) {
        return h("option", { value: option.value, text: option.label });
      })
    );
    node.value = current;
    return node;
  }

  function buildPanel() {
    el.toolbar = h("div", { class: "bases-bar", role: "group", "aria-label": "Theme controls" }, [
      (el.mode = h("button", {
        type: "button",
        class: "bases-icon-btn",
        title: "Toggle dark mode",
        "aria-pressed": "false",
        onclick: function () {
          commit({ dark: !config.dark });
        },
      })),
      (el.open = h("button", {
        type: "button",
        class: "bases-open-btn",
        "aria-expanded": "false",
        "aria-controls": "bases-sheet",
        onclick: toggle,
      })),
    ]);

    el.swatch = h("span", { class: "bases-swatch", "aria-hidden": "true" });
    el.openLabel = h("span", { text: "Bases" });
    el.open.appendChild(el.swatch);
    el.open.appendChild(el.openLabel);

    el.scrim = h("div", { class: "bases-scrim", hidden: true, onclick: close });

    el.sheet = h("aside", {
      id: "bases-sheet",
      class: "bases-sheet",
      role: "dialog",
      "aria-labelledby": "bases-title",
      hidden: true,
    });

    el.body = h("div", { class: "bases-body" });

    el.sheet.appendChild(
      h("header", { class: "bases-head" }, [
        h("div", {}, [
          h("h2", { id: "bases-title", text: "Bases" }),
          h("p", {
            class: "bases-sub",
            text: "The tokens a brand is allowed to touch. Every change applies to this page, every other page, and every live card on them.",
          }),
        ]),
        h("button", { type: "button", class: "bases-close", "aria-label": "Close", text: "×", onclick: close }),
      ])
    );
    el.sheet.appendChild(el.body);

    document.body.appendChild(el.toolbar);
    document.body.appendChild(el.scrim);
    document.body.appendChild(el.sheet);

    renderBody();
  }

  /* The body is rebuilt on every change. It is a few dozen nodes, and rebuilding
     keeps the controls and the state in step without a diffing layer. The cost
     is that the control you just used is a different element afterwards, so
     scroll position and focus are carried across by id. */
  function renderBody() {
    var active = document.activeElement;
    var bid = active && active.getAttribute ? active.getAttribute("data-bid") : null;
    var scroll = el.body.scrollTop;
    paintBody();
    el.body.scrollTop = scroll;
    if (bid) {
      var restored = el.body.querySelector('[data-bid="' + bid + '"]');
      if (restored) restored.focus();
    }
  }

  function paintBody() {
    var body = el.body;
    body.textContent = "";

    var presetOptions = Object.keys(DATA.presets).map(function (key) {
      return { value: key, label: DATA.presets[key].label };
    });
    var current = matchedPreset();
    if (current === "custom") presetOptions.push({ value: "custom", label: "Custom" });

    body.appendChild(
      field(
        "Theme",
        "A starting point. Change anything below and it becomes custom.",
        select("Theme", "preset", presetOptions, current, function (value) {
          if (value === "custom") return;
          var preset = DATA.presets[value];
          /* Take the choices, not the preset's own label. */
          commit({ accent: preset.accent, radius: preset.radius, font: preset.font, mono: !!preset.mono });
        })
      )
    );

    var swatches = DATA.accents.map(function (accent) {
      return h("button", {
        type: "button",
        class: "bases-swatch-btn",
        "data-bid": "accent:" + accent.id,
        style: "background:" + DATA.ramps[accent.id]["600"],
        title: accent.label,
        "aria-label": accent.label,
        "aria-pressed": String(config.accent === accent.id),
        onclick: function () {
          commit({ accent: accent.id });
        },
      });
    });

    var picker = h("input", {
      type: "color",
      class: "bases-color",
      "data-bid": "accent:custom",
      value: config.customHex,
      "aria-label": "Custom accent colour",
      /* Dragging in the picker fires input continuously. Rebuilding the body
         on each event would replace the open control, so the live pass leaves
         the markup alone and change does the full rebuild at the end. */
      oninput: function (event) {
        commit({ accent: "custom", customHex: event.target.value }, { rebuild: false });
      },
      onchange: function (event) {
        commit({ accent: "custom", customHex: event.target.value });
      },
    });
    swatches.push(
      h("span", { class: "bases-swatch-btn bases-swatch-custom", "aria-pressed": String(config.accent === "custom"), title: "Custom colour" }, [picker])
    );

    body.appendChild(
      field(
        "Brand accent",
        "One hue drives eleven steps. Lightness and chroma stay put, so contrast holds.",
        h("div", { class: "bases-swatches" }, swatches)
      )
    );

    body.appendChild(
      field(
        "Radius",
        "Named by what it wraps, so three choices reshape every control and surface.",
        segmented(
          "Radius",
          "radius",
          Object.keys(DATA.radii).map(function (key) {
            return { value: key, label: DATA.radii[key].label };
          }),
          config.radius,
          function (value) {
            commit({ radius: value });
          }
        )
      )
    );

    body.appendChild(
      field(
        "Interface type",
        "Sets --dt-font-family-sans. Every type role inherits it.",
        select("Interface type", "font", DATA.interfaceFonts, config.font, function (value) {
          commit({ font: value });
        })
      )
    );

    body.appendChild(
      field(
        "Code type",
        "Sets --dt-font-family-mono for code, tokens and numerals.",
        select("Code type", "codeFont", DATA.codeFonts, config.codeFont, function (value) {
          commit({ codeFont: value });
        })
      )
    );

    body.appendChild(
      field(
        "Density",
        "Compact retunes control heights and inset only. Type and colour do not move.",
        segmented(
          "Density",
          "density",
          [{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }],
          config.density ? "compact" : "comfortable",
          function (value) {
            commit({ density: value === "compact" });
          }
        )
      )
    );

    body.appendChild(
      field(
        "Monochrome",
        "Drops the brand hue from action surfaces. Feedback colours stay chromatic.",
        segmented(
          "Monochrome",
          "mono",
          [{ value: "off", label: "Off" }, { value: "on", label: "On" }],
          config.mono ? "on" : "off",
          function (value) {
            commit({ mono: value === "on" });
          }
        )
      )
    );

    body.appendChild(h("hr", { class: "bases-rule" }));

    body.appendChild(
      field(
        "Colour mode",
        "The same semantic names, re-pointed. No component changes.",
        segmented(
          "Colour mode",
          "mode",
          [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }],
          config.dark ? "dark" : "light",
          function (value) {
            commit({ dark: value === "dark" });
          }
        )
      )
    );

    body.appendChild(
      field(
        "Context",
        "A fourth axis beside theme, mode and density. It retunes scale and rhythm, never colour.",
        segmented(
          "Context",
          "context",
          [
            { value: "", label: "Default" },
            { value: "dt-context-product", label: "Product" },
            { value: "dt-context-marketing", label: "Marketing" },
          ],
          context,
          setContext
        )
      )
    );

    body.appendChild(h("hr", { class: "bases-rule" }));

    el.export = h("textarea", { class: "bases-export", readonly: true, rows: "10", spellcheck: "false", "aria-label": "Theme CSS" });
    el.export.value = exportCss();

    el.copy = h("button", {
      type: "button",
      class: "bases-btn bases-btn-primary",
      "data-bid": "copy",
      text: "Copy theme CSS",
      onclick: function () {
        var done = function () {
          el.copy.textContent = "Copied";
          setTimeout(function () {
            el.copy.textContent = "Copy theme CSS";
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(el.export.value).then(done, fallbackCopy);
        } else {
          fallbackCopy();
        }
        function fallbackCopy() {
          el.export.select();
          try {
            document.execCommand("copy");
            done();
          } catch (e) {
            el.copy.textContent = "Select and copy";
          }
        }
      },
    });

    body.appendChild(
      field(
        "Export",
        "Paste this into tokens/themes/theme-custom.css and the theme ships with the repository, with no JavaScript.",
        h("div", { class: "bases-export-wrap" }, [el.export, h("div", { class: "bases-actions" }, [
          el.copy,
          h("button", { type: "button", class: "bases-btn", "data-bid": "reset", text: "Reset", onclick: reset }),
        ])])
      )
    );

    body.appendChild(
      h("p", {
        class: "bases-note",
        text: "Held in this browser only, under the key the system's own theme runtime reads. Nothing here edits a file.",
      })
    );
  }

  /* --------------------------------------------------------------- opening */

  var lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    el.sheet.hidden = false;
    el.scrim.hidden = false;
    document.body.classList.add("bases-open");
    el.open.setAttribute("aria-expanded", "true");
    var first = el.sheet.querySelector("select, button, input");
    if (first) first.focus();
  }

  function close() {
    el.sheet.hidden = true;
    el.scrim.hidden = true;
    document.body.classList.remove("bases-open");
    el.open.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function toggle() {
    if (el.sheet.hidden) open();
    else close();
  }

  function render(options) {
    if (!el.mode) return;
    el.mode.setAttribute("aria-pressed", String(!!config.dark));
    el.mode.title = config.dark ? "Switch to light mode" : "Switch to dark mode";
    el.mode.textContent = config.dark ? "☀" : "☾";
    el.swatch.style.background = rampFor(config)["600"];
    if (el.sheet.hidden) return;
    if (options && options.rebuild === false) {
      if (el.export) el.export.value = exportCss();
      return;
    }
    renderBody();
  }

  /* --------------------------------------------------------------- wire-up */

  function watchFrames() {
    var vars = computeVars(config);
    frames().forEach(function (frame) {
      if (frame.__dovetailWatched) return;
      frame.__dovetailWatched = true;
      frame.addEventListener("load", function () {
        applyTo(frame.contentDocument, config, context, computeVars(config));
      });
      applyTo(frame.contentDocument, config, context, vars);
    });
  }

  buildPanel();
  applyEverywhere();
  watchFrames();

  /* Cards load lazily, so new frames keep arriving after first paint. */
  if (window.MutationObserver) {
    new MutationObserver(watchFrames).observe(document.documentElement, { childList: true, subtree: true });
  }

  /* A save in the configurator card, or in another tab, is the same state. */
  window.addEventListener("storage", function (event) {
    if (event.key !== KEY && event.key !== CONTEXT_KEY) return;
    config = load();
    context = loadContext();
    applyEverywhere();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !el.sheet.hidden) close();
  });

  window.DovetailBasesPanel = { open: open, close: close, reset: reset, config: function () { return assign({}, config); } };
})();
