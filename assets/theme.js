/* The Configure panel: a floating toolbar and sheet that set the tokens a brand is
   allowed to touch, and show the result everywhere at once.

   State lives in one localStorage key, `dovetail-theme-config`, which is the
   key the system's own `templates/_support/theme-runtime.js` already reads.
   Using it rather than a second, site-only key is what makes a change reach
   the whole system: every page of this site, every preview card inside an
   iframe, the settings template, and the theme configurator
   card itself, which writes the same payload when you press Save there.

   The presets come from `assets/configure-data.js`, extracted from the
   configurator at build time, so the panel and the configurator can never
   drift apart. */

(function () {
  "use strict";

  /* The panel needs its presets, and the page that loaded us might be an old
     one out of a browser cache, asking for a data file under a name the build
     no longer writes. Rather than disappear, fetch the current data from our
     own directory and run this script again. Chrome without its controls is a
     worse failure than a slow first paint. */
  var DATA = window.DovetailConfigure;
  if (!DATA) {
    recover();
    return;
  }

  var KEY = "dovetail-theme-config";
  var CONTEXT_KEY = "dovetail-docs-context";
  var BRAND_KEY = "dovetail-docs-brand";
  var TAB_KEY = "dovetail-docs-tab";
  var CONTEXTS = ["dt-context-product", "dt-context-marketing", "dt-context-social"];
  var MARK_LIMIT = 512 * 1024;

  var DEFAULTS = {
    primary: "blue",
    primaryHex: "#3366cc",
    secondary: "violet",
    secondaryHex: "#8a4fd6",
    secondaryFont: "",
    steps: 0,
    wordmarkColor: "ink",
    headlineColor: "ink",
    markTint: false,
    radius: "standard",
    font: "sans",
    displayFont: "",
    codeFont: "mono",
    density: false,
    dark: false,
    mono: false,
    brandFill: "solid",
    texture: "none",
    baseUnit: 4,
    focusRing: 2,
    iconLib: "lucide",
    iconStroke: "authored",
    iconSize: "default",
    mediaRadius: "auto",
    whitespace: "balanced",
    media: "shown",
    customIconInclude: "",
  };

  /* The type roles a display face takes over: the ones that carry a page's
     voice. Body, label and code keep the text family, because a display face
     set at 14px is a legibility problem, not a brand. */
  var DISPLAY_ROLES = [
    "display-lg", "display-md", "display-sm",
    "heading-xl", "heading-lg", "heading-md", "heading-sm", "heading-xs",
  ];

  /* The roles the secondary face carries: the small UI voice of labels,
     buttons, badges, tabs and eyebrows. The stylesheet already points them at
     --dt-font-family-secondary; they are re-pointed here as well so a card that
     froze an older copy of the stylesheet follows too. */
  var SECONDARY_ROLES = ["label-lg", "label-md", "label-sm", "eyebrow"];

  var WORDMARK = {
    ink: null,
    primary: "var(--dt-text-brand, var(--dt-text-link))",
    secondary: "var(--dt-text-brand-secondary, var(--dt-color-secondary-700, var(--dt-text-link)))",
  };

  /* Every named ramp a hue shift can reach, independent of which one is
     currently chosen as the primary. Shifting green also retunes success,
     amber retunes warning, red retunes danger, and cyan retunes info, since
     those semantic roles point at a ramp by this same name. */
  var RAMP_KEYS = [
    { key: "blue", label: "Blue" },
    { key: "violet", label: "Violet" },
    { key: "green", label: "Green (success)" },
    { key: "amber", label: "Amber (warning)" },
    { key: "red", label: "Red (danger)" },
    { key: "cyan", label: "Cyan (info)" },
    { key: "terracotta", label: "Terracotta" },
  ];

  /* Icon sizes are real tokens, so a scale step is a re-pointing, not a hack.
     Each column is xs, sm, md, lg, xl in multiples of the base unit. */
  var ICON_SIZES = {
    small: [2, 3, 4, 5, 6],
    default: null,
    large: [4, 5, 6, 8, 10],
  };

  /* Whitespace is the three space axes and the page rhythm, re-pointed at other
     steps of the same dimension scale. Every value stays on the grid, which is
     the rule that makes the axes worth naming in the first place. Each list is
     2xs, xs, sm, md, lg, xl, 2xl as multiples of the base unit. */
  var WHITESPACE = {
    tight: {
      inset: [1, 1, 2, 3, 4, 6, 8],
      stack: [1, 1, 2, 3, 4, 8, 12],
      inline: [1, 1, 2, 3, 4, 6, 8],
      section: 16,
      gutter: 4,
    },
    balanced: null,
    airy: {
      inset: [2, 3, 4, 6, 8, 12, 16],
      stack: [2, 3, 4, 6, 8, 12, 20],
      inline: [2, 3, 4, 6, 8, 12, 16],
      section: 32,
      gutter: 10,
    },
  };
  var SPACE_STEPS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];

  /* How much of a layout imagery carries. Dovetail ships no photography, so its
     cards reserve a box rather than draw a picture, which is why this hides the
     reserved boxes and the placeholder frames as well as any real media. The
     override has to be !important: the components write display inline.

     There is no third, richer step. Nothing in the repository would fill it,
     and a control that claims to add imagery and cannot is worse than one fewer
     control. The media lab is where you bring your own. */
  var MEDIA_PRESENCE = {
    shown: null,
    hidden:
      'img, video, [style*="aspect-ratio"], [style*="dashed"] { display: none !important; }',
  };

  var MEDIA_RADII = {
    auto: null,
    square: "var(--dt-radius-raw-0)",
    media: "var(--dt-radius-raw-8)",
    overlay: "var(--dt-radius-raw-16)",
    pill: "var(--dt-radius-raw-full)",
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

  function loadBrand() {
    var brand;
    try {
      brand = JSON.parse(localStorage.getItem(BRAND_KEY));
    } catch (e) {
      brand = null;
    }
    return assign({ name: "", mark: "" }, brand || {});
  }

  var MEDIA_KEY = "dovetail-docs-media";
  var MEDIA_LIMIT = 768 * 1024;

  function loadMedia() {
    var media;
    try {
      media = JSON.parse(localStorage.getItem(MEDIA_KEY));
    } catch (e) {
      media = null;
    }
    return assign({ photo: "", illustration: "" }, media || {});
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

  /* ------------------------------------------------------------ colour math */

  /* sRGB and OKLCH, both ways, from Björn Ottosson's OKLab matrices. The
     panel needs all of it: a brand colour arrives as hex, the ramp is written
     in OKLCH, a step edited with a native picker comes back as hex, and
     contrast is measured on linear sRGB. */
  function srgbToLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function linearToSrgb(c) {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }

  function hexToOklch(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = srgbToLinear((n >> 16) & 255), g = srgbToLinear((n >> 8) & 255), b = srgbToLinear(n & 255);
    var l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    var A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    var B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
    var C = Math.sqrt(A * A + B * B);
    var H = Math.atan2(B, A) * 180 / Math.PI;
    if (H < 0) H += 360;
    return { L: L, C: C, H: C < 0.0005 ? 0 : H };
  }

  function hexToOklchHue(hex) {
    return hexToOklch(hex).H;
  }

  function oklchToLinear(L, C, H) {
    var a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
  }

  function inGamut(L, C, H) {
    return oklchToLinear(L, C, H).every(function (v) {
      return v >= -0.0005 && v <= 1.0005;
    });
  }

  /* The most chroma a lightness and hue can carry on an sRGB screen. */
  function clampChroma(L, C, H) {
    if (inGamut(L, C, H)) return C;
    var lo = 0, hi = C;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      if (inGamut(L, mid, H)) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /* A colour as the panel stores it: hex for anything a person typed or
     picked, OKLCH for anything the system derived. */
  function colorOf(value) {
    if (/^#[0-9a-f]{6}$/i.test(value)) return hexToOklch(value);
    var m = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(value || "");
    return m ? { L: +m[1], C: +m[2], H: +m[3] } : { L: 0, C: 0, H: 0 };
  }

  function fmtOklch(o) {
    return "oklch(" + o.L.toFixed(3) + " " + o.C.toFixed(3) + " " + o.H.toFixed(1) + ")";
  }

  function toHex(value) {
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
    var o = colorOf(value);
    return "#" + oklchToLinear(o.L, o.C, o.H).map(function (v) {
      var c = Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.min(1, Math.max(0, v))))) * 255);
      return (c < 16 ? "0" : "") + c.toString(16);
    }).join("");
  }

  function luminance(value) {
    var o = colorOf(value);
    var rgb = oklchToLinear(o.L, o.C, o.H).map(function (v) {
      return Math.min(1, Math.max(0, v));
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* ---------------------------------------------------------- brand ramps */

  /* Builds a ramp around a brand colour without changing it. The colour is
     placed, exactly as typed, at the step whose lightness is nearest its own.
     The steps lighter than it are spaced between it and the system's lightest
     step, the darker ones between it and the darkest, so the ramp keeps the
     system's rhythm and still passes through the brand. Every step takes the
     brand's hue. Chroma follows the system's curve, scaled to the brand's own
     saturation, and is reduced only where a step would fall outside what a
     screen can show; the panel lists those steps rather than hiding it. */
  function rampFromHex(hex) {
    var brand = hexToOklch(hex);
    var ref = DATA.steps.map(function (step) {
      return colorOf(DATA.ramps.blue[step]);
    });
    var last = ref.length - 1;
    var anchor = 0;
    ref.forEach(function (o, i) {
      if (Math.abs(o.L - brand.L) < Math.abs(ref[anchor].L - brand.L)) anchor = i;
    });
    var ratio = ref[anchor].C > 0 ? brand.C / ref[anchor].C : 0;
    var ramp = {};
    var reduced = [];
    ref.forEach(function (o, i) {
      var step = DATA.steps[i];
      if (i === anchor) {
        ramp[step] = hex.toLowerCase();
        return;
      }
      var end = i < anchor ? ref[0].L : ref[last].L;
      var span = ref[anchor].L - end;
      var L = span ? brand.L + ((o.L - ref[anchor].L) * (brand.L - end)) / span : o.L;
      var want = o.C * ratio;
      var C = clampChroma(L, want, brand.H);
      if (want - C > 0.01) reduced.push(step);
      ramp[step] = fmtOklch({ L: L, C: C, H: brand.H });
    });
    return { ramp: ramp, anchor: DATA.steps[anchor], reduced: reduced };
  }

  function rampWithHue(baseKey, hue) {
    var base = DATA.ramps[baseKey];
    var ramp = {};
    DATA.steps.forEach(function (step) {
      var o = colorOf(base[step]);
      ramp[step] = fmtOklch({ L: o.L, C: o.C, H: hue });
    });
    return ramp;
  }

  function customRamp(hex) {
    return rampFromHex(hex).ramp;
  }

  /* A named ramp with its hue override applied, if the brand has set one.
     This is how a hue shift on green (success) or red (danger) reaches those
     roles without touching the primary. */
  function baseRamp(cfg, key) {
    var hex = cfg.rampHues && cfg.rampHues[key];
    if (!hex || !DATA.ramps[key]) return DATA.ramps[key];
    return rampWithHue(key, hexToOklchHue(hex));
  }

  /* A brand slot, primary or secondary: the ramp it starts from, where the
     brand sits in it, and any steps the person edited by hand. Edits win over
     everything and are never adjusted behind their back. */
  function brandRamp(cfg, which) {
    var id = cfg[which];
    var base;
    if (id === "custom") {
      base = rampFromHex(cfg[which + "Hex"]);
    } else {
      var key = DATA.ramps[id] ? id : which === "primary" ? "blue" : "violet";
      base = { ramp: baseRamp(cfg, key), anchor: "600", reduced: [], named: key };
    }
    var edits = cfg[which + "Edits"] || {};
    var ramp = assign({}, base.ramp);
    Object.keys(edits).forEach(function (step) {
      if (ramp[step] && /^#[0-9a-f]{6}$/i.test(edits[step])) ramp[step] = edits[step].toLowerCase();
    });
    return { ramp: ramp, base: base.ramp, anchor: base.anchor, reduced: base.reduced, named: base.named, edits: edits };
  }

  function rampFor(cfg) {
    return brandRamp(cfg, "primary").ramp;
  }

  function secondaryRampFor(cfg) {
    return brandRamp(cfg, "secondary").ramp;
  }

  /* ---------------------------------------------------------- ramp steps */

  /* A brand can publish fewer steps than the system's eleven. The steps it
     keeps are spread evenly across the ramp, always including the lightest,
     the darkest, and the step the brand colour itself sits on, and every
     named step is then pointed at a kept one. The direction of that snap is
     what keeps contrast: a step at 500 or lighter is used as a light surface
     or as text on a dark one, so it only ever snaps lighter; a step at 600 or
     darker is used under light text or as text on a light surface, so it
     only ever snaps darker. What can be lost is a state: with few steps,
     hover and pressed may land on the same colour as rest. The panel says so
     when that happens. */
  function keptSteps(n, anchor) {
    var last = DATA.steps.length - 1;
    var kept = [];
    for (var i = 0; i < n; i++) {
      var idx = Math.round((i * last) / (n - 1));
      if (kept.indexOf(idx) === -1) kept.push(idx);
    }
    var a = anchor ? DATA.steps.indexOf(anchor) : -1;
    if (a > 0 && a < last && kept.indexOf(a) === -1) {
      var swap = -1;
      kept.forEach(function (k, j) {
        if (k === 0 || k === last) return;
        if (swap === -1 || Math.abs(k - a) < Math.abs(kept[swap] - a)) swap = j;
      });
      if (swap !== -1) kept[swap] = a;
      kept.sort(function (x, y) { return x - y; });
    }
    return kept;
  }

  function stepMap(n, anchor) {
    var steps = DATA.steps;
    if (!n || n >= steps.length) return steps.map(function (_, i) { return i; });
    var kept = keptSteps(n, anchor);
    var pivot = steps.indexOf("500");
    return steps.map(function (_, i) {
      if (kept.indexOf(i) !== -1) return i;
      var pick = null;
      kept.forEach(function (k) {
        if (i <= pivot ? k < i && (pick === null || k > pick) : k > i && (pick === null || k < pick)) pick = k;
      });
      return pick;
    });
  }

  function quantize(ramp, n, anchor) {
    var map = stepMap(n, anchor);
    var out = {};
    DATA.steps.forEach(function (step, i) {
      out[step] = ramp[DATA.steps[map[i]]];
    });
    return out;
  }

  /* Every chromatic ramp the configuration writes, final values: primary,
     secondary, and each named ramp once any hue shift or step count touches
     it. Neutral is left alone: it carries every surface, border and line of
     text, and a coarser neutral would merge them. */
  function brandRamps(cfg) {
    var n = Number(cfg.steps) || 0;
    var p = brandRamp(cfg, "primary");
    var s = brandRamp(cfg, "secondary");
    var q = function (r, anchor) { return n ? quantize(r, n, anchor) : r; };
    var out = { primary: q(p.ramp, p.anchor), secondary: q(s.ramp, s.anchor) };
    RAMP_KEYS.forEach(function (item) {
      var hue = cfg.rampHues && cfg.rampHues[item.key];
      if (hue || n) out[item.key] = q(baseRamp(cfg, item.key));
    });
    return out;
  }

  /* Which steps each ramp keeps, saved beside the theme so a ramp card can
     show exactly those without re-deriving the brand's anchor. */
  function keptMap(cfg) {
    var n = Number(cfg.steps) || 0;
    if (!n) return null;
    return {
      primary: keptSteps(n, brandRamp(cfg, "primary").anchor),
      secondary: keptSteps(n, brandRamp(cfg, "secondary").anchor),
      default: keptSteps(n),
    };
  }

  /* ------------------------------------------------------ contrast checks */

  /* The pairs each brand ramp is used in, measured on the colours that will
     actually ship. The system never moves a step to make one pass. When a
     pair fails, the panel says which one and by how much, and offers a fix
     the person has to press. */
  var WHITE = "oklch(1.000 0.000 0.0)";
  var INK = "oklch(0.145 0.005 264.0)";
  var CHECKS = {
    primary: [
      { label: "Buttons: white text on 600", fg: WHITE, bg: "600", min: 4.5, step: "600", dir: -1 },
      { label: "Button hover: white text on 700", fg: WHITE, bg: "700", min: 4.5, step: "700", dir: -1 },
      { label: "Links and brand text: 700 on the page", fg: "700", bg: WHITE, min: 4.5, step: "700", dir: -1 },
      { label: "Selected: 900 text on 050", fg: "900", bg: "050", min: 4.5, step: "900", dir: -1 },
      { label: "Focus ring: 600 against the page", fg: "600", bg: WHITE, min: 3, step: "600", dir: -1 },
      { label: "Dark mode buttons: ink text on 500", fg: INK, bg: "500", min: 4.5, step: "500", dir: 1 },
      { label: "Dark mode links and brand text: 400 on ink", fg: "400", bg: INK, min: 4.5, step: "400", dir: 1 },
    ],
    secondary: [
      { label: "Secondary fill: white text on 600", fg: WHITE, bg: "600", min: 4.5, step: "600", dir: -1 },
      { label: "Secondary text: 700 on the page", fg: "700", bg: WHITE, min: 4.5, step: "700", dir: -1 },
      { label: "Muted band: 900 text on 050", fg: "900", bg: "050", min: 4.5, step: "900", dir: -1 },
      { label: "Dark mode fill: ink text on 500", fg: INK, bg: "500", min: 4.5, step: "500", dir: 1 },
      { label: "Dark mode text: 400 on ink", fg: "400", bg: INK, min: 4.5, step: "400", dir: 1 },
    ],
  };

  function runChecks(cfg, which) {
    var n = Number(cfg.steps) || 0;
    var slot = brandRamp(cfg, which);
    var map = stepMap(n, slot.anchor);
    var shipped = n ? quantize(slot.ramp, n, slot.anchor) : slot.ramp;
    var at = function (v) { return shipped[v] || v; };
    return CHECKS[which].map(function (c) {
      var ratio = contrast(at(c.fg), at(c.bg));
      return {
        check: c,
        ratio: ratio,
        pass: ratio >= c.min,
        /* The step a fix would edit is the kept step the role lands on. */
        target: DATA.steps[map[DATA.steps.indexOf(c.step)]],
      };
    });
  }

  /* Moves one step's lightness, in the direction that helps, just far enough
     for its pair to pass. Hue and chroma are kept where the screen allows. */
  function fixFor(cfg, which, result) {
    var slot = brandRamp(cfg, which);
    var c = result.check;
    var start = colorOf(slot.ramp[result.target]);
    var other = c.fg === c.step ? c.bg : c.fg;
    var shipped = brandRamps(cfg)[which];
    var against = shipped[other] || other;
    for (var L = start.L; L >= 0.05 && L <= 0.99; L += c.dir * 0.004) {
      var C = clampChroma(L, start.C, start.H);
      var candidate = fmtOklch({ L: L, C: C, H: start.H });
      if (contrast(candidate, against) >= c.min + 0.05) return toHex(candidate);
    }
    return null;
  }

  /* The media lab ships two real icon sets; a third slot is a placeholder for
     whatever a brand already uses, described by hand rather than fetched at
     build time. */
  function iconLibInfo(key) {
    return (
      DATA.icons[key] || {
        label: "Custom",
        note: "Bring your own icon set.",
        licence: "your licence",
        stroke: 2,
        include: (config && config.customIconInclude) || "<!-- paste your icon import here -->",
      }
    );
  }

  function fontHrefFor(cfg) {
    var families = [];
    [DATA.fonts[cfg.font], DATA.fonts[cfg.displayFont], DATA.fonts[cfg.secondaryFont], DATA.fonts[cfg.codeFont]].forEach(function (f) {
      if (f && f.googleFont && families.indexOf(f.googleFont) === -1) families.push(f.googleFont);
    });
    if (!families.length) return null;
    return "https://fonts.googleapis.com/css2?family=" + families.join("&family=") + "&display=swap";
  }

  /* The full set of declarations a configuration produces. This is also what
     gets written to storage, so a page that only loads the system's theme
     runtime (the settings template, the kits) renders the same theme
     without knowing anything about this panel. */
  function computeVars(cfg) {
    var vars = {};
    /* Ramps are written as primitives, so every semantic role that points at
       one follows: actions and links at primary, the secondary brand fills at
       secondary, success at green, danger at red, warning at amber, info at
       cyan. A hue shift or a step count on a named ramp reaches its roles the
       same way, whichever ramp is currently the primary. */
    var ramps = brandRamps(cfg);
    Object.keys(ramps).forEach(function (key) {
      DATA.steps.forEach(function (step) {
        vars["--dt-color-" + key + "-" + step] = ramps[key][step];
      });
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

    /* A display face is a second family, not a second system. The system ships
       one sans and points every role at it; choosing a display face adds the
       family and re-points the roles that set a page's voice, leaving body,
       label and code where they are. Left empty, nothing is written and the
       whole page stays on one family, which is the system's own default. */
    var display = DATA.fonts[cfg.displayFont];
    if (display) {
      vars["--dt-font-family-display"] = display.value;
      DISPLAY_ROLES.forEach(function (role) {
        vars["--dt-text-" + role + "-family"] = "var(--dt-font-family-display)";
      });
    }

    var secondaryFace = DATA.fonts[cfg.secondaryFont];
    if (secondaryFace) {
      vars["--dt-font-family-secondary"] = secondaryFace.value;
      SECONDARY_ROLES.forEach(function (role) {
        vars["--dt-text-" + role + "-family"] = "var(--dt-font-family-secondary)";
      });
    }

    /* The name of a dimension token is its multiplier, so a different base unit
       is a re-derivation rather than an override list. */
    if (Number(cfg.baseUnit) !== 4) {
      DATA.dimSteps.forEach(function (step) {
        vars["--dt-dim-" + step] = step * Number(cfg.baseUnit) + "px";
      });
    }

    if (Number(cfg.focusRing) !== 2) vars["--dt-focus-ring-width"] = Number(cfg.focusRing) + "px";

    /* The site's own icons are drawn to the shared convention, so the library
       choice reaches them as a weight. Authored means "leave the system's cards
       alone", not "leave the chrome at 2px", so the library default applies
       here even then. */
    vars["--site-icon-stroke"] = String(
      cfg.iconStroke === "authored" ? iconLibInfo(cfg.iconLib).stroke : cfg.iconStroke
    );

    var sizes = ICON_SIZES[cfg.iconSize];
    if (sizes) {
      ["xs", "sm", "md", "lg", "xl"].forEach(function (name, i) {
        vars["--dt-size-icon-" + name] = "var(--dt-dim-" + sizes[i] + ")";
      });
    }

    /* Applied after the shape preset, which also sets the media role: the later
       declaration is the one the reader chose explicitly. */
    if (MEDIA_RADII[cfg.mediaRadius]) vars["--dt-radius-media"] = MEDIA_RADII[cfg.mediaRadius];

    if (cfg.iconStroke !== "authored") vars["--dt-icon-stroke-width"] = String(cfg.iconStroke);

    if (cfg.density) assign(vars, DATA.density);

    /* After density, which also moves some inset and stack steps: an explicit
       whitespace choice is the more specific of the two. */
    var space = WHITESPACE[cfg.whitespace];
    if (space) {
      ["inset", "stack", "inline"].forEach(function (axis) {
        SPACE_STEPS.forEach(function (step, i) {
          vars["--dt-space-" + axis + "-" + step] = "var(--dt-dim-" + space[axis][i] + ")";
        });
      });
      vars["--dt-space-section"] = "var(--dt-dim-" + space.section + ")";
      vars["--dt-space-gutter"] = "var(--dt-dim-" + space.gutter + ")";
    }

    /* --dt-surface-brand is one role either way; solid is the system default
       and needs nothing written, so only the gradient choice has to say
       anything. A component never sees which one it got. */
    if (cfg.brandFill === "gradient") vars["--dt-surface-brand"] = "var(--dt-surface-brand-gradient)";
    if (cfg.brandFill === "duotone") vars["--dt-surface-brand"] = "var(--dt-surface-brand-duotone)";

    /* Ink writes nothing: the wordmark role already points at the primary
       text colour, which is the monochrome mark. The fallbacks cover a card
       that froze a stylesheet from before the brand text roles existed. */
    if (WORDMARK[cfg.wordmarkColor]) vars["--dt-text-wordmark"] = WORDMARK[cfg.wordmarkColor];

    /* Headlines take the same three choices. Ink writes nothing, which is the
       stylesheet's own monochrome default. */
    if (WORDMARK[cfg.headlineColor]) vars["--dt-text-headline"] = WORDMARK[cfg.headlineColor];

    /* Same shape: a texture is a second role, --dt-surface-texture, pointed at
       one of the two patterns the system ships. None writes nothing, which is
       the stylesheet's own default. */
    if (cfg.texture && cfg.texture !== "none") vars["--dt-surface-texture"] = "var(--dt-pattern-" + cfg.texture + ")";

    /* The configurator previews the monochrome overrides but leaves them out of
       what it saves, so the preset could not survive a reload. They are carried
       here, and in the export, for the same reason every other choice is. Last,
       so a mono brand always reads as ink even with a gradient or a texture
       chosen. */
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

    /* Icons in the system are inline SVGs with their stroke width written into
       the markup. A stylesheet is the only way to retune them all at once, and
       it is only injected once a reader asks for something other than what was
       authored. */
    var rule = doc.getElementById("dt-icon-stroke");
    if (cfg.iconStroke === "authored") {
      if (rule) rule.remove();
    } else {
      if (!rule) {
        rule = doc.createElement("style");
        rule.id = "dt-icon-stroke";
        doc.head.appendChild(rule);
      }
      rule.textContent =
        'svg[stroke]:not([stroke="none"]) { stroke-width: var(--dt-icon-stroke-width); ' +
        "stroke-linecap: round; stroke-linejoin: round; }";
    }

    var media = doc.getElementById("dt-media-presence");
    if (!MEDIA_PRESENCE[cfg.media]) {
      if (media) media.remove();
    } else {
      if (!media) {
        media = doc.createElement("style");
        media.id = "dt-media-presence";
        doc.head.appendChild(media);
      }
      media.textContent = MEDIA_PRESENCE[cfg.media];
    }

    /* A role written inline on the root resolves once, against the root. A
       band scoped .dark inside the page needs the same choice declared on the
       band, so its brand text role resolves as dark. */
    var scoped = ["--dt-text-wordmark", "--dt-text-headline"].filter(function (name) { return vars[name]; });
    var scope = doc.getElementById("dt-role-scope");
    if (!scoped.length) {
      if (scope) scope.remove();
    } else {
      if (!scope) {
        scope = doc.createElement("style");
        scope.id = "dt-role-scope";
        doc.head.appendChild(scope);
      }
      scope.textContent = ".dark { " + scoped.map(function (name) { return name + ": " + vars[name] + ";"; }).join(" ") + " }";
    }

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
  var brand = loadBrand();
  var media = loadMedia();
  var activeTab = (function () {
    try {
      return localStorage.getItem(TAB_KEY) || "brand";
    } catch (e) {
      return "brand";
    }
  })();

  function applyEverywhere(options) {
    var vars = computeVars(config);
    applyTo(document, config, context, vars);
    frames().forEach(function (frame) {
      applyTo(frame.contentDocument, config, context, vars);
    });
    applyBrand();
    render(options);
  }

  /* The wordmark is the one piece of brand the system does ship, and it is set
     in type rather than drawn. A name and an optional mark are all it takes. */
  var AUTHORED_TITLE = document.title;

  function applyBrand() {
    var name = brand.name || "Dovetail";

    var text = document.querySelector(".wordmark-text");
    if (text) text.textContent = name;

    var mark = document.querySelector(".wordmark-mark");
    if (mark) {
      if (brand.mark) {
        mark.src = brand.mark;
        mark.hidden = false;
      } else {
        mark.removeAttribute("src");
        mark.hidden = true;
      }

      /* A tinted mark is the uploaded file used as a mask over the wordmark's
         own colour, so it follows ink, primary or secondary with the name and
         flips with dark mode. The shape is the brand's; the colour is the
         system's. */
      var tint = mark.parentNode.querySelector(".wordmark-mark-tint");
      if (brand.mark && config.markTint) {
        if (!tint) {
          tint = document.createElement("span");
          tint.className = "wordmark-mark-tint";
          tint.setAttribute("aria-hidden", "true");
          mark.parentNode.insertBefore(tint, mark);
        }
        var url = 'url("' + brand.mark.replace(/"/g, "%22") + '")';
        tint.style.webkitMaskImage = url;
        tint.style.maskImage = url;
        /* The box takes the file's own proportions once it has loaded, so a
           wide logotype stays wide. */
        var ratio = function () {
          if (mark.naturalWidth && mark.naturalHeight) tint.style.aspectRatio = mark.naturalWidth + " / " + mark.naturalHeight;
        };
        ratio();
        mark.onload = ratio;
        mark.hidden = true;
      } else if (tint) {
        tint.remove();
      }
    }

    /* The first crumb is the wordmark as a link, so it carries the name too.
       Everything below it is page content and stays as it was written. */
    var crumb = document.querySelector(".crumbs li:first-child a");
    if (crumb) crumb.textContent = name;

    /* Re-derived from the authored title each time, so clearing the name puts
       the original back without a reload. */
    document.title = AUTHORED_TITLE.replace(/Dovetail/g, name);
  }

  function setBrand(patch) {
    assign(brand, patch);
    if (!brand.name && !brand.mark) store(BRAND_KEY, null);
    else store(BRAND_KEY, JSON.stringify(brand));
    applyBrand();
    render();
  }

  /* Photography and illustration are kept separate from the brand mark: the
     mark is a small wordmark companion read by the chrome on every page,
     while these are content a template composes into a layout, and a reader
     may want one without the other. Held in the same localStorage origin a
     template's own iframe already shares, so a template card picks up a new
     upload from the native "storage" event without any message-passing of
     its own. */
  function setMedia(patch) {
    assign(media, patch);
    if (!media.photo && !media.illustration) store(MEDIA_KEY, null);
    else store(MEDIA_KEY, JSON.stringify(media));
    render();
  }

  function commit(patch, options) {
    assign(config, patch || {});
    store(KEY, JSON.stringify(assign(assign({}, config), {
      vars: computeVars(config),
      fontHref: fontHrefFor(config),
      kept: keptMap(config),
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
    brand = { name: "", mark: "" };
    media = { photo: "", illustration: "" };
    store(KEY, null);
    store(BRAND_KEY, null);
    store(MEDIA_KEY, null);
    setContext("");
    window.dispatchEvent(new Event("dovetail:theme-change"));
  }

  /* --------------------------------------------------------------- the CSS */

  function exportCss() {
    var ramps = brandRamps(config);
    var radius = DATA.radii[config.radius];
    var ui = DATA.fonts[config.font];
    var code = DATA.fonts[config.codeFont];
    var n = Number(config.steps) || 0;
    var lines = [];
    var rampLines = function (key, title) {
      lines.push("  /* " + title + " */");
      DATA.steps.forEach(function (step) {
        lines.push("  --dt-color-" + key + "-" + step + ": " + ramps[key][step] + ";");
      });
    };

    lines.push("/* A theme is a file of token overrides. Nothing below names a component. */");
    lines.push(":root {");
    if (n) {
      lines.push("  /* Steps: " + n + " per ramp. Primary keeps " + keptSteps(n, brandRamp(config, "primary").anchor).map(function (i) { return DATA.steps[i]; }).join(", ") + ".");
      lines.push("     Every named step still exists and points at a kept one, lighter steps");
      lines.push("     snapping lighter and darker steps darker, so no pair loses contrast. */");
      lines.push("");
    }
    var editNote = function (which) {
      var slot = brandRamp(config, which);
      var bits = [];
      if (config[which] === "custom") bits.push("your colour at step " + slot.anchor);
      var edited = Object.keys(slot.edits || {});
      if (edited.length) bits.push("edited by hand at " + edited.sort().join(", "));
      return bits.length ? ", " + bits.join(", ") : "";
    };
    rampLines("primary", "Primary: " + brandLabel(config.primary, config.primaryHex) + editNote("primary"));
    lines.push("");
    rampLines("secondary", "Secondary: " + brandLabel(config.secondary, config.secondaryHex) + editNote("secondary"));

    var named = RAMP_KEYS.filter(function (item) { return ramps[item.key]; });
    if (named.length) {
      lines.push("");
      lines.push("  /* Named ramps" + (Object.keys(config.rampHues || {}).some(function (k) { return config.rampHues[k]; }) ? ", with the brand's hue shifts. Lightness and chroma per step are unchanged." : ".") + " */");
      named.forEach(function (item) {
        DATA.steps.forEach(function (step) {
          lines.push("  --dt-color-" + item.key + "-" + step + ": " + ramps[item.key][step] + ";");
        });
      });
    }

    lines.push("");
    lines.push("  /* Shape: " + radius.label + " */");
    lines.push("  --dt-radius-control: " + radius.control + ";");
    lines.push("  --dt-radius-container: " + radius.container + ";");
    lines.push("  --dt-radius-overlay: " + radius.overlay + ";");
    lines.push("  --dt-radius-media: " + radius.media + ";");
    lines.push("  --dt-radius-pill: " + radius.pill + ";");
    lines.push("");
    var display = DATA.fonts[config.displayFont];
    var secondaryFace = DATA.fonts[config.secondaryFont];
    lines.push("  /* Type: " + ui.label + ", " + code.label + (display ? ", " + display.label + " for display" : "") + (secondaryFace ? ", " + secondaryFace.label + " as the secondary face" : "") + " */");
    lines.push("  --dt-font-family-sans: " + ui.value + ";");
    lines.push("  --dt-font-family-mono: " + code.value + ";");
    if (secondaryFace) {
      lines.push("  --dt-font-family-secondary: " + secondaryFace.value + ";");
      SECONDARY_ROLES.forEach(function (role) {
        lines.push("  --dt-text-" + role + "-family: var(--dt-font-family-secondary);");
      });
    }
    if (display) {
      lines.push("  --dt-font-family-display: " + display.value + ";");
      DISPLAY_ROLES.forEach(function (role) {
        lines.push("  --dt-text-" + role + "-family: var(--dt-font-family-display);");
      });
    }

    if (config.brandFill === "gradient" || config.brandFill === "duotone") {
      lines.push("");
      lines.push("  /* Fill: " + config.brandFill + " */");
      lines.push("  --dt-surface-brand: var(--dt-surface-brand-" + config.brandFill + ");");
    }

    if (config.texture && config.texture !== "none") {
      lines.push("");
      lines.push("  /* Texture: " + config.texture + " */");
      lines.push("  --dt-surface-texture: var(--dt-pattern-" + config.texture + ");");
    }

    if (config.density) {
      lines.push("");
      lines.push("  /* Density: compact */");
      Object.keys(DATA.density).forEach(function (name) {
        lines.push("  " + name + ": " + DATA.density[name] + ";");
      });
    }
    if (config.mono) {
      lines.push("");
      lines.push("  /* Monochrome: action surfaces read as ink, not colour */");
      Object.keys(DATA.monochrome).forEach(function (name) {
        lines.push("  " + name + ": " + DATA.monochrome[name] + ";");
      });
    }

    if (Number(config.baseUnit) !== 4) {
      lines.push("");
      lines.push("  /* Space: " + config.baseUnit + "px base unit. The number in each name is still the multiplier. */");
      DATA.dimSteps.forEach(function (step) {
        lines.push("  --dt-dim-" + step + ": " + step * Number(config.baseUnit) + "px;");
      });
    }

    if (Number(config.focusRing) !== 2) {
      lines.push("");
      lines.push("  /* Focus */");
      lines.push("  --dt-focus-ring-width: " + Number(config.focusRing) + "px;");
    }

    var sizes = ICON_SIZES[config.iconSize];
    if (sizes) {
      lines.push("");
      lines.push("  /* Icon sizes: " + config.iconSize + " */");
      ["xs", "sm", "md", "lg", "xl"].forEach(function (name, i) {
        lines.push("  --dt-size-icon-" + name + ": var(--dt-dim-" + sizes[i] + ");");
      });
    }

    var space = WHITESPACE[config.whitespace];
    if (space) {
      lines.push("");
      lines.push("  /* Whitespace: " + config.whitespace + " */");
      ["inset", "stack", "inline"].forEach(function (axis) {
        SPACE_STEPS.forEach(function (step, i) {
          lines.push("  --dt-space-" + axis + "-" + step + ": var(--dt-dim-" + space[axis][i] + ");");
        });
      });
      lines.push("  --dt-space-section: var(--dt-dim-" + space.section + ");");
      lines.push("  --dt-space-gutter: var(--dt-dim-" + space.gutter + ");");
    }

    if (WORDMARK[config.headlineColor]) {
      lines.push("");
      lines.push("  /* Headlines: " + config.headlineColor + " */");
      lines.push("  --dt-text-headline: " + WORDMARK[config.headlineColor].replace(/, var\(.*\)\)$/, ")") + ";");
    }

    if (WORDMARK[config.wordmarkColor]) {
      lines.push("");
      lines.push("  /* Wordmark: " + config.wordmarkColor + " */");
      lines.push("  --dt-text-wordmark: " + WORDMARK[config.wordmarkColor].replace(/, var\(.*\)\)$/, ")") + ";");
    }

    if (MEDIA_RADII[config.mediaRadius]) {
      lines.push("");
      lines.push("  /* Imagery */");
      lines.push("  --dt-radius-media: " + MEDIA_RADII[config.mediaRadius] + ";");
    }

    lines.push("}");

    /* The same role choices again under .dark, so a band scoped dark inside a
       light page resolves them against its own brand text roles. */
    var darkRoles = [["--dt-text-headline", config.headlineColor], ["--dt-text-wordmark", config.wordmarkColor]].filter(function (r) { return WORDMARK[r[1]]; });
    if (darkRoles.length) {
      lines.push("");
      lines.push(".dark {");
      darkRoles.forEach(function (r) {
        lines.push("  " + r[0] + ": " + WORDMARK[r[1]].replace(/, var\(.*\)\)$/, ")") + ";");
      });
      lines.push("}");
    }

    var lib = iconLibInfo(config.iconLib);
    lines.push("");
    lines.push("/* Iconography: " + lib.label + ", " + lib.licence + ".");
    lines.push("   The system ships no icon set. Load one and size it from --dt-size-icon-*;");
    lines.push("   icons inherit text colour and are never given their own.");
    lines.push("     " + lib.include);
    if (config.iconStroke !== "authored") {
      lines.push("   Drawn at " + config.iconStroke + "px stroke, round caps and joins. */");
    } else {
      lines.push("   Drawn at the stroke width each icon ships with. */");
    }

    if (config.media !== "shown") {
      lines.push("");
      lines.push("/* Media blocks hidden. A way of reading the layout, not a token: how much");
      lines.push("   imagery a screen carries is a content decision, and components take");
      lines.push("   content as props. */");
    }

    if (brand.name || brand.mark) {
      lines.push("");
      lines.push("/* Brand: the wordmark is the name set in the sans family at");
      lines.push("   --dt-font-weight-semibold with --dt-tracking-tight.");
      lines.push("     Name: " + (brand.name || "Dovetail"));
      lines.push("     Colour: " + (config.wordmarkColor === "ink" ? "ink (--dt-text-primary)" : config.wordmarkColor + ", set in the :root block above"));
      if (brand.mark) lines.push("     Mark: supplied as a file; it is not a token and does not belong in this sheet.");
      lines.push(" */");
    }

    return lines.join("\n");
  }

  function brandLabel(id, hex) {
    if (id === "custom") return "Custom (" + hex + ")";
    var hit = DATA.brandRamps.filter(function (r) {
      return r.id === id;
    })[0];
    return hit ? hit.label : id;
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
    var parts = [h("span", { class: "configure-label", text: label })];
    if (hint) parts.push(h("span", { class: "configure-hint", text: hint }));
    parts.push(control);
    return h("div", { class: "configure-field" }, parts);
  }

  function segmented(name, bid, options, current, onPick) {
    return h(
      "div",
      { class: "configure-seg", role: "group", "aria-label": name },
      options.map(function (option) {
        return h("button", {
          type: "button",
          class: "configure-seg-btn",
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
        class: "configure-select",
        "data-bid": bid,
        "aria-label": name,
        onchange: function () {
          onPick(node.value);
        },
      },
      /* A list of twenty-two families needs its groups: the data arrives
         either flat or as { group, options }, and both render here. */
      options.map(function (option) {
        if (!option.options) return h("option", { value: option.value, text: option.label });
        return h(
          "optgroup",
          { label: option.group },
          option.options.map(function (inner) {
            return h("option", { value: inner.value, text: inner.label });
          })
        );
      })
    );
    node.value = current;
    return node;
  }

  function buildPanel() {
    el.toolbar = h("div", { class: "configure-bar", role: "group", "aria-label": "Configure the system" }, [
      (el.mode = h("button", {
        type: "button",
        class: "configure-icon-btn",
        title: "Toggle dark mode",
        "aria-pressed": "false",
        onclick: function () {
          commit({ dark: !config.dark });
        },
      })),
      (el.open = h("button", {
        type: "button",
        class: "configure-open-btn",
        "aria-expanded": "false",
        "aria-controls": "configure-sheet",
        onclick: toggle,
      })),
    ]);

    el.swatch = h("span", { class: "configure-swatch", "aria-hidden": "true" });
    el.openLabel = h("span", { text: "Configure" });
    el.open.appendChild(el.swatch);
    el.open.appendChild(el.openLabel);

    el.sheet = h("aside", {
      id: "configure-sheet",
      class: "configure-sheet",
      role: "dialog",
      "aria-labelledby": "configure-title",
      hidden: true,
    });

    el.body = h("div", { class: "configure-body" });

    el.sheet.appendChild(
      h("header", { class: "configure-head" }, [
        h("div", {}, [
          h("h2", { id: "configure-title", text: "Configure" }),
          h("p", {
            class: "configure-sub",
            text: "The tokens a brand is allowed to touch. Every change applies to this page, every other page, and every live card on them.",
          }),
        ]),
        h("div", { class: "configure-head-actions" }, [
          h("button", {
            type: "button",
            class: "configure-reset-btn",
            "data-bid": "reset",
            text: "Reset",
            onclick: reset,
          }),
          h("button", { type: "button", class: "configure-close", "aria-label": "Close", text: "×", onclick: close }),
        ]),
      ])
    );
    el.sheet.appendChild(el.body);

    document.body.appendChild(el.toolbar);
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

  function textInput(label, bid, value, onCommit) {
    var node = h("input", {
      type: "text",
      class: "configure-text",
      "data-bid": bid,
      "aria-label": label,
      value: value,
      placeholder: "Dovetail",
      oninput: function () {
        onCommit(node.value);
      },
    });
    return node;
  }

  /* ------------------------------------------------------------- the tabs */

  /* Seven groups is more than one column should carry at once, so each is a
     tab. The theme preset stays above them because it sets several at a time. */
  var TABS = [
    { id: "brand", label: "Brand", fields: brandFields },
    { id: "shape", label: "Shape", fields: shapeFields },
    { id: "type", label: "Type", fields: typeFields },
    { id: "space", label: "Space", fields: spaceFields },
    { id: "media", label: "Media", fields: mediaFields },
    { id: "view", label: "View", fields: viewFields },
    { id: "export", label: "Export", fields: exportFields },
  ];

  function brandFields() {
    var out = [];

    out.push(
      field(
        "Name",
        "Dovetail ships no logo. The wordmark is the name, set in the sans family.",
        textInput("Name", "brand-name", brand.name, function (value) {
          setBrand({ name: value });
        })
      )
    );

    var markFile = h("input", {
      type: "file",
      accept: "image/*",
      class: "configure-file",
      "data-bid": "brand-mark",
      "aria-label": "Brand mark image",
      onchange: function (event) {
        readMark(event.target.files[0]);
        event.target.value = "";
      },
    });

    var drop = h(
      "label",
      {
        class: "configure-drop",
        ondragover: function (event) {
          event.preventDefault();
          drop.setAttribute("data-over", "");
        },
        ondragleave: function () {
          drop.removeAttribute("data-over");
        },
        ondrop: function (event) {
          event.preventDefault();
          drop.removeAttribute("data-over");
          readMark(event.dataTransfer.files[0]);
        },
      },
      [h("span", { text: brand.mark ? "Replace the mark" : "Drop a mark, or choose a file" }), markFile]
    );

    var markRow = [drop];
    if (brand.mark) {
      markRow.push(
        h("div", { class: "configure-mark-row" }, [
          h("img", { class: "configure-mark", src: brand.mark, alt: "" }),
          h("button", {
            type: "button",
            class: "configure-btn",
            "data-bid": "brand-mark-remove",
            text: "Remove mark",
            onclick: function () {
              setBrand({ mark: "" });
            },
          }),
        ])
      );
    }
    if (el.markError) markRow.push(h("p", { class: "configure-bad", role: "alert", text: el.markError }));

    out.push(field("Mark", "Shown beside the name in the header of every page. SVG or PNG, up to 512KB.", h("div", { class: "configure-stack" }, markRow)));

    out.push(
      field(
        "Wordmark colour",
        "Ink is the monochrome wordmark. Primary and secondary set the name in a brand hue, through --dt-text-wordmark, at text contrast in either mode.",
        segmented(
          "Wordmark colour",
          "wordmark",
          [{ value: "ink", label: "Ink" }, { value: "primary", label: "Primary" }, { value: "secondary", label: "Secondary" }],
          config.wordmarkColor,
          function (value) {
            commit({ wordmarkColor: value });
          }
        )
      )
    );

    if (brand.mark) {
      out.push(
        field(
          "Mark colour",
          "Original keeps the file's own colours. Match wordmark uses its shape only, filled with the wordmark colour, so it goes monochrome with Ink and flips with dark mode.",
          segmented("Mark colour", "marktint", [{ value: "original", label: "Original" }, { value: "match", label: "Match wordmark" }], config.markTint ? "match" : "original", function (value) {
            commit({ markTint: value === "match" });
          })
        )
      );
    }

    out.push(field("Primary", "Actions, links, selection and focus. Start from a tuned ramp, or give your exact brand colour and the ramp is built around it.", brandField("primary")));
    out.push(field("Secondary", "A second brand hue for fills and highlights beside the primary: --dt-surface-brand-secondary, the duotone fill, and the second chart colour. It never drives an action.", brandField("secondary")));

    out.push(
      field(
        "Monochrome",
        "Drops the brand hue from action surfaces. Feedback colours stay chromatic.",
        segmented("Monochrome", "mono", [{ value: "off", label: "Off" }, { value: "on", label: "On" }], config.mono ? "on" : "off", function (value) {
          commit({ mono: value === "on" });
        })
      )
    );

    out.push(
      field(
        "Fill",
        "Sets --dt-surface-brand for a full-bleed section. Solid is one step of the primary; gradient sweeps two; duotone sweeps primary into secondary.",
        segmented(
          "Fill",
          "brandFill",
          [{ value: "solid", label: "Solid" }, { value: "gradient", label: "Gradient" }, { value: "duotone", label: "Duotone" }],
          config.brandFill,
          function (value) {
            commit({ brandFill: value });
          }
        )
      )
    );

    out.push(
      field(
        "Texture",
        "A dot or line grid behind a full-bleed section, in the border-strength colour so it never fights the fill. Sets --dt-surface-texture.",
        segmented(
          "Texture",
          "texture",
          [{ value: "none", label: "None" }, { value: "dots", label: "Dots" }, { value: "grid", label: "Grid" }],
          config.texture,
          function (value) {
            commit({ texture: value });
          }
        )
      )
    );

    out.push(
      field(
        "Ramp hues",
        "Shift a status or spare ramp toward your brand. Only the hue of what you pick is used: each step keeps its own lightness and chroma, so success, warning, danger and info keep the contrast they were tested at. The row says which hue it took.",
        h(
          "div",
          { class: "configure-ramphue-list" },
          RAMP_KEYS.map(function (item) {
            return rampHueRow(item.key, item.label);
          })
        )
      )
    );

    out.push(stepsField());

    return out;
  }

  /* One picker for either brand ramp: the named ramps as swatches, and a
     native colour input for a custom hue. */
  function setBrandColor(which, patch, options) {
    /* A new brand colour starts a fresh ramp: edits made against the old one
       would no longer mean what they meant. The panel says so beside them. */
    patch[which + "Edits"] = {};
    el.fixNote = el.fixNote || {};
    el.fixNote[which] = null;
    commit(patch, options);
  }

  function brandField(which) {
    var hexKey = which + "Hex";
    var slot = brandRamp(config, which);
    var custom = config[which] === "custom";

    var swatches = DATA.brandRamps.map(function (ramp) {
      return h("button", {
        type: "button",
        class: "configure-swatch-btn",
        "data-bid": which + ":" + ramp.id,
        style: "background:" + baseRamp(config, ramp.id)["600"],
        title: ramp.label,
        "aria-label": ramp.label,
        "aria-pressed": String(config[which] === ramp.id),
        onclick: function () {
          var patch = {};
          patch[which] = ramp.id;
          setBrandColor(which, patch);
        },
      });
    });
    var pick = function (value, options) {
      var patch = {};
      patch[which] = "custom";
      patch[hexKey] = value.toLowerCase();
      setBrandColor(which, patch, options);
    };
    var picker = h("input", {
      type: "color",
      class: "configure-color",
      "data-bid": which + ":custom",
      value: custom ? config[hexKey] : toHex(slot.ramp["600"]),
      "aria-label": "Pick a " + which + " colour",
      /* Dragging in the picker fires input continuously. Rebuilding the body
         on each event would replace the open control, so the live pass leaves
         the markup alone and change does the full rebuild at the end. */
      oninput: function (event) {
        pick(event.target.value, { rebuild: false });
      },
      onchange: function (event) {
        pick(event.target.value);
      },
    });
    swatches.push(h("span", { class: "configure-swatch-btn configure-swatch-custom", style: custom ? "background:" + config[hexKey] : null, "aria-pressed": String(custom), title: "Your own colour" }, [picker]));

    var hexInput = h("input", {
      type: "text",
      class: "configure-text configure-hex",
      "data-bid": which + ":hex",
      "aria-label": "Brand " + which + " colour as hex",
      value: custom ? config[hexKey] : "",
      placeholder: "#ff6a00",
      spellcheck: "false",
      onchange: function () {
        var v = hexInput.value.trim();
        if (v.charAt(0) !== "#") v = "#" + v;
        if (/^#[0-9a-f]{3}$/i.test(v)) v = "#" + v.slice(1).split("").map(function (c) { return c + c; }).join("");
        if (!/^#[0-9a-f]{6}$/i.test(v)) {
          el.hexError = el.hexError || {};
          el.hexError[which] = "Enter a six-digit hex colour, like #ff6a00.";
          renderBody();
          return;
        }
        if (el.hexError) el.hexError[which] = null;
        pick(v);
      },
    });

    var parts = [
      h("div", { class: "configure-swatches" }, swatches),
      h("div", { class: "configure-hex-row" }, [h("span", { class: "configure-hint", text: "Your exact colour" }), hexInput]),
    ];
    if (el.hexError && el.hexError[which]) parts.push(h("p", { class: "configure-bad", role: "alert", text: el.hexError[which] }));
    parts.push(rampEditor(which, slot));
    return h("div", { class: "configure-stack" }, parts);
  }

  /* The ramp itself, one editable swatch per published step. Nothing here
     changes a colour on its own: the brand colour sits where the explanation
     says, an edited step keeps exactly what was picked, and a failing pair is
     reported with a fix the person chooses to apply. */
  function rampEditor(which, slot) {
    var n = Number(config.steps) || 0;
    var kept = n ? keptSteps(n, slot.anchor) : DATA.steps.map(function (_, i) { return i; });
    var edits = slot.edits || {};
    var editKey = which + "Edits";
    var custom = config[which] === "custom";

    var setStep = function (step, hex, options) {
      var next = assign({}, config[editKey] || {});
      next[step] = hex.toLowerCase();
      var patch = {};
      patch[editKey] = next;
      el.fixNote = el.fixNote || {};
      el.fixNote[which] = null;
      commit(patch, options);
    };

    var chips = kept.map(function (i) {
      var step = DATA.steps[i];
      var value = slot.ramp[step];
      var isAnchor = step === slot.anchor;
      var isEdited = !!edits[step];
      var input = h("input", {
        type: "color",
        class: "configure-color",
        "data-bid": "ramp:" + which + ":" + step,
        value: toHex(value),
        "aria-label": which + " step " + step,
        oninput: function (event) { setStep(step, event.target.value, { rebuild: false }); },
        onchange: function (event) { setStep(step, event.target.value); },
      });
      var tag = isEdited ? "edited" : isAnchor && custom ? "yours" : isAnchor ? "base" : "";
      return h("label", { class: "configure-ramp-chip", "data-anchor": isAnchor ? "" : null, "data-edited": isEdited ? "" : null, title: step + ": " + toHex(value) }, [
        h("span", { class: "configure-ramp-swatch", style: "background:" + value }, [input]),
        h("span", { class: "configure-ramp-step", text: step }),
        h("span", { class: "configure-ramp-tag", text: tag }),
      ]);
    });

    var parts = [h("div", { class: "configure-ramp", style: "grid-template-columns:repeat(" + kept.length + ", minmax(0, 1fr))" }, chips)];

    var why;
    if (custom) {
      why = "Your colour " + config[which + "Hex"] + " is step " + slot.anchor + ", the step nearest it in lightness, and it is used exactly as you typed it. " +
        "The other steps are spaced lighter and darker from it in its hue, following the system's lightness rhythm.";
      if (slot.reduced && slot.reduced.length) why += " Chroma is lower than your colour's at " + slot.reduced.join(", ") + ", because a screen cannot show that saturation at that lightness.";
    } else {
      var label = (DATA.brandRamps.filter(function (r) { return r.id === config[which]; })[0] || {}).label || config[which];
      why = label + " is one of the system's tuned ramps. " + (which === "primary" ? "Buttons use step 600, links 700." : "Secondary fills use step 600, secondary text 700.") + " Type or pick your own colour above to build the ramp around it.";
    }
    why += " Click any step to change it by hand.";
    parts.push(h("p", { class: "configure-note", text: why }));

    var editedSteps = Object.keys(edits);
    if (editedSteps.length) {
      parts.push(
        h("div", { class: "configure-mark-row" }, [
          h("p", { class: "configure-note", text: "Edited by hand: " + editedSteps.sort().join(", ") + ". Choosing another colour starts a fresh ramp." }),
          h("button", {
            type: "button",
            class: "configure-btn-mini",
            "data-bid": which + ":clear-edits",
            text: "Undo edits",
            onclick: function () {
              var patch = {};
              patch[editKey] = {};
              if (el.fixNote) el.fixNote[which] = null;
              commit(patch);
            },
          }),
        ])
      );
    }

    if (el.fixNote && el.fixNote[which]) parts.push(h("p", { class: "configure-note configure-good", role: "status", text: el.fixNote[which] }));

    var results = runChecks(config, which);
    var failing = results.filter(function (r) { return !r.pass; });
    var list = h(
      "ul",
      { class: "configure-checks" },
      results.map(function (r) {
        var row = [
          h("span", { class: "configure-check-mark", "aria-hidden": "true", text: r.pass ? "✓" : "!" }),
          h("span", { class: "configure-check-label", text: r.check.label }),
          h("span", { class: "configure-check-ratio", text: r.ratio.toFixed(2) + ":1" }),
        ];
        if (!r.pass) {
          row.push(
            h("button", {
              type: "button",
              class: "configure-btn-mini",
              "data-bid": which + ":fix:" + r.check.label,
              text: (r.check.dir < 0 ? "Darken " : "Lighten ") + r.target,
              onclick: function () {
                var hex = fixFor(config, which, r);
                if (!hex) return;
                var before = toHex(brandRamp(config, which).ramp[r.target]);
                var next = assign({}, config[editKey] || {});
                next[r.target] = hex;
                var patch = {};
                patch[editKey] = next;
                commit(patch);
                var after = runChecks(config, which).filter(function (x) { return x.check.label === r.check.label; })[0];
                el.fixNote = el.fixNote || {};
                el.fixNote[which] = "Step " + r.target + " " + (r.check.dir < 0 ? "darkened" : "lightened") + " from " + before + " to " + hex + " so " + r.check.label.split(":")[0].toLowerCase() + " reach " + after.ratio.toFixed(2) + ":1. Undo edits puts it back.";
                renderBody();
              },
            })
          );
        }
        return h("li", { class: r.pass ? "is-pass" : "is-fail" }, row);
      })
    );
    parts.push(
      h("details", { class: "configure-checks-wrap", open: failing.length ? true : null }, [
        h("summary", { text: failing.length ? failing.length + " of " + results.length + " pairs below WCAG AA" : "All " + results.length + " pairs pass WCAG AA" }),
        list,
      ])
    );

    return h("div", { class: "configure-stack" }, parts);
  }

  function stepsField() {
    var n = Number(config.steps) || 0;
    var options = [{ value: "0", label: "All 11 (as shipped)" }];
    for (var i = 10; i >= 4; i--) options.push({ value: String(i), label: i + " steps" });

    var anchor = brandRamp(config, "primary").anchor;
    var map = stepMap(n, anchor);
    var at = function (step) { return map[DATA.steps.indexOf(step)]; };
    var parts = [
      select("Steps per ramp", "steps", options, String(n), function (value) {
        commit({ steps: Number(value) });
      }),
    ];
    if (n) {
      parts.push(h("p", { class: "configure-note", text: "Primary keeps " + keptSteps(n, anchor).map(function (i) { return DATA.steps[i]; }).join(", ") + ", always including the step your colour sits on. Every other step points at the nearest kept one in the direction that keeps its contrast." }));
      var restMerged = at("600") === at("700") || at("700") === at("800");
      if (restMerged) parts.push(h("p", { class: "configure-bad", role: "status", text: "At " + n + " steps, a button's hover or pressed colour lands on the same step as its resting colour. Text contrast still holds." }));
      parts.push(
        h(
          "div",
          { class: "configure-steps-preview", "aria-hidden": "true" },
          DATA.steps.map(function (step) {
            return h("span", { style: "background:var(--dt-color-primary-" + step + ")", title: step });
          })
        )
      );
    }
    return field("Steps per ramp", "How many distinct shades each chromatic ramp publishes, from 4 to 10. Neutral keeps all eleven, because it carries every surface, border and line of text.", h("div", { class: "configure-stack" }, parts));
  }

  function rampHueRow(key, label) {
    var overrideHex = config.rampHues && config.rampHues[key];
    var swatchBg = baseRamp(config, key)["600"];

    var picker = h("input", {
      type: "color",
      class: "configure-color",
      "data-bid": "ramphue:" + key,
      value: overrideHex || "#808080",
      "aria-label": label + " hue",
      /* Same live-drag convention as the brand pickers: input
         previews without rebuilding the open control, change commits it. */
      oninput: function (event) {
        commitRampHue(key, event.target.value, { rebuild: false });
      },
      onchange: function (event) {
        commitRampHue(key, event.target.value);
      },
    });

    var row = [
      h("span", { class: "configure-swatch-btn configure-swatch-custom", style: "background:" + swatchBg, title: label + " hue" }, [picker]),
      h("span", { class: "configure-ramphue-label", text: overrideHex ? label + " · hue " + Math.round(hexToOklchHue(overrideHex)) + "° from " + overrideHex : label }),
    ];

    if (overrideHex) {
      row.push(
        h("button", {
          type: "button",
          class: "configure-btn-mini",
          "data-bid": "ramphue-reset:" + key,
          text: "Reset",
          onclick: function () {
            var next = assign({}, config.rampHues || {});
            delete next[key];
            commit({ rampHues: next });
          },
        })
      );
    }

    return h("div", { class: "configure-ramphue-row" }, row);
  }

  function commitRampHue(key, hex, options) {
    var next = assign({}, config.rampHues || {});
    next[key] = hex;
    commit({ rampHues: next }, options);
  }

  function shapeFields() {
    return [
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
      ),
      field(
        "Media radius",
        "How images, video and square avatars sit. Follow takes it from the radius above.",
        segmented(
          "Media radius",
          "mediaradius",
          [
            { value: "auto", label: "Follow" },
            { value: "square", label: "Square" },
            { value: "media", label: "Soft" },
            { value: "overlay", label: "Round" },
            { value: "pill", label: "Pill" },
          ],
          config.mediaRadius,
          function (value) {
            commit({ mediaRadius: value });
          }
        )
      ),
      field(
        "Focus ring",
        "One ring on every interactive element. Thinner reads as quieter; it never goes to zero.",
        segmented("Focus ring", "focus", [{ value: 1, label: "1px" }, { value: 2, label: "2px" }, { value: 3, label: "3px" }], Number(config.focusRing), function (value) {
          commit({ focusRing: value });
        })
      ),
    ];
  }

  function typeFields() {
    return [
      field(
        "Display",
        "Display sizes and headings. Same as body writes nothing, which is how the system ships.",
        select(
          "Display type",
          "displayFont",
          [{ value: "", label: "Same as body" }].concat(DATA.displayFonts),
          config.displayFont || "",
          function (value) {
            commit({ displayFont: value });
          }
        )
      ),
      field(
        "Headline colour",
        "Display and heading text, through --dt-text-headline. Ink is monochrome; primary and secondary set every headline in a brand text colour, tuned for contrast in either mode. Body copy stays ink.",
        segmented(
          "Headline colour",
          "headline",
          [{ value: "ink", label: "Ink" }, { value: "primary", label: "Primary" }, { value: "secondary", label: "Secondary" }],
          config.headlineColor,
          function (value) {
            commit({ headlineColor: value });
          }
        )
      ),
      field(
        "Body",
        "Running text, labels and everything a display or secondary face does not take. Sets --dt-font-family-sans.",
        select("Body type", "font", DATA.bodyFonts, config.font, function (value) {
          commit({ font: value });
        })
      ),
      field(
        "Secondary",
        "Sets --dt-font-family-secondary: the small UI voice of labels, buttons, badges, tabs and eyebrows. Same as body writes nothing.",
        select(
          "Secondary type",
          "secondaryFont",
          [{ value: "", label: "Same as body" }].concat(DATA.displayFonts, DATA.codeFonts),
          config.secondaryFont || "",
          function (value) {
            commit({ secondaryFont: value });
          }
        )
      ),
      field(
        "Code",
        "Sets --dt-font-family-mono for code, tokens and numerals.",
        select("Code type", "codeFont", DATA.codeFonts, config.codeFont, function (value) {
          commit({ codeFont: value });
        })
      ),
    ];
  }

  function spaceFields() {
    return [
      field(
        "Whitespace",
        "Moves all three space axes and the page rhythm together, staying on the grid. Tight fits more on a screen; airy gives each block room to be read on its own.",
        segmented(
          "Whitespace",
          "whitespace",
          [{ value: "tight", label: "Tight" }, { value: "balanced", label: "Balanced" }, { value: "airy", label: "Airy" }],
          config.whitespace,
          function (value) {
            commit({ whitespace: value });
          }
        )
      ),
      field(
        "Control density",
        "Compact retunes control heights and their inset only. Type and colour do not move.",
        segmented("Control density", "density", [{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }], config.density ? "compact" : "comfortable", function (value) {
          commit({ density: value === "compact" });
        })
      ),
      field(
        "Base unit",
        "Every dimension is a multiple, and the number in each name is the multiplier, so the names stay true when the unit moves. Below 4px, control heights drop under the 40px the system asks for.",
        segmented("Base unit", "unit", [{ value: 3, label: "3px" }, { value: 4, label: "4px" }, { value: 5, label: "5px" }], Number(config.baseUnit), function (value) {
          commit({ baseUnit: value });
        })
      ),
    ];
  }

  function mediaUploadField(kind, label, hint) {
    var current = media[kind];
    var lower = label.toLowerCase();

    var file = h("input", {
      type: "file",
      accept: "image/*",
      class: "configure-file",
      "data-bid": "media-" + kind,
      "aria-label": label,
      onchange: function (event) {
        readMediaFile(kind, event.target.files[0]);
        event.target.value = "";
      },
    });

    var drop = h(
      "label",
      {
        class: "configure-drop",
        ondragover: function (event) {
          event.preventDefault();
          drop.setAttribute("data-over", "");
        },
        ondragleave: function () {
          drop.removeAttribute("data-over");
        },
        ondrop: function (event) {
          event.preventDefault();
          drop.removeAttribute("data-over");
          readMediaFile(kind, event.dataTransfer.files[0]);
        },
      },
      [h("span", { text: current ? "Replace the " + lower : "Drop a file here, or choose one" }), file]
    );

    var row = [drop];
    if (current) {
      row.push(
        h("div", { class: "configure-mark-row" }, [
          h("img", { class: "configure-mark", src: current, alt: "" }),
          h("button", {
            type: "button",
            class: "configure-btn",
            "data-bid": "media-" + kind + "-remove",
            text: "Remove",
            onclick: function () {
              var patch = {};
              patch[kind] = "";
              setMedia(patch);
              renderBody();
            },
          }),
        ])
      );
    }
    var err = el.mediaError && el.mediaError[kind];
    if (err) row.push(h("p", { class: "configure-bad", role: "alert", text: err }));

    return field(label, hint, h("div", { class: "configure-stack" }, row));
  }

  function mediaFields() {
    var out = [];
    var lib = iconLibInfo(config.iconLib);

    out.push(
      mediaUploadField(
        "photo",
        "Photo",
        "Populates the hero image in the marketing template. Up to " + Math.round(MEDIA_LIMIT / 1024) + "KB, held in this browser."
      )
    );

    out.push(
      mediaUploadField(
        "illustration",
        "Illustration",
        "Kept separate from photography, for artwork that reads as drawn rather than shot. Shown beside the marketing template's closing section."
      )
    );

    out.push(
      field(
        "Icon library",
        lib.note + " " + lib.licence + ".",
        segmented(
          "Icon library",
          "iconlib",
          Object.keys(DATA.icons)
            .map(function (key) {
              return { value: key, label: DATA.icons[key].label };
            })
            .concat([{ value: "custom", label: "Custom" }]),
          config.iconLib,
          function (value) {
            /* Picking a library sets the stroke it is drawn at. It is a nudge,
               not a lock: the next control still overrides it. Custom has no
               stroke of its own to nudge toward, so it leaves the current one. */
            commit({ iconLib: value, iconStroke: DATA.icons[value] ? DATA.icons[value].stroke : config.iconStroke });
          }
        )
      )
    );

    if (config.iconLib === "custom") {
      out.push(
        field(
          "Custom import",
          "The script tag, package import, or CDN URL for your own icon set. Carried into the exported theme's iconography note.",
          textInput("Custom icon import", "custom-icon-include", config.customIconInclude || "", function (value) {
            commit({ customIconInclude: value }, { rebuild: false });
          })
        )
      );
    }

    out.push(
      field(
        "Icon stroke",
        "Applies to every icon on the page and in the cards. Authored leaves each one at the width it ships with.",
        segmented(
          "Icon stroke",
          "iconstroke",
          [
            { value: "authored", label: "Authored" },
            { value: 1.5, label: "1.5px" },
            { value: 2, label: "2px" },
            { value: 2.5, label: "2.5px" },
          ],
          config.iconStroke,
          function (value) {
            commit({ iconStroke: value });
          }
        )
      )
    );

    out.push(
      field(
        "Icon size",
        "Re-points --dt-size-icon-*, so controls resize with their icons.",
        segmented(
          "Icon size",
          "iconsize",
          [{ value: "small", label: "Small" }, { value: "default", label: "Default" }, { value: "large", label: "Large" }],
          config.iconSize,
          function (value) {
            commit({ iconSize: value });
          }
        )
      )
    );

    out.push(
      field(
        "Media blocks",
        "Dovetail ships no photography, so a card reserves a box where a picture goes. Hiding them takes every image, video and reserved box out of the page and the cards at once, which is how you find out whether the layout still works as words.",
        segmented(
          "Media blocks",
          "mediapresence",
          [{ value: "shown", label: "Shown" }, { value: "hidden", label: "Hidden" }],
          config.media,
          function (value) {
            commit({ media: value });
          }
        )
      )
    );

    out.push(
      h("p", { class: "configure-note" }, [
        h("span", { text: "Browse a whole set, try the solid style, and drop in your own photography in the " }),
        h("a", { href: siteRoot() + "showcase/tools.html", text: "media lab" }),
        h("span", { text: ". It loads the libraries themselves, which needs a connection to jsDelivr." }),
      ])
    );

    return out;
  }

  function viewFields() {
    return [
      field(
        "Colour mode",
        "The same semantic names, re-pointed. No component changes.",
        segmented("Colour mode", "mode", [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }], config.dark ? "dark" : "light", function (value) {
          commit({ dark: value === "dark" });
        })
      ),
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
            { value: "dt-context-social", label: "Social" },
          ],
          context,
          setContext
        )
      ),
    ];
  }

  function exportFields() {
    el.export = h("textarea", { class: "configure-export", readonly: true, rows: "14", spellcheck: "false", "aria-label": "Theme CSS" });
    el.export.value = exportCss();

    el.copy = h("button", {
      type: "button",
      class: "configure-btn configure-btn-primary",
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

    el.download = h("button", {
      type: "button",
      class: "configure-btn",
      "data-bid": "download",
      text: "Download theme.css",
      onclick: function () {
        var blob = new Blob([el.export.value], { type: "text/css" });
        var url = URL.createObjectURL(blob);
        var link = h("a", { href: url, download: "theme-custom.css" });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
      },
    });

    return [
      field(
        "Theme file",
        "Paste this into tokens/themes/theme-custom.css, or download it directly, and the theme ships with the repository, with no JavaScript.",
        h("div", { class: "configure-export-wrap" }, [
          el.export,
          h("div", { class: "configure-actions" }, [el.copy, el.download]),
        ])
      ),
      h("p", {
        class: "configure-note",
        text: "Held in this browser only, under the key the system's own theme runtime reads. Nothing here edits a file.",
      }),
    ];
  }

  function paintBody() {
    var body = el.body;
    body.textContent = "";

    var strip = h("div", { class: "configure-tabs", role: "tablist", "aria-label": "Configure groups" });
    TABS.forEach(function (tab) {
      var selected = tab.id === activeTab;
      strip.appendChild(
        h("button", {
          type: "button",
          class: "configure-tab",
          role: "tab",
          id: "configure-tab-" + tab.id,
          "data-bid": "tab:" + tab.id,
          "aria-selected": String(selected),
          "aria-controls": "configure-panel",
          tabindex: selected ? "0" : "-1",
          text: tab.label,
          onclick: function () {
            setTab(tab.id);
          },
          onkeydown: function (event) {
            var i = TABS.map(function (t) { return t.id; }).indexOf(activeTab);
            var next = null;
            if (event.key === "ArrowRight") next = TABS[(i + 1) % TABS.length];
            else if (event.key === "ArrowLeft") next = TABS[(i - 1 + TABS.length) % TABS.length];
            else if (event.key === "Home") next = TABS[0];
            else if (event.key === "End") next = TABS[TABS.length - 1];
            if (!next) return;
            event.preventDefault();
            setTab(next.id);
            var button = el.body.querySelector('[data-bid="tab:' + next.id + '"]');
            if (button) button.focus();
          },
        })
      );
    });
    body.appendChild(strip);

    var tab = TABS.filter(function (t) { return t.id === activeTab; })[0] || TABS[0];
    var panel = h("div", {
      class: "configure-panel",
      id: "configure-panel",
      role: "tabpanel",
      "aria-labelledby": "configure-tab-" + tab.id,
      tabindex: "0",
    }, tab.fields());
    body.appendChild(panel);
  }

  function setTab(id) {
    activeTab = id;
    store(TAB_KEY, id);
    renderBody();
  }

  /* Where the site root is, read from a link the generator already writes. */
  function siteRoot() {
    var home = document.querySelector(".wordmark");
    var href = home ? home.getAttribute("href") : "index.html";
    return href.replace(/index\.html$/, "");
  }

  function readMark(file) {
    el.markError = null;
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      el.markError = "That is not an image file.";
      renderBody();
      return;
    }
    if (file.size > MARK_LIMIT) {
      el.markError = "That mark is " + Math.round(file.size / 1024) + "KB. The limit is 512KB, because it is held in this browser.";
      renderBody();
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      setBrand({ mark: String(reader.result) });
    };
    reader.onerror = function () {
      el.markError = "That file could not be read.";
      renderBody();
    };
    reader.readAsDataURL(file);
  }

  function readMediaFile(kind, file) {
    el.mediaError = el.mediaError || {};
    el.mediaError[kind] = null;
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      el.mediaError[kind] = "That is not an image file.";
      renderBody();
      return;
    }
    if (file.size > MEDIA_LIMIT) {
      el.mediaError[kind] = "That file is " + Math.round(file.size / 1024) + "KB. The limit is " + Math.round(MEDIA_LIMIT / 1024) + "KB, because it is held in this browser.";
      renderBody();
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var patch = {};
      patch[kind] = String(reader.result);
      setMedia(patch);
      renderBody();
    };
    reader.onerror = function () {
      el.mediaError[kind] = "That file could not be read.";
      renderBody();
    };
    reader.readAsDataURL(file);
  }

  /* --------------------------------------------------------------- opening */

  var lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    el.sheet.hidden = false;
    document.body.classList.add("configure-open");
    el.open.setAttribute("aria-expanded", "true");
    var first = el.sheet.querySelector("select, button, input");
    if (first) first.focus();
  }

  function close() {
    el.sheet.hidden = true;
    document.body.classList.remove("configure-open");
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
      if (el.export && el.export.isConnected) el.export.value = exportCss();
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

  window.DovetailConfigurePanel = { open: open, close: close, reset: reset, config: function () { return assign({}, config); } };

  /* Once, and only from the directory this file was served out of, so a page
     at any depth recovers and a data file that loads without defining the
     global cannot put us in a loop. */
  function recover() {
    if (window.__dovetailConfigureRecovering) return;
    var here = document.currentScript && document.currentScript.src;
    if (!here) return;
    window.__dovetailConfigureRecovering = true;
    var dir = here.slice(0, here.lastIndexOf("/") + 1);
    fetchScript(dir + "configure-data.js", function () {
      if (window.DovetailConfigure) fetchScript(here, null);
    });
  }

  function fetchScript(src, done) {
    var tag = document.createElement("script");
    tag.src = src;
    if (done) tag.onload = done;
    document.head.appendChild(tag);
  }
})();
