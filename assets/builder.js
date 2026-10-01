/* The builder: a canvas to arrange Dovetail components and blocks into new
   screens, with an inspector that offers only tokens.

   This page owns the document, the selection, the history and every control.
   The canvas is a page of its own (assets/builder-frame.html), so a phone frame
   is really 390px wide; it renders the document with the real components and
   answers geometry questions through window.BuilderFrame, and reports presses,
   drags and picks back through window.BuilderHost. The two share the docs
   site's origin, so the Configure panel's theme reaches the canvas too.

   What the builder may place, each component's props (read from its .d.ts)
   and the token options with the declarations each sets come from
   assets/builder-data.js, which the site build writes and checks: a token that
   doesn't exist fails the build.

   The document: { page, root }, where root is { id: "root", type: "Root",
   children } and each node is { id, type, props, style, children? }. props
   holds only what the reader changed, as plain strings, numbers and booleans;
   style holds token option names. Nothing else survives a save, a share link
   or an import (see clean()), so a link can't smuggle a value or a handler in. */

(function () {
  "use strict";

  var mountEl = document.getElementById("builder");
  var DATA = window.DovetailBuilderData;
  if (!mountEl || !DATA || !window.React || !window.ReactDOM) return;

  var e = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback, useMemo = React.useMemo;

  var STORE_KEY = "dovetail-builder";
  var BACKUP_KEY = "dovetail-builder-previous";
  var PREFS_KEY = "dovetail-builder-prefs";
  var VIEWPORTS = [["phone", "Phone, 390px", 390, "phone"], ["tablet", "Tablet, 768px", 768, "tablet"], ["desktop", "Desktop, 1280px", 1280, "desktop"]];
  var VIEWPORT_WIDTH = { phone: 390, tablet: 768, desktop: 1280 };
  var CONTEXTS = [["product", "Product"], ["marketing", "Marketing"], ["social", "Social"]];
  var SPACINGS = [["", "Page default"], ["tight", "Tight"], ["balanced", "Balanced"], ["open", "Open"]];
  var WRAPS = ["Group", "Stack", "Inline", "Grid", "Section", "Card"];
  var META = DATA.components;
  var STYLE_KEYS = Object.keys(DATA.tokens);
  var SECTIONS = [["size", "Size"], ["spacing", "Spacing"], ["appearance", "Appearance"]];

  /* Each category's icon in the assets panel. */
  var GROUP_ICON = {
    layout: "layout", typography: "type", actions: "pointer", forms: "form", display: "image", navigation: "compass",
    feedback: "bell", content: "file", commerce: "bag", chat: "chat", blocks: "blocks",
  };

  function storage(fn) { try { return fn(window.localStorage); } catch (err) { return null; } }
  function isContainer(type) { return type === "Root" || !!(META[type] && META[type].container); }
  function mql(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }

  /* ------------------------------------------------------------ the tree */

  var seq = 0;
  function uid() { seq++; return "n" + Date.now().toString(36).slice(-5) + seq.toString(36); }

  function make(type, props, children, style) {
    var n = { id: uid(), type: type, props: props || {}, style: style || {} };
    if (isContainer(type)) n.children = children || [];
    return n;
  }

  function emptyDoc() {
    return {
      page: { viewport: "desktop", dark: false, context: "product", surface: "base", spacing: "", gap: "" },
      root: { id: "root", type: "Root", props: {}, style: {}, children: [] },
    };
  }

  function copy(doc) { return JSON.parse(JSON.stringify(doc)); }

  function locate(doc, id) {
    if (id === "root") return { node: doc.root, parent: null, index: -1, path: [doc.root] };
    var out = null;
    (function walk(n, path) {
      (n.children || []).forEach(function (c, i) {
        if (out) return;
        if (c.id === id) out = { node: c, parent: n, index: i, path: path.concat([c]) };
        else if (c.children) walk(c, path.concat([c]));
      });
    })(doc.root, [doc.root]);
    return out;
  }

  function fresh(n) {
    var c = { id: uid(), type: n.type, props: Object.assign({}, n.props), style: Object.assign({}, n.style) };
    if (n.children) c.children = n.children.map(fresh);
    return c;
  }

  var ops = {
    insert: function (doc, parentId, index, n) {
      var p = locate(doc, parentId);
      if (!p || !p.node.children) return null;
      p.node.children.splice(Math.max(0, Math.min(index, p.node.children.length)), 0, n);
      return n.id;
    },
    move: function (doc, id, parentId, index) {
      if (id === "root" || id === parentId) return null;
      var from = locate(doc, id);
      var to = locate(doc, parentId);
      if (!from || !to || !to.node.children) return null;
      if (to.path.some(function (x) { return x.id === id; })) return null;
      if (from.parent === to.node && (index === from.index || index === from.index + 1)) return null;
      from.parent.children.splice(from.index, 1);
      if (from.parent === to.node && from.index < index) index--;
      to.node.children.splice(Math.max(0, Math.min(index, to.node.children.length)), 0, from.node);
      return id;
    },
    /* "root" means nothing left to select; null means nothing happened. */
    remove: function (doc, ids) {
      var next = null, any = false;
      [].concat(ids).forEach(function (id) {
        var at = locate(doc, id);
        if (!at || !at.parent) return;
        at.parent.children.splice(at.index, 1);
        any = true;
        var n = at.parent.children[at.index] || at.parent.children[at.index - 1];
        next = n ? n.id : at.parent.id;
      });
      return any ? next || "root" : null;
    },
    duplicate: function (doc, id) {
      var at = locate(doc, id);
      if (!at || !at.parent) return null;
      var c = fresh(at.node);
      at.parent.children.splice(at.index + 1, 0, c);
      return c.id;
    },
    wrap: function (doc, id, type) {
      var at = locate(doc, id);
      if (!at || !at.parent) return null;
      var box = make(type, {}, [at.node]);
      at.parent.children.splice(at.index, 1, box);
      return box.id;
    },
    /* Siblings into one Group, in their order, where the first one was. */
    group: function (doc, ids) {
      var spots = ids.map(function (id) { return locate(doc, id); }).filter(Boolean);
      if (!spots.length) return null;
      var parent = spots[0].parent;
      if (!parent || spots.some(function (s) { return s.parent !== parent; })) return null;
      spots.sort(function (a, b) { return a.index - b.index; });
      var box = make("Group", {}, spots.map(function (s) { return s.node; }));
      var at = spots[0].index;
      parent.children = parent.children.filter(function (c) { return ids.indexOf(c.id) < 0; });
      parent.children.splice(at, 0, box);
      return box.id;
    },
    ungroup: function (doc, id) {
      var at = locate(doc, id);
      if (!at || !at.parent || !at.node.children) return null;
      var kids = at.node.children;
      at.parent.children.splice.apply(at.parent.children, [at.index, 1].concat(kids));
      return kids.length ? kids[0].id : at.parent.id;
    },
    nudge: function (doc, id, by) {
      var at = locate(doc, id);
      if (!at || !at.parent) return null;
      var to = at.index + by;
      if (to < 0 || to >= at.parent.children.length) return null;
      at.parent.children.splice(at.index, 1);
      at.parent.children.splice(to, 0, at.node);
      return id;
    },
  };

  /* Only what the inspector could have set survives a save, a share link or
     an import: known components, their own scalar props, and option names
     from the token lists. */
  function tokenOption(key, v) {
    var def = DATA.tokens[key];
    return def ? def.options.filter(function (o) { return o.value === v; })[0] || null : null;
  }
  function cleanNode(n) {
    if (!n || typeof n !== "object" || !META[n.type]) return null;
    var meta = META[n.type];
    var names = meta.props.map(function (p) { return p.name; });
    if (!meta.builder) names.push("children");
    if (n.type === "Grid") names.push("minColumnWidth");
    var props = {};
    Object.keys(n.props || {}).forEach(function (k) {
      var v = n.props[k];
      if (names.indexOf(k) < 0) return;
      if (k === "minColumnWidth") { if (DATA.columnWidths.some(function (w) { return w.value === v; })) props[k] = v; return; }
      var spec = meta.props.filter(function (p) { return p.name === k; })[0];
      if (spec && spec.kind === "enum" && spec.options.indexOf(v) < 0) return;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") props[k] = v;
    });
    var style = {};
    Object.keys(n.style || {}).forEach(function (k) {
      if (k === "dark") { if (n.style.dark === true) style.dark = true; return; }
      if (tokenOption(k, n.style[k])) style[k] = n.style[k];
    });
    var out = { id: typeof n.id === "string" && /^[\w-]{1,40}$/.test(n.id) ? n.id : uid(), type: n.type, props: props, style: style };
    if (isContainer(n.type)) out.children = (Array.isArray(n.children) ? n.children : []).map(cleanNode).filter(Boolean);
    return out;
  }
  function clean(doc) {
    var base = emptyDoc();
    if (!doc || typeof doc !== "object") return base;
    var p = doc.page || {};
    base.page.viewport = VIEWPORT_WIDTH[p.viewport] ? p.viewport : "desktop";
    base.page.dark = p.dark === true;
    base.page.context = CONTEXTS.some(function (c) { return c[0] === p.context; }) ? p.context : "product";
    base.page.surface = tokenOption("surface", p.surface) ? p.surface : "base";
    base.page.spacing = SPACINGS.some(function (s) { return s[0] === p.spacing; }) ? p.spacing : "";
    base.page.gap = DATA.rootGaps.indexOf(p.gap) >= 0 ? p.gap : "";
    var kids = doc.root && Array.isArray(doc.root.children) ? doc.root.children : [];
    base.root.children = kids.map(cleanNode).filter(Boolean);
    /* Ids must be unique for selection to mean anything. */
    var seen = {};
    (function dedupe(n) { (n.children || []).forEach(function (c) { if (seen[c.id]) c.id = uid(); seen[c.id] = true; dedupe(c); }); })(base.root);
    return base;
  }

  /* ------------------------------------------------------------ starters */

  var STARTERS = [
    ["landing", "Landing page", function () {
      var d = emptyDoc();
      d.page.context = "marketing";
      d.root.children = [
        make("HeroBlock"), make("FeatureGridBlock", { tone: "subtle" }), make("StatsBlock"),
        make("TestimonialBlock", { tone: "subtle" }), make("CtaBlock", { tone: "brand" }),
      ];
      return d;
    }],
    ["store", "Store page", function () {
      var d = emptyDoc();
      d.root.children = [make("Navbar", { brand: "Kiln & Co." }), make("ProductGridBlock"), make("SplitBlock", { tone: "subtle" }), make("FaqBlock"), make("CtaBlock", { tone: "brand-muted" })];
      return d;
    }],
    ["settings", "Settings form", function () {
      var d = emptyDoc();
      d.page.surface = "subtle";
      d.root.children = [
        make("Section", { width: "narrow" }, [
          make("Stack", { layer: "block" }, [
            make("Heading", { children: "Workspace settings" }),
            make("Card", { eyebrow: "", title: "Profile", description: "How the workspace appears to its members." }, [
              make("Stack", { layer: "group" }, [make("Input"), make("Select"), make("Switch"), make("Checkbox")]),
            ]),
            make("Group", { justify: "flex-end", gap: "sm" }, [make("Button", { variant: "secondary", children: "Cancel" }), make("Button", { children: "Save changes" })]),
          ]),
        ]),
      ];
      return d;
    }],
    ["chat", "Support chat (phone)", function () {
      var d = emptyDoc();
      d.page.viewport = "phone";
      d.page.surface = "subtle";
      d.root.children = [make("Stack", { gap: "md" }, [make("ChatBlock")], { padding: "md" })];
      return d;
    }],
    ["blank", "Blank page", function () { return emptyDoc(); }],
  ];

  /* ---------------------------------------------------- share and storage */

  function encode(doc) {
    var bytes = new TextEncoder().encode(JSON.stringify(doc));
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(s) {
    try {
      var bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (err) { return null; }
  }

  function initialDoc() {
    var m = /^#b=([\w-]+)$/.exec(location.hash);
    if (m) {
      var shared = decode(m[1]);
      if (shared) return { doc: clean(shared), from: "link" };
    }
    var saved = storage(function (s) { return s.getItem(STORE_KEY); });
    if (saved) {
      try { return { doc: clean(JSON.parse(saved)), from: "saved" }; } catch (err) { /* fall through */ }
    }
    var first = STARTERS[0][2]();
    if (mql("(max-width: 900px)")) first.page.viewport = "phone";
    return { doc: first, from: "starter" };
  }

  function loadPrefs() {
    var p = storage(function (s) { return JSON.parse(s.getItem(PREFS_KEY) || "null"); }) || {};
    return { category: DATA.groups.some(function (g) { return g.id === p.category; }) ? p.category : DATA.groups[0].id, view: p.view === "list" ? "list" : "grid" };
  }

  /* The site's copy helper (assets/site.js) falls back to a hidden textarea
     where the clipboard API isn't allowed. */
  function copyText(text) {
    return new Promise(function (resolve, reject) {
      if (window.DovetailCopy && window.DovetailCopy.write) {
        window.DovetailCopy.write(text, function (ok) { (ok ? resolve : reject)(); });
      } else if (navigator.clipboard) navigator.clipboard.writeText(text).then(resolve, reject);
      else reject(new Error("no clipboard"));
    });
  }

  /* An insertion line is a box with no height or no width; give it some. */
  function thick(r) {
    if (!r) return r;
    if (r.height < 1) return { left: r.left, top: r.top - 1.5, width: r.width, height: 3 };
    if (r.width < 1) return { left: r.left - 1.5, top: r.top, width: 3, height: r.height };
    return r;
  }

  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  /* --------------------------------------------------------------- icons */

  var PATHS = {
    undo: ["M9 14 4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
    redo: ["m15 14 5-5-5-5", "M20 9H9a5 5 0 0 0 0 10h3"],
    up: ["m6 15 6-6 6 6"],
    down: ["m6 9 6 6 6-6"],
    right: ["m9 6 6 6-6 6"],
    copy: ["M8 8h12v12H8z", "M16 8V4H4v12h4"],
    trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
    grip: ["M9 6h.01", "M15 6h.01", "M9 12h.01", "M15 12h.01", "M9 18h.01", "M15 18h.01"],
    code: ["m8 8-4 4 4 4", "M16 8l4 4-4 4"],
    link: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1", "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
    eye: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    plus: ["M12 5v14", "M5 12h14"],
    parent: ["M9 14 4 9l5-5", "M4 9h9a7 7 0 0 1 7 7v4"],
    close: ["M6 6l12 12", "M18 6 6 18"],
    search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5"],
    check: ["m5 12 5 5 9-10"],
    alert: ["M12 8v5", "M12 16h.01", "M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
    lock: ["M6 11h12v9H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
    phone: ["M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M11 18h2"],
    tablet: ["M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M11 18h2"],
    desktop: ["M3 4h18v12H3z", "M8 20h8", "M12 16v4"],
    sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
    moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
    gridView: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
    listView: ["M4 6h3", "M10 6h10", "M4 12h3", "M10 12h10", "M4 18h3", "M10 18h10"],
    box: ["M4 5h16v14H4z"],
    component: ["M12 3 21 12l-9 9-9-9z"],
    group: ["M3 7V4h3", "M18 4h3v3", "M21 17v3h-3", "M6 20H3v-3", "M7 9h4v6H7z", "M13 9h4v6h-4z"],
    wrap: ["M4 4h16v16H4z", "M8 8h8v8H8z"],
    layout: ["M4 4h16v16H4z", "M4 10h16", "M10 10v10"],
    type: ["M5 6V4h14v2", "M12 4v16", "M9 20h6"],
    pointer: ["M5 3l14 7-6 2-2 6z"],
    form: ["M4 6h16v5H4z", "M4 15h4v4H4z", "M11 17h9"],
    image: ["M4 4h16v16H4z", "M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "m20 15-5-5-11 10"],
    compass: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m15.5 8.5-2 5-5 2 2-5z"],
    bell: ["M6 16V11a6 6 0 0 1 12 0v5l2 2H4z", "M10 20a2 2 0 0 0 4 0"],
    file: ["M6 3h9l4 4v14H6z", "M14 3v5h5", "M9 13h7", "M9 17h5"],
    bag: ["M5 8h14l-1 12H6z", "M9 8V6a3 3 0 0 1 6 0v2"],
    chat: ["M4 5h16v11H9l-5 4z"],
    blocks: ["M4 4h16v6H4z", "M4 14h16v6H4z"],
    alignStart: ["M4 4v16", "M8 7h10v4H8z", "M8 13h6v4H8z"],
    alignCenter: ["M12 4v16", "M7 7h10v4H7z", "M9 13h6v4H9z"],
    alignEnd: ["M20 4v16", "M6 7h10v4H6z", "M10 13h6v4h-6z"],
    alignStretch: ["M4 4v16", "M20 4v16", "M7 7h10v4H7z", "M7 13h10v4H7z"],
    justifyStart: ["M4 4v16", "M7 8h4v8H7z", "M13 8h4v8h-4z"],
    justifyCenter: ["M12 4v16", "M5 8h4v8H5z", "M15 8h4v8h-4z"],
    justifyEnd: ["M20 4v16", "M7 8h4v8H7z", "M13 8h4v8h-4z"],
    justifyBetween: ["M4 4v16", "M20 4v16", "M6 8h4v8H6z", "M14 8h4v8h-4z"],
    row: ["M4 8h5v8H4z", "M10 8h5v8h-5z", "M16 8h4v8h-4z"],
    column: ["M8 4h8v5H8z", "M8 10h8v5H8z", "M8 16h8v4H8z"],
    saved: ["M5 4h11l3 3v13H5z", "M8 4v5h7V4", "M8 20v-6h8v6"],
  };
  function Icon(props) {
    return e("svg", { className: cx("bd-ic", props.className), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" },
      (PATHS[props.name] || PATHS.box).map(function (d, i) { return e("path", { key: i, d: d }); }));
  }

  var ENUM_ICONS = {
    align: { "flex-start": "alignStart", center: "alignCenter", "flex-end": "alignEnd", stretch: "alignStretch", start: "alignStart", end: "alignEnd" },
    justify: { "flex-start": "justifyStart", center: "justifyCenter", "flex-end": "justifyEnd", "space-between": "justifyBetween" },
    direction: { row: "row", column: "column" },
    orientation: { horizontal: "row", vertical: "column" },
  };
  var ENUM_LABEL = { "flex-start": "Start", "flex-end": "End", "space-between": "Space between", center: "Center", stretch: "Stretch", row: "Row", column: "Column" };
  function words(name) { return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, function (c) { return c.toUpperCase(); }); }

  /* --------------------------------------------------------- small parts */

  /* A row of buttons, one pressed. Icons when there's an honest picture of
     the choice, short words otherwise. */
  function Segmented(props) {
    return e("div", { className: cx("bd-seg", props.wide && "bd-seg-wide"), role: "group", "aria-labelledby": props.labelledBy, "aria-label": props.labelledBy ? undefined : props.label },
      props.options.map(function (o) {
        var pressed = props.value === o.value;
        return e("button", {
          key: String(o.value), type: "button", className: "bd-seg-btn", "aria-pressed": String(pressed),
          title: o.title || (o.icon ? o.label : undefined), "aria-label": o.icon ? o.label : undefined,
          onClick: function () { props.onChange(o.value); },
        }, o.icon ? e(Icon, { name: o.icon }) : o.label);
      }));
  }

  function Switch(props) {
    return e("button", {
      type: "button", role: "switch", className: "bd-switch", "aria-checked": String(!!props.value), "aria-labelledby": props.labelledBy,
      onClick: function () { props.onChange(!props.value); },
    }, e("span", { className: "bd-switch-knob", "aria-hidden": true }));
  }

  /* What a token option looks like, drawn with the token itself. */
  function Preview(props) {
    var o = props.option;
    if (!o || !o.tokens || !o.tokens.length) return null;
    var t = o.tokens[0];
    if (props.kind === "color") return e("span", { className: "bd-sw", style: { background: "var(" + t + ")" }, "aria-hidden": true });
    if (props.kind === "radius") return e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + t + ")" }, "aria-hidden": true });
    if (props.kind === "shadow") return e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + t + ")" }, "aria-hidden": true });
    if (props.kind === "space") return e("span", { className: "bd-pv-space", "aria-hidden": true }, e("span", { style: { width: "var(" + t + ")" } }));
    return null;
  }

  var ddSeq = 0;
  /* A listbox of our own: swatches and previews in the options, the same look
     in every browser, and the keyboard of a native select (arrows, Home, End,
     type to jump, Enter, Escape). menu: true makes it a list of actions. */
  function Dropdown(props) {
    var openState = useState(false);
    var open = openState[0], setOpen = openState[1];
    var activeState = useState(0);
    var active = activeState[0], setActive = activeState[1];
    var posState = useState(null);
    var pos = posState[0], setPos = posState[1];
    var btn = useRef(null);
    var list = useRef(null);
    var ids = useMemo(function () { ddSeq++; return { btn: "bd-dd-b" + ddSeq, list: "bd-dd-l" + ddSeq }; }, []);
    var typed = useRef({ text: "", at: 0 });
    var options = props.options;
    var selected = options.filter(function (o) { return o.value === props.value; })[0];

    var place = function () {
      var r = btn.current.getBoundingClientRect();
      var width = Math.max(r.width, 200);
      var below = window.innerHeight - r.bottom - 12;
      var above = r.top - 12;
      var want = Math.min(340, options.length * 44 + 12);
      /* Below when it fits, otherwise wherever there's more room; never
         taller than the screen leaves. */
      var up = below < want && above > below;
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width: width,
        top: up ? undefined : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : undefined,
        maxHeight: Math.max(96, Math.min(want, up ? above : below)),
      });
      return r;
    };
    var show = function () {
      place();
      var i = options.indexOf(selected);
      setActive(i < 0 ? 0 : i);
      setOpen(true);
    };
    var close = function (refocus) {
      setOpen(false);
      if (refocus && btn.current) btn.current.focus();
    };
    var choose = function (o) {
      close(true);
      if (o && !o.disabled) props.onChange(o.value);
    };

    useEffect(function () {
      if (!open) return;
      if (list.current) list.current.focus({ preventScroll: true });
      var away = function (ev) {
        if (list.current && list.current.contains(ev.target)) return;
        if (btn.current && btn.current.contains(ev.target)) return;
        close(false);
      };
      /* The list follows its button when the panel behind it scrolls, and
         closes once the button has gone out of view. */
      var reflow = function (ev) {
        if (ev && list.current && list.current.contains(ev.target)) return;
        if (!btn.current) return close(false);
        var r = place();
        if (r.bottom < 0 || r.top > window.innerHeight) close(false);
      };
      document.addEventListener("pointerdown", away, true);
      window.addEventListener("scroll", reflow, true);
      window.addEventListener("resize", reflow);
      return function () {
        document.removeEventListener("pointerdown", away, true);
        window.removeEventListener("scroll", reflow, true);
        window.removeEventListener("resize", reflow);
      };
    }, [open]);

    useEffect(function () {
      if (!open || !list.current) return;
      /* Scroll the list only: scrollIntoView could scroll the page too,
         which would close this list. */
      var l = list.current;
      var el = l.querySelector('[data-i="' + active + '"]');
      if (!el) return;
      if (el.offsetTop < l.scrollTop) l.scrollTop = el.offsetTop;
      else if (el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = el.offsetTop + el.offsetHeight - l.clientHeight;
    }, [open, active]);

    var onListKey = function (ev) {
      var k = ev.key;
      if (k === "ArrowDown") { ev.preventDefault(); setActive(Math.min(options.length - 1, active + 1)); }
      else if (k === "ArrowUp") { ev.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (k === "Home") { ev.preventDefault(); setActive(0); }
      else if (k === "End") { ev.preventDefault(); setActive(options.length - 1); }
      else if (k === "Enter" || k === " ") { ev.preventDefault(); choose(options[active]); }
      else if (k === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(true); }
      else if (k === "Tab") close(false);
      else if (k.length === 1 && /\S/.test(k)) {
        var now = Date.now();
        typed.current.text = (now - typed.current.at > 600 ? "" : typed.current.text) + k.toLowerCase();
        typed.current.at = now;
        var hit = options.findIndex(function (o) { return String(o.label || o.value).toLowerCase().indexOf(typed.current.text) === 0; });
        if (hit >= 0) setActive(hit);
      }
    };

    var label = props.menu ? props.placeholder : selected ? (selected.label || String(selected.value)) : props.placeholder || "None";
    return e(React.Fragment, null,
      e("button", {
        ref: btn, id: ids.btn, type: "button", className: cx("bd-dd", props.compact && "bd-dd-compact", props.className),
        "aria-haspopup": props.menu ? "menu" : "listbox", "aria-expanded": String(open), "aria-controls": open ? ids.list : undefined,
        "aria-labelledby": props.labelledBy ? props.labelledBy + " " + ids.btn : undefined, "aria-label": props.labelledBy ? undefined : props.label,
        title: props.title, disabled: props.disabled,
        onClick: function () { if (open) close(false); else show(); },
        onKeyDown: function (ev) { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); show(); } },
      },
        props.icon ? e(Icon, { name: props.icon }) : null,
        !props.menu && selected ? e(Preview, { option: selected, kind: props.preview }) : null,
        props.iconOnly ? e("span", { className: "visually-hidden" }, label) : e("span", { className: "bd-dd-label" }, label),
        e(Icon, { name: "down", className: "bd-dd-chev" })),
      open && pos ? ReactDOM.createPortal(e("ul", {
        ref: list, id: ids.list, role: props.menu ? "menu" : "listbox", tabIndex: -1, className: "bd-dd-list",
        "aria-labelledby": props.labelledBy || ids.btn, "aria-activedescendant": ids.list + "-" + active,
        style: { left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.maxHeight },
        onKeyDown: onListKey,
      }, options.map(function (o, i) {
        var isSel = !props.menu && o.value === props.value;
        return e("li", {
          key: String(o.value), id: ids.list + "-" + i, "data-i": i, role: props.menu ? "menuitem" : "option",
          "aria-selected": props.menu ? undefined : String(isSel), "aria-disabled": o.disabled ? "true" : undefined,
          className: cx("bd-dd-opt", i === active && "is-active", isSel && "is-selected", o.disabled && "is-disabled"),
          onPointerMove: function () { if (active !== i) setActive(i); },
          onClick: function () { choose(o); },
        },
          o.icon ? e(Icon, { name: o.icon }) : e(Preview, { option: o, kind: props.preview }),
          e("span", { className: "bd-dd-opt-text" },
            e("span", { className: "bd-dd-opt-label" }, o.label || String(o.value)),
            o.hint ? e("span", { className: "bd-dd-opt-hint" }, o.hint) : null),
          isSel ? e(Icon, { name: "check", className: "bd-dd-tick" }) : null);
      })), document.body) : null);
  }

  function Field(props) {
    return e("div", { className: cx("bd-field", props.inline && "bd-field-inline") },
      e("span", { className: "bd-field-label", id: props.id, title: props.note || undefined }, props.label),
      props.children,
      props.hint ? e("span", { className: "bd-field-hint" }, props.hint) : null);
  }

  function Section(props) {
    return e("section", { className: "bd-sec" },
      e("h3", { className: "bd-sec-h" }, props.icon ? e(Icon, { name: props.icon }) : null, props.title),
      props.children);
  }

  /* A live, scaled-down render of a component's specimen, made only once
     its tile scrolls into view. It is a picture: inert and hidden from
     assistive tech, since the tile's own name says what it is. */
  class ThumbGuard extends React.Component {
    constructor(p) { super(p); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? null : this.props.children; }
  }
  function Thumb(props) {
    var holder = useRef(null);
    useEffect(function () {
      var el = holder.current;
      var NS = window.BeamMobileDesignSystem_e33121;
      var specs = window.DovetailSpecimens;
      if (!el) return;
      el.setAttribute("inert", "");
      var build = specs && NS && props.type !== "Group" ? (specs.samples && specs.samples[props.type]) || specs.build[props.type] : null;
      if (!build) return;
      var root = null, stage = null, io = null, done = false;
      var fit = function () {
        if (!stage) return;
        var w = stage.scrollWidth || 1, h = stage.scrollHeight || 1;
        var W = el.clientWidth, H = el.clientHeight;
        /* Small components grow a little so a button reads as a button. */
        var s = Math.min(props.wide ? 1 : 1.6, (W - 12) / w, (H - 12) / h);
        stage.style.transform = "translate(" + Math.max(0, (W - w * s) / 2) + "px, " + Math.max(0, (H - h * s) / 2) + "px) scale(" + s + ")";
        stage.style.opacity = "1";
      };
      var draw = function () {
        if (done) return;
        done = true;
        stage = document.createElement("div");
        stage.className = "bd-thumb-stage";
        /* A block renders at desktop width; anything else shrinks to its
           own size (up to a phone column), so the scale fits what's there. */
        if (props.wide) stage.style.width = "1280px";
        else { stage.style.width = "fit-content"; stage.style.maxWidth = "360px"; stage.style.minWidth = "120px"; }
        el.appendChild(stage);
        root = ReactDOM.createRoot(stage);
        try { root.render(e(ThumbGuard, null, build())); } catch (err) { return; }
        requestAnimationFrame(function () { requestAnimationFrame(fit); });
        setTimeout(fit, 400);
      };
      if (window.IntersectionObserver) {
        io = new IntersectionObserver(function (entries) { if (entries.some(function (x) { return x.isIntersecting; })) { draw(); io.disconnect(); } }, { rootMargin: "120px" });
        io.observe(el);
      } else draw();
      return function () {
        if (io) io.disconnect();
        if (root) { var r = root; setTimeout(function () { r.unmount(); }, 0); }
        if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
      };
    }, [props.type]);
    return e("span", { className: "bd-thumb", ref: holder, "aria-hidden": true },
      props.type === "Group" ? e(Icon, { name: "group", className: "bd-thumb-ic" }) : null);
  }

  /* ------------------------------------------------------------ the app */

  function App() {
    var init = useMemo(initialDoc, []);
    var prefs = useMemo(loadPrefs, []);
    var docState = useState(init.doc);
    var doc = docState[0], setDoc = docState[1];
    var selState = useState([]);
    var selection = selState[0], setSelection = selState[1];
    var hoverState = useState(null);
    var hover = hoverState[0], setHover = hoverState[1];
    var leftState = useState("assets");
    var left = leftState[0], setLeft = leftState[1];
    var paneState = useState("canvas");
    var pane = paneState[0], setPane = paneState[1];
    var previewState = useState(false);
    var preview = previewState[0], setPreview = previewState[1];
    var queryState = useState("");
    var query = queryState[0], setQuery = queryState[1];
    var layerQueryState = useState("");
    var layerQuery = layerQueryState[0], setLayerQuery = layerQueryState[1];
    var categoryState = useState(prefs.category);
    var category = categoryState[0], setCategory = categoryState[1];
    var viewState = useState(prefs.view);
    var view = viewState[0], setView = viewState[1];
    var collapsedState = useState({});
    var collapsed = collapsedState[0], setCollapsed = collapsedState[1];
    var readyState = useState(false);
    var ready = readyState[0], setReady = readyState[1];
    var placeableState = useState(null);
    var placeable = placeableState[0], setPlaceable = placeableState[1];
    var scalarsState = useState({});
    var scalars = scalarsState[0], setScalars = scalarsState[1];
    var codeState = useState("");
    var code = codeState[0], setCode = codeState[1];
    var sayState = useState("");
    var say = sayState[0], setSay = sayState[1];
    var savedState = useState({ ok: true, at: null });
    var saved = savedState[0], setSaved = savedState[1];
    var boxState = useState({ w: 0, h: 0 });
    var box = boxState[0], setBox = boxState[1];
    var dragState = useState(null);
    var drag = dragState[0], setDrag = dragState[1];
    var marksState = useState({ sel: [], hover: null, drop: null });
    var marks = marksState[0], setMarks = marksState[1];
    var listDropState = useState(null);
    var listDrop = listDropState[0], setListDrop = listDropState[1];

    var sel = selection.length ? selection[selection.length - 1] : null;

    var history = useRef({ past: [], future: [] });
    var docRef = useRef(doc); docRef.current = doc;
    var selRef = useRef(selection); selRef.current = selection;
    var frameRef = useRef(null);
    var stageRef = useRef(null);
    var dialogRef = useRef(null);
    var rightRef = useRef(null);
    var layersRef = useRef(null);
    var dragRef = useRef(null);
    var justDragged = useRef(false);

    var api = function () {
      var f = frameRef.current;
      try { return f && f.contentWindow && f.contentWindow.BuilderFrame; } catch (err) { return null; }
    };

    var announce = useCallback(function (text) { setSay(""); setTimeout(function () { setSay(text); }, 30); }, []);
    var select = useCallback(function (ids) { setSelection(ids.filter(function (x) { return x && x !== "root"; })); }, []);

    var commit = useCallback(function (next, nextSel, message) {
      history.current.past.push(JSON.stringify(docRef.current));
      if (history.current.past.length > 100) history.current.past.shift();
      history.current.future = [];
      setDoc(next);
      if (nextSel !== undefined) select(nextSel === null || nextSel === "root" ? [] : [nextSel]);
      if (message) announce(message);
    }, [announce, select]);

    var change = useCallback(function (fn, message) {
      var next = copy(docRef.current);
      var nextSel = fn(next);
      if (nextSel === null) return false;
      commit(next, nextSel, message);
      return true;
    }, [commit]);

    var undo = useCallback(function () {
      var h = history.current;
      if (!h.past.length) return;
      h.future.push(JSON.stringify(docRef.current));
      var prev = JSON.parse(h.past.pop());
      setDoc(prev);
      setSelection(function (s) { return s.filter(function (id) { return locate(prev, id); }); });
      announce("Undone");
    }, [announce]);
    var redo = useCallback(function () {
      var h = history.current;
      if (!h.future.length) return;
      h.past.push(JSON.stringify(docRef.current));
      var next = JSON.parse(h.future.pop());
      setDoc(next);
      setSelection(function (s) { return s.filter(function (id) { return locate(next, id); }); });
      announce("Redone");
    }, [announce]);

    /* Every change is written straight away. The toolbar says when it last
       saved, or that this browser won't keep it (a private window, blocked
       storage), so work is never lost quietly. */
    useEffect(function () {
      var ok = storage(function (s) { s.setItem(STORE_KEY, JSON.stringify(doc)); return true; });
      setSaved({ ok: !!ok, at: new Date() });
    }, [doc]);
    useEffect(function () {
      storage(function (s) { s.setItem(PREFS_KEY, JSON.stringify({ category: category, view: view })); });
    }, [category, view]);
    var firstDoc = useRef(doc);
    useEffect(function () {
      if (doc !== firstDoc.current && /^#b=/.test(location.hash)) window.history.replaceState(null, "", location.pathname + location.search);
    }, [doc]);
    useEffect(function () { if (init.from === "link") announce("Opened a shared layout"); }, []);

    /* ------------------------------------------------- canvas plumbing */

    var vpWidth = VIEWPORT_WIDTH[doc.page.viewport] || 1280;
    var PAD = 16;
    var scale = box.w ? Math.min(1, (box.w - PAD * 2) / vpWidth) : 1;
    var frameH = box.h ? Math.max(200, (box.h - PAD * 2) / scale) : 800;
    var offX = box.w ? Math.max(PAD, (box.w - vpWidth * scale) / 2) : PAD;
    var offY = PAD;

    useEffect(function () {
      var el = stageRef.current;
      if (!el) return;
      var measure = function () { setBox({ w: el.clientWidth, h: el.clientHeight }); };
      measure();
      if (!window.ResizeObserver) { window.addEventListener("resize", measure); return function () { window.removeEventListener("resize", measure); }; }
      var ro = new ResizeObserver(measure);
      ro.observe(el);
      return function () { ro.disconnect(); };
    }, [pane]);

    var toStage = useCallback(function (r) {
      if (!r) return null;
      return { left: offX + r.left * scale, top: offY + r.top * scale, width: r.width * scale, height: r.height * scale };
    }, [offX, offY, scale]);
    var toStageRef = useRef(toStage); toStageRef.current = toStage;
    var scaleRef = useRef(scale); scaleRef.current = scale;
    var hoverRef = useRef(hover); hoverRef.current = hover;

    var remeasure = useCallback(function () {
      var f = api();
      if (!f) return;
      setMarks(function (m) {
        var ids = selRef.current;
        return {
          sel: ids.map(function (id) { var r = toStage(f.rect(id)); return r ? { id: id, r: r } : null; }).filter(Boolean),
          hover: hoverRef.current && ids.indexOf(hoverRef.current) < 0 && hoverRef.current !== "root" ? toStage(f.rect(hoverRef.current)) : null,
          drop: m.drop,
        };
      });
    }, [toStage]);
    var remeasureRef = useRef(remeasure); remeasureRef.current = remeasure;

    /* ------------------------------------------------- dragging */

    /* Where a drag at page coordinates (x, y) would land: in the layers list,
       on the canvas, or nowhere. */
    var resolve = function (x, y, payload) {
      var list = layersRef.current;
      var el = document.elementFromPoint(x, y);
      if (list && el && list.contains(el)) return listTarget(el, y, payload);
      var frame = frameRef.current;
      var f = api();
      if (!frame || !f) return null;
      var r = frame.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
      var s = scaleRef.current;
      var hit = f.drop((x - r.left) / s, (y - r.top) / s, payload.id || null, 12 / s);
      if (!hit) return null;
      return { where: "canvas", parent: hit.parent, index: hit.index, line: hit.line, box: hit.box };
    };

    /* A row's top third drops before it, the bottom third after it, and the
       middle of a container drops inside it, at the end. */
    var listTarget = function (el, y, payload) {
      var row = el.closest ? el.closest("[data-layer]") : null;
      var d = docRef.current;
      if (!row) return { where: "list", parent: "root", index: d.root.children.length, indicator: { top: layersRef.current.scrollHeight - 2, left: 8 } };
      var id = row.getAttribute("data-layer");
      if (id === "root") return { where: "list", parent: "root", index: 0, indicator: { top: row.offsetTop + row.offsetHeight, left: 8 } };
      var at = locate(d, id);
      if (!at) return null;
      if (payload.id && at.path.some(function (n) { return n.id === payload.id; })) return null;
      var r = row.getBoundingClientRect();
      var depth = Number(row.getAttribute("data-depth")) || 0;
      var rel = (y - r.top) / r.height;
      var indent = 8 + depth * 14;
      if (at.node.children && rel > 0.3 && rel < 0.7) {
        return { where: "list", parent: id, index: at.node.children.length, inside: id };
      }
      var after = rel >= 0.5;
      return { where: "list", parent: at.parent.id, index: at.index + (after ? 1 : 0), indicator: { top: row.offsetTop + (after ? row.offsetHeight : 0), left: indent } };
    };

    var show = function (hit) {
      setListDrop(hit && hit.where === "list" ? hit : null);
      setMarks(function (m) {
        return Object.assign({}, m, { drop: hit && hit.where === "canvas" ? { line: hit.line ? thick(toStageRef.current(hit.line)) : null, box: hit.box ? toStageRef.current(hit.box) : null } : null });
      });
    };

    var autoscroll = function (x, y) {
      var frame = frameRef.current;
      if (!frame) return;
      var r = frame.getBoundingClientRect();
      if (x < r.left || x > r.right) return;
      var edge = 48;
      if (y - r.top < edge && y >= r.top - 24) frame.contentWindow.scrollBy(0, -14);
      else if (r.bottom - y < edge && y <= r.bottom + 24) frame.contentWindow.scrollBy(0, 14);
      var list = layersRef.current;
      if (list) {
        var lr = list.getBoundingClientRect();
        if (x >= lr.left && x <= lr.right) {
          if (y - lr.top < 32) list.scrollTop -= 10;
          else if (lr.bottom - y < 32) list.scrollTop += 10;
        }
      }
    };

    var dragMove = function (x, y) {
      var dr = dragRef.current;
      if (!dr) return;
      setDrag({ label: dr.payload.label, x: x, y: y });
      var hit = resolve(x, y, dr.payload);
      dr.hit = hit;
      show(hit);
      autoscroll(x, y);
    };

    var dragEnd = function (commitIt) {
      var dr = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      show(null);
      if (!dr || !dr.active) return;
      justDragged.current = true;
      setTimeout(function () { justDragged.current = false; }, 60);
      var hit = dr.hit;
      if (!commitIt || !hit) return;
      if (dr.payload.kind === "new") add(dr.payload.type, { parent: hit.parent, index: hit.index });
      else if (change(function (d) { return ops.move(d, dr.payload.id, hit.parent, hit.index); }, "Moved " + dr.payload.label)) {
        if (hit.parent !== "root") setCollapsed(function (c) { var n = Object.assign({}, c); delete n[hit.parent]; return n; });
      }
    };

    /* From the assets panel, a layer row, or the selection's tag. The canvas
       stops taking pointer events once a drag starts, so the pointer stays
       with this page. */
    var startDrag = function (ev, payload) {
      if (ev.button !== undefined && ev.button !== 0) return;
      if (ev.shiftKey || ev.metaKey || ev.ctrlKey) return;
      var target = ev.currentTarget;
      try { target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      dragRef.current = { payload: payload, x: ev.clientX, y: ev.clientY, active: false, id: ev.pointerId };
      var move = function (mv) {
        var dr = dragRef.current;
        if (!dr || mv.pointerId !== dr.id) return;
        if (!dr.active) {
          if (Math.abs(mv.clientX - dr.x) + Math.abs(mv.clientY - dr.y) < 6) return;
          dr.active = true;
        }
        mv.preventDefault();
        dragMove(mv.clientX, mv.clientY);
      };
      var stop = function (commitIt) {
        return function (up) {
          var dr = dragRef.current;
          if (!dr || (up && up.pointerId !== undefined && up.pointerId !== dr.id)) return;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onCancel);
          window.removeEventListener("keydown", esc, true);
          dragEnd(commitIt);
        };
      };
      var onUp = stop(true), onCancel = stop(false);
      var esc = function (k) { if (k.key === "Escape") { k.preventDefault(); onCancel({}); announce("Drag cancelled"); } };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", esc, true);
    };

    /* ------------------------------------------------- the canvas calls */

    useEffect(function () {
      var raf = 0;
      window.BuilderHost = {
        ready: function () { setReady(true); },
        selection: function () { var s = selRef.current; return s.length ? s[s.length - 1] : null; },
        pick: function (id, additive) { pickRef.current(id, additive, "canvas"); },
        hover: function (id) { if (hoverRef.current !== id) setHover(id); },
        key: function (ev) { return keyRef.current(ev); },
        moved: function () {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () { remeasureRef.current(); });
        },
        /* A press-and-drag on the canvas, reported in canvas coordinates. */
        dragStart: function (id) {
          var at = locate(docRef.current, id);
          if (!at) return;
          dragRef.current = { payload: { kind: "move", id: id, label: at.node.type }, active: true };
          if (selRef.current.indexOf(id) < 0) select([id]);
        },
        dragMove: function (fx, fy) {
          var frame = frameRef.current;
          if (!frame || !dragRef.current) return;
          var r = frame.getBoundingClientRect();
          var s = scaleRef.current;
          dragMoveRef.current(r.left + fx * s, r.top + fy * s);
        },
        dragEnd: function (commitIt) { dragEndRef.current(commitIt); },
      };
      return function () { delete window.BuilderHost; };
    }, []);
    var dragMoveRef = useRef(dragMove); dragMoveRef.current = dragMove;
    var dragEndRef = useRef(dragEnd); dragEndRef.current = dragEnd;

    var onFrameLoad = function () { if (api()) setReady(true); };

    useEffect(function () {
      var f = api();
      if (!ready || !f) return;
      if (!placeable) {
        var ok = {}, sc = {};
        Object.keys(META).forEach(function (n) { ok[n] = f.has(n) && (META[n].container || f.hasStarter(n)); sc[n] = f.scalars(n); });
        setPlaceable(ok);
        setScalars(sc);
      }
      f.render(doc, { preview: preview });
    }, [ready, doc, preview]);

    useEffect(function () { remeasure(); }, [selection, hover, scale, offX, box.h]);
    useEffect(function () { if (rightRef.current) rightRef.current.scrollTop = 0; }, [sel]);

    /* ------------------------------------------------- selecting */

    /* Shift (or Cmd) adds siblings to the selection, for grouping; anything
       else replaces it. */
    var pick = function (id, additive, from) {
      if (!id || id === "root") { if (!additive) select([]); return; }
      var cur = selRef.current;
      if (additive && cur.length) {
        var d = docRef.current;
        var a = locate(d, cur[0]), b = locate(d, id);
        if (a && b && a.parent === b.parent) {
          select(cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]));
          return;
        }
      }
      select([id]);
      if (from === "canvas" && mql("(max-width: 900px)")) {
        var at = locate(docRef.current, id);
        announce((at ? at.node.type : "") + " selected. Open Edit to change it.");
      }
    };
    var pickRef = useRef(pick); pickRef.current = pick;

    /* ------------------------------------------------- placing things */

    var target = function () {
      var d = docRef.current;
      var s = selRef.current;
      var id = s.length ? s[s.length - 1] : null;
      var at = id ? locate(d, id) : null;
      if (!at) return { parent: "root", index: d.root.children.length };
      if (isContainer(at.node.type)) return { parent: at.node.id, index: at.node.children.length };
      return { parent: at.parent.id, index: at.index + 1 };
    };

    var add = function (type, where) {
      var t = where || target();
      var n = make(type);
      var parentName = t.parent === "root" ? "the page" : (locate(docRef.current, t.parent) || { node: { type: "page" } }).node.type;
      change(function (d) { return ops.insert(d, t.parent, t.index, n); }, "Added " + type + " to " + parentName);
      if (mql("(max-width: 900px)")) setPane("canvas");
    };

    var actions = {
      remove: function () {
        var ids = selRef.current.slice();
        if (!ids.length) return;
        change(function (d) { return ops.remove(d, ids); }, ids.length > 1 ? "Deleted " + ids.length + " items" : "Deleted");
      },
      duplicate: function () { var id = selRef.current[selRef.current.length - 1]; if (id) change(function (d) { return ops.duplicate(d, id); }, "Duplicated"); },
      up: function () { var id = selRef.current[selRef.current.length - 1]; if (id && change(function (d) { return ops.nudge(d, id, -1); }, "Moved up")) select([id]); },
      down: function () { var id = selRef.current[selRef.current.length - 1]; if (id && change(function (d) { return ops.nudge(d, id, 1); }, "Moved down")) select([id]); },
      parent: function () {
        var id = selRef.current[selRef.current.length - 1];
        var at = id && locate(docRef.current, id);
        select(at && at.parent && at.parent.id !== "root" ? [at.parent.id] : []);
      },
      wrap: function (type) { var id = selRef.current[selRef.current.length - 1]; if (id && type) change(function (d) { return ops.wrap(d, id, type); }, "Wrapped in " + type); },
      group: function () {
        var ids = selRef.current.slice();
        if (!ids.length) return;
        if (!change(function (d) { return ops.group(d, ids); }, "Grouped " + ids.length + (ids.length === 1 ? " item" : " items"))) announce("Only items side by side in the same parent can be grouped");
      },
      ungroup: function () {
        var id = selRef.current[selRef.current.length - 1];
        var at = id && locate(docRef.current, id);
        if (at && at.node.type === "Group") change(function (d) { return ops.ungroup(d, id); }, "Ungrouped");
      },
    };

    var keyRef = useRef(function () { return false; });
    keyRef.current = function (ev) {
      if (dialogRef.current && dialogRef.current.open) return false;
      var t = ev.target;
      var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing || (t && t.closest && t.closest(".bd-dd-list"))) return false;
      var mod = ev.metaKey || ev.ctrlKey;
      var key = ev.key.toLowerCase();
      if (mod && key === "z") { (ev.shiftKey ? redo : undo)(); return true; }
      if (mod && key === "y") { redo(); return true; }
      if (!selRef.current.length) return false;
      if (mod && key === "g") { (ev.shiftKey ? actions.ungroup : actions.group)(); return true; }
      if (ev.key === "Delete" || ev.key === "Backspace") { actions.remove(); return true; }
      if (mod && key === "d") { actions.duplicate(); return true; }
      if ((ev.altKey || mod) && ev.key === "ArrowUp") { actions.up(); return true; }
      if ((ev.altKey || mod) && ev.key === "ArrowDown") { actions.down(); return true; }
      if (ev.key === "Escape") { actions.parent(); return true; }
      return false;
    };
    useEffect(function () {
      var onKey = function (ev) {
        if (!mountEl.contains(ev.target) && ev.target !== document.body) return;
        if (keyRef.current(ev)) ev.preventDefault();
      };
      document.addEventListener("keydown", onKey);
      return function () { document.removeEventListener("keydown", onKey); };
    }, []);

    /* ------------------------------------------------- settings */

    var setPage = function (key, value, message) { change(function (d) { d.page[key] = value; return undefined; }, message); };
    var setProp = function (id, key, value) {
      change(function (d) { var at = locate(d, id); if (!at) return null; if (value === undefined) delete at.node.props[key]; else at.node.props[key] = value; return undefined; });
    };
    var setStyle = function (id, key, value) {
      change(function (d) { var at = locate(d, id); if (!at) return null; if (value === undefined || value === "") delete at.node.style[key]; else at.node.style[key] = value; return undefined; });
    };

    var openCode = function () {
      var f = api();
      if (!f) return;
      setCode(f.jsx(docRef.current));
      var dlg = dialogRef.current;
      if (dlg && dlg.showModal) dlg.showModal();
    };

    var share = function () {
      var url = location.origin + location.pathname + "#b=" + encode(docRef.current);
      copyText(url).then(function () { announce("Link copied. Anyone with it opens this layout."); }, function () { window.prompt("Copy this link", url); });
    };

    /* A starter replaces the canvas, so the work it replaces is asked about
       first and kept as a backup as well as in the undo history. */
    var startFrom = function (id) {
      var s = STARTERS.filter(function (x) { return x[0] === id; })[0];
      if (!s) return;
      if (docRef.current.root.children.length && !window.confirm("Replace what's on the canvas with the " + s[1].toLowerCase() + "? Undo brings your work back.")) return;
      storage(function (st) { st.setItem(BACKUP_KEY, JSON.stringify(docRef.current)); });
      commit(s[2](), null, "Started from " + s[1] + ". Undo to go back.");
    };

    /* ------------------------------------------------- rendering helpers */

    var labelOf = function (n) {
      var base = scalars[n.type] || {};
      var text = n.props.children != null ? n.props.children : n.props.title != null ? n.props.title : n.props.label != null ? n.props.label : base.children || base.title || base.label || base.name || base.brand;
      return typeof text === "string" || typeof text === "number" ? String(text) : "";
    };
    var typeIcon = function (type) {
      if (type === "Group") return "group";
      if (isContainer(type)) return "box";
      return "component";
    };

    var tokenControl = function (key, node, id) {
      var def = DATA.tokens[key];
      var value = node.style[key] || "";
      var options = [{ value: "", label: "None" }].concat(def.options.map(function (o) {
        return { value: o.value, label: o.label || o.value, hint: o.tokens.join(" · ") || "CSS keyword", tokens: o.tokens };
      }));
      var cur = def.options.filter(function (o) { return o.value === value; })[0];
      return e(Field, { key: key, id: id, label: def.label, hint: cur ? cur.tokens.join(" · ") || null : null },
        e(Dropdown, { labelledBy: id, value: value, options: options, preview: def.preview, onChange: function (v) { setStyle(node.id, key, v); } }));
    };

    var propControl = function (p, node) {
      var id = "bd-p-" + node.id + "-" + p.name;
      var base = scalars[node.type] || {};
      var own = node.props[p.name];
      var dflt = p.default != null ? (p.kind === "boolean" ? p.default === "true" : p.kind === "number" ? Number(p.default) : p.default) : undefined;
      var current = own !== undefined ? own : base[p.name] !== undefined ? base[p.name] : dflt;
      var set = function (v) { setProp(node.id, p.name, v); };
      var label = words(p.name);
      var control;
      if (p.kind === "enum") {
        var icons = ENUM_ICONS[p.name];
        if (icons && p.options.every(function (o) { return icons[o]; })) {
          control = e(Segmented, { labelledBy: id, value: current, onChange: set, options: p.options.map(function (o) { return { value: o, label: ENUM_LABEL[o] || words(o), icon: icons[o] }; }) });
        } else if (p.options.length <= 3 && p.options.every(function (o) { return String(o).length <= 9; })) {
          control = e(Segmented, { labelledBy: id, value: current, onChange: set, wide: true, options: p.options.map(function (o) { return { value: o, label: String(o) }; }) });
        } else {
          control = e(Dropdown, { labelledBy: id, value: current, onChange: set, placeholder: "Default",
            options: p.options.map(function (o) { return { value: o, label: ENUM_LABEL[o] || String(o) }; }) });
        }
      } else if (p.kind === "boolean") {
        return e(Field, { key: p.name, id: id, label: label, note: p.note, inline: true }, e(Switch, { labelledBy: id, value: !!current, onChange: set }));
      } else if (p.kind === "number" && node.type === "Grid" && p.name === "columns") {
        control = e(Dropdown, { labelledBy: id, value: current, onChange: set, options: [1, 2, 3, 4, 5, 6].map(function (n) { return { value: n, label: n + (n === 1 ? " column" : " columns") }; }) });
      } else if (p.kind === "number") {
        control = e("input", { className: "bd-input", type: "number", "aria-labelledby": id, value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : Number(ev.target.value)); } });
      } else if (p.kind === "text" || (p.kind === "node" && typeof base[p.name] === "string")) {
        control = e("input", { className: "bd-input", type: "text", "aria-labelledby": id, value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : ev.target.value); } });
      } else return null;
      return e(Field, { key: p.name, id: id, label: label, note: p.note }, control);
    };

    /* ------------------------------------------------- the panels */

    var assetsPanel = function () {
      var q = query.trim().toLowerCase();
      var groups = DATA.groups;
      var items;
      if (q) {
        items = [];
        groups.forEach(function (g) {
          g.items.forEach(function (n) {
            if (placeable && !placeable[n]) return;
            if (n.toLowerCase().indexOf(q) >= 0 || String(META[n].blurb || "").toLowerCase().indexOf(q) >= 0) items.push(n);
          });
        });
      } else {
        var g = groups.filter(function (x) { return x.id === category; })[0] || groups[0];
        items = g.items.filter(function (n) { return !placeable || placeable[n]; });
      }
      var current = groups.filter(function (x) { return x.id === category; })[0] || groups[0];
      return e("div", { className: "bd-assets" },
        e("label", { className: "bd-search" },
          e(Icon, { name: "search" }),
          e("span", { className: "visually-hidden" }, "Search components"),
          e("input", { type: "search", placeholder: "Search all components", value: query, onChange: function (ev) { setQuery(ev.target.value); } })),
        e("div", { className: cx("bd-cats", q && "is-muted"), role: "group", "aria-label": "Categories" },
          groups.map(function (g) {
            return e("button", {
              key: g.id, type: "button", className: "bd-cat", "aria-pressed": String(!q && category === g.id), title: g.label, "aria-label": g.label,
              onClick: function () { setCategory(g.id); setQuery(""); },
            }, e(Icon, { name: GROUP_ICON[g.id] || "box" }));
          })),
        e("div", { className: "bd-assets-head" },
          e("h3", { className: "bd-assets-title" }, q ? "Results" : current.label, e("span", { className: "bd-count" }, items.length)),
          e(Segmented, { label: "View", value: view, onChange: setView, options: [{ value: "grid", label: "Grid", icon: "gridView" }, { value: "list", label: "List", icon: "listView" }] })),
        items.length ? null : e("p", { className: "bd-empty-note" }, "Nothing matches."),
        e("ul", { className: cx("bd-tiles", view === "list" ? "is-list" : "is-grid") }, items.map(function (n) {
          var meta = META[n];
          return e("li", { key: n },
            e("button", {
              type: "button", className: "bd-tile", "data-type": n, "aria-label": "Add " + n, title: meta.blurb ? n + ": " + meta.blurb : n,
              onPointerDown: function (ev) { startDrag(ev, { kind: "new", type: n, label: n }); },
              onClick: function () { if (!justDragged.current) add(n); },
            },
              e(Thumb, { type: n, wide: meta.group === "blocks" }),
              e("span", { className: "bd-tile-text" },
                e("span", { className: "bd-tile-name" }, n),
                view === "list" && meta.blurb ? e("span", { className: "bd-tile-blurb" }, meta.blurb) : null)));
        })),
        e("p", { className: "bd-tip" }, "Drag onto the canvas or the layers, or tap to add after the selection."));
    };

    var layersPanel = function () {
      var q = layerQuery.trim().toLowerCase();
      var rows = [];
      var keep = null;
      if (q) {
        keep = {};
        (function walk(n, path) {
          (n.children || []).forEach(function (c) {
            var hit = c.type.toLowerCase().indexOf(q) >= 0 || labelOf(c).toLowerCase().indexOf(q) >= 0;
            if (hit) { keep[c.id] = true; path.forEach(function (p) { keep[p] = true; }); }
            if (c.children) walk(c, path.concat([c.id]));
          });
        })(doc.root, []);
      }
      (function walk(n, depth) {
        (n.children || []).forEach(function (c) {
          if (keep && !keep[c.id]) return;
          rows.push({ n: c, depth: depth });
          if (c.children && (q || !collapsed[c.id])) walk(c, depth + 1);
        });
      })(doc.root, 0);
      var toggle = function (id) { setCollapsed(function (c) { var n = Object.assign({}, c); if (n[id]) delete n[id]; else n[id] = true; return n; }); };
      return e("div", { className: "bd-layers-panel" },
        e("label", { className: "bd-search" },
          e(Icon, { name: "search" }),
          e("span", { className: "visually-hidden" }, "Filter layers"),
          e("input", { type: "search", placeholder: "Filter layers", value: layerQuery, onChange: function (ev) { setLayerQuery(ev.target.value); } })),
        e("div", { className: "bd-layers", ref: layersRef, role: "tree", "aria-label": "Layers", "aria-multiselectable": "true" },
          e("div", { className: cx("bd-layer", !sel && "is-current"), "data-layer": "root", role: "treeitem", "aria-selected": String(!sel) },
            e("button", { type: "button", className: "bd-layer-main", onClick: function () { select([]); } },
              e(Icon, { name: "desktop" }), e("span", { className: "bd-layer-name" }, "Page"))),
          rows.length ? null : e("p", { className: "bd-empty-note" }, q ? "No layers match." : "The page is empty. Add something from Assets."),
          rows.map(function (r) {
            var n = r.n;
            var text = labelOf(n);
            var on = selection.indexOf(n.id) >= 0;
            var fixed = !isContainer(n.type);
            var open = !collapsed[n.id] || !!q;
            return e("div", {
              key: n.id, className: cx("bd-layer", on && "is-current", listDrop && listDrop.inside === n.id && "is-drop-inside", hover === n.id && "is-hover"),
              "data-layer": n.id, "data-depth": r.depth, role: "treeitem", "aria-selected": String(on), "aria-level": r.depth + 1,
              "aria-expanded": n.children ? String(open) : undefined,
              style: { paddingInlineStart: "calc(var(--dt-space-inset-2xs) + " + r.depth + " * 14px)" },
              onPointerEnter: function () { setHover(n.id); },
              onPointerLeave: function () { setHover(null); },
            },
              n.children ? e("button", { type: "button", className: cx("bd-layer-twisty", open && "is-open"), "aria-label": (open ? "Collapse " : "Expand ") + n.type, onClick: function () { toggle(n.id); } }, e(Icon, { name: "right" }))
                : e("span", { className: "bd-layer-twisty", "aria-hidden": true }),
              e("button", {
                type: "button", className: "bd-layer-main",
                onClick: function (ev) { if (!justDragged.current) pick(n.id, ev.shiftKey || ev.metaKey || ev.ctrlKey, "layers"); },
                onPointerDown: function (ev) { if (ev.pointerType === "mouse") startDrag(ev, { kind: "move", id: n.id, label: n.type }); },
              },
                e(Icon, { name: typeIcon(n.type) }),
                e("span", { className: "bd-layer-name" }, n.type),
                text ? e("span", { className: "bd-layer-text" }, text) : null),
              fixed ? e("span", { className: "bd-layer-lock", title: "Fixed layout: its parts can't be moved. Change it through its props." }, e(Icon, { name: "lock" }), e("span", { className: "visually-hidden" }, "Fixed layout")) : null,
              e("span", {
                className: "bd-layer-grip", title: "Drag to reorder", "aria-hidden": true,
                onPointerDown: function (ev) { ev.preventDefault(); startDrag(ev, { kind: "move", id: n.id, label: n.type }); },
              }, e(Icon, { name: "grip" })));
          }),
          listDrop && listDrop.indicator ? e("div", { className: "bd-layers-line", style: { top: listDrop.indicator.top + "px", left: listDrop.indicator.left + "px" }, "aria-hidden": true }) : null),
        e("p", { className: "bd-tip" }, "Drag rows to reorder or nest. Shift-click to select several, then group them (Ctrl+G)."));
    };

    var pageInspector = function () {
      var surfaceOptions = DATA.tokens.surface.options.map(function (o) { return { value: o.value, label: o.value, hint: o.tokens[0], tokens: o.tokens }; });
      var cur = DATA.tokens.surface.options.filter(function (o) { return o.value === doc.page.surface; })[0];
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("h2", { className: "bd-inspect-title" }, "Page"),
          e("p", { className: "bd-inspect-sub" }, "Select something on the canvas or in the layers to change it. The viewport and light or dark are in the toolbar.")),
        e(Section, { title: "Page" },
          e(Field, { id: "bd-pg-ctx", label: "Context" }, e(Segmented, { labelledBy: "bd-pg-ctx", wide: true, value: doc.page.context, onChange: function (v) { setPage("context", v); }, options: CONTEXTS.map(function (c) { return { value: c[0], label: c[1] }; }) })),
          e(Field, { id: "bd-pg-char", label: "Layout character", hint: "Sets data-layout, which moves every layout layer token together." },
            e(Dropdown, { labelledBy: "bd-pg-char", value: doc.page.spacing, onChange: function (v) { setPage("spacing", v || ""); }, options: SPACINGS.map(function (s) { return { value: s[0], label: s[1] }; }) })),
          e(Field, { id: "bd-pg-gap", label: "Gap between sections", hint: doc.page.gap ? "--dt-layout-stack-" + doc.page.gap : "None: blocks keep their own rhythm." },
            e(Dropdown, { labelledBy: "bd-pg-gap", value: doc.page.gap, onChange: function (v) { setPage("gap", v || ""); },
              options: [{ value: "", label: "None" }].concat(DATA.rootGaps.map(function (g) { return { value: g, label: g, hint: "--dt-layout-stack-" + g }; })) })),
          e(Field, { id: "bd-pg-surface", label: "Fill", hint: cur ? cur.tokens[0] : null },
            e(Dropdown, { labelledBy: "bd-pg-surface", value: doc.page.surface, preview: "color", onChange: function (v) { setPage("surface", v || "base"); }, options: surfaceOptions }))));
    };

    var multiInspector = function () {
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("h2", { className: "bd-inspect-title" }, selection.length + " selected"),
          e("p", { className: "bd-inspect-sub" }, "Group them to lay them out together: a flex row or column with a gap from the space tokens."),
          e("div", { className: "bd-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: actions.group }, e(Icon, { name: "group" }), "Group", e("kbd", null, "Ctrl G")),
            e("button", { type: "button", className: "bd-btn", onClick: function () { select([sel]); } }, "Keep one"),
            e("button", { type: "button", className: "bd-act bd-act-danger", onClick: actions.remove, title: "Delete all", "aria-label": "Delete all" }, e(Icon, { name: "trash" })))));
    };

    var nodeInspector = function (selected) {
      var node = selected.node;
      var meta = META[node.type] || { props: [] };
      var base = scalars[node.type] || {};
      var layoutProps = meta.props.filter(function (p) { return p.layout; });
      var contentProps = meta.props.filter(function (p) { return !p.layout; });
      var textId = "bd-text-" + node.id;
      var hasText = !meta.container && (typeof base.children === "string" || typeof node.props.children === "string");
      var columnsId = "bd-cols-" + node.id;
      var fixed = !isContainer(node.type);
      var first = selected.index === 0;
      var last = selected.parent && selected.index === selected.parent.children.length - 1;
      var contentRows = (hasText ? [e(Field, { key: "text", id: textId, label: "Text" },
        e("input", { className: "bd-input", type: "text", "aria-labelledby": textId, value: node.props.children != null ? String(node.props.children) : String(base.children || ""),
          onChange: function (ev) { setProp(node.id, "children", ev.target.value); } }))] : [])
        .concat(contentProps.map(function (p) { return propControl(p, node); }).filter(Boolean));
      var styleSection = function (sec) {
        var keys = STYLE_KEYS.filter(function (k) { return DATA.tokens[k].section === sec[0]; });
        var toned = sec[0] === "appearance" && meta.props.some(function (p) { return p.name === "tone"; });
        return e(Section, { key: sec[0], title: sec[1] },
          toned ? e("p", { className: "bd-lock-note" }, "This one paints its own background from Tone, under Layout. Fill here sits underneath it.") : null,
          keys.map(function (k) { return tokenControl(k, node, "bd-t-" + node.id + "-" + k); }),
          sec[0] === "appearance" ? e(Field, { id: "bd-dark-" + node.id, label: "Dark band", inline: true, hint: node.style.dark ? "Adds the dark class: everything inside resolves dark." : null },
            e(Switch, { labelledBy: "bd-dark-" + node.id, value: !!node.style.dark, onChange: function (v) { setStyle(node.id, "dark", v ? true : undefined); } })) : null);
      };
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("nav", { className: "bd-crumbs", "aria-label": "Selection path" },
            selected.path.map(function (n, i) {
              var isLast = i === selected.path.length - 1;
              var name = n.type === "Root" ? "Page" : n.type;
              return e(React.Fragment, { key: n.id },
                i ? e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›") : null,
                isLast ? e("span", { className: "bd-crumb", "aria-current": "true" }, name)
                  : e("button", { type: "button", className: "bd-crumb", onClick: function () { select(n.id === "root" ? [] : [n.id]); } }, name));
            })),
          e("h2", { className: "bd-inspect-title" }, e(Icon, { name: typeIcon(node.type) }), node.type,
            fixed ? e("span", { className: "bd-badge", title: "Its parts can't be moved or rearranged. Change it through its props." }, e(Icon, { name: "lock" }), "Fixed layout") : null),
          meta.blurb ? e("p", { className: "bd-inspect-sub" }, meta.blurb + ".", meta.href ? e(React.Fragment, null, " ", e("a", { href: meta.href }, "Docs")) : null) : null,
          e("div", { className: "bd-actions", role: "toolbar", "aria-label": "Selection" },
            e("button", { type: "button", className: "bd-act", onClick: actions.up, disabled: first, title: "Move up (Ctrl+↑)", "aria-label": "Move up" }, e(Icon, { name: "up" })),
            e("button", { type: "button", className: "bd-act", onClick: actions.down, disabled: last, title: "Move down (Ctrl+↓)", "aria-label": "Move down" }, e(Icon, { name: "down" })),
            e("button", { type: "button", className: "bd-act", onClick: actions.parent, title: "Select parent (Esc)", "aria-label": "Select parent" }, e(Icon, { name: "parent" })),
            e("button", { type: "button", className: "bd-act", onClick: actions.duplicate, title: "Duplicate (Ctrl+D)", "aria-label": "Duplicate" }, e(Icon, { name: "copy" })),
            node.type === "Group"
              ? e("button", { type: "button", className: "bd-act", onClick: actions.ungroup, title: "Ungroup (Ctrl+Shift+G)", "aria-label": "Ungroup" }, e(Icon, { name: "wrap" }))
              : e("button", { type: "button", className: "bd-act", onClick: actions.group, title: "Group (Ctrl+G)", "aria-label": "Group" }, e(Icon, { name: "group" })),
            e(Dropdown, { menu: true, label: "Wrap in", placeholder: "Wrap in", icon: "wrap", iconOnly: true, compact: true, title: "Wrap in a container",
              options: WRAPS.filter(function (w) { return placeable == null || placeable[w]; }).map(function (w) { return { value: w, label: w, icon: typeIcon(w) }; }),
              onChange: actions.wrap }),
            e("button", { type: "button", className: "bd-act bd-act-danger", onClick: actions.remove, title: "Delete (Del)", "aria-label": "Delete" }, e(Icon, { name: "trash" })))),
        contentRows.length ? e(Section, { title: "Content and props" }, contentRows) : null,
        e(Section, { title: "Layout" },
          fixed ? e("p", { className: "bd-lock-note" }, e(Icon, { name: "lock" }), "This component's own layout is fixed: its parts can't be moved or rearranged. Size, spacing and appearance below still apply to it as a whole.") : null,
          layoutProps.map(function (p) { return propControl(p, node); }),
          node.type === "Grid" ? e(Field, { id: columnsId, label: "Responsive columns", hint: node.props.minColumnWidth ? "Fits columns at least this wide; ignores columns." : "Off: uses columns." },
            e(Dropdown, { labelledBy: columnsId, value: node.props.minColumnWidth || "", onChange: function (v) { setProp(node.id, "minColumnWidth", v || undefined); },
              options: [{ value: "", label: "Off" }].concat(DATA.columnWidths.map(function (w) { return { value: w.value, label: w.label, hint: w.token }; })) })) : null),
        SECTIONS.map(styleSection));
    };

    /* ------------------------------------------------- layout */

    var canUndo = history.current.past.length > 0;
    var canRedo = history.current.future.length > 0;
    var selected = sel ? locate(doc, sel) : null;
    var savedText = saved.ok ? "Saved" : "Not saved";
    var savedTitle = saved.ok
      ? "Saved in this browser" + (saved.at ? " at " + saved.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "") + ". It stays when you reload or come back."
      : "This browser won't keep your work (a private window, or storage is blocked). Use Share or Code to keep it.";

    var toolbar = e("div", { className: "bd-toolbar", role: "toolbar", "aria-label": "Builder" },
      e(Dropdown, { menu: true, label: "Start from a layout", placeholder: "Start from", compact: true, className: "bd-start",
        options: STARTERS.map(function (s) { return { value: s[0], label: s[1] }; }), onChange: startFrom }),
      e("span", { className: "bd-tool-group" },
        e("button", { type: "button", className: "bd-act", onClick: undo, disabled: !canUndo, title: "Undo (Ctrl+Z)", "aria-label": "Undo" }, e(Icon, { name: "undo" })),
        e("button", { type: "button", className: "bd-act", onClick: redo, disabled: !canRedo, title: "Redo (Ctrl+Shift+Z)", "aria-label": "Redo" }, e(Icon, { name: "redo" }))),
      e(Segmented, { label: "Viewport", value: doc.page.viewport, onChange: function (v) { setPage("viewport", v); }, options: VIEWPORTS.map(function (v) { return { value: v[0], label: v[1], icon: v[3] }; }) }),
      e(Segmented, { label: "Mode", value: doc.page.dark, onChange: function (v) { setPage("dark", v); }, options: [{ value: false, label: "Light", icon: "sun" }, { value: true, label: "Dark", icon: "moon" }] }),
      e("span", { className: "bd-tool-spacer" }),
      e("span", { className: cx("bd-saved", !saved.ok && "is-error"), title: savedTitle, role: "status" }, e(Icon, { name: saved.ok ? "check" : "alert" }), e("span", { className: "bd-saved-text" }, savedText)),
      e("button", { type: "button", className: "bd-act", "aria-pressed": String(preview), title: "Preview: use the components", "aria-label": "Preview",
        onClick: function () { setPreview(!preview); select([]); announce(preview ? "Editing" : "Preview: the components respond to clicks and typing"); } }, e(Icon, { name: "eye" })),
      e("button", { type: "button", className: "bd-act", onClick: share, title: "Copy a share link", "aria-label": "Share" }, e(Icon, { name: "link" })),
      e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: openCode, disabled: !ready }, e(Icon, { name: "code" }), "Code"));

    var stage = e("div", { className: cx("bd-stage", drag && "is-dragging"), ref: stageRef },
      e("iframe", {
        ref: frameRef, className: "bd-frame", title: "Builder canvas, " + vpWidth + "px wide", src: mountEl.getAttribute("data-frame"), onLoad: onFrameLoad,
        style: { width: vpWidth + "px", height: frameH + "px", transform: "scale(" + scale + ")", left: offX + "px", top: offY + "px" },
      }),
      e("div", { className: "bd-marks", "aria-hidden": true },
        !preview && marks.hover ? e("div", { className: "bd-mark bd-mark-hover", style: marks.hover }) : null,
        !preview ? marks.sel.map(function (m) {
          var at = locate(doc, m.id);
          if (!at) return null;
          var isMain = m.id === sel;
          return e("div", { key: m.id, className: cx("bd-mark bd-mark-sel", !isMain && "is-extra", m.r.top < 24 && "is-top"), style: m.r },
            isMain ? e("span", {
              className: "bd-mark-tag", title: "Drag to move",
              onPointerDown: function (ev) { ev.preventDefault(); startDrag(ev, { kind: "move", id: at.node.id, label: at.node.type }); },
            }, e(Icon, { name: "grip" }), at.node.type, !isContainer(at.node.type) ? e(Icon, { name: "lock" }) : null) : null);
        }) : null,
        marks.drop && marks.drop.line ? e("div", { className: "bd-mark-line", style: marks.drop.line }) : null,
        marks.drop && marks.drop.box ? e("div", { className: "bd-mark-box", style: marks.drop.box }) : null),
      ready ? null : e("p", { className: "bd-stage-loading" }, "Loading the canvas…"));

    var inspector = selection.length > 1 ? multiInspector() : selected && selected.node.type !== "Root" ? nodeInspector(selected) : pageInspector();

    return e(React.Fragment, null,
      e("div", { className: "bd-tabs", role: "tablist", "aria-label": "Builder panels" },
        [["add", "Add"], ["canvas", "Canvas"], ["edit", "Edit"]].map(function (t) {
          return e("button", { key: t[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(pane === t[0]), onClick: function () { setPane(t[0]); } },
            t[1], t[0] === "edit" && selected ? e("span", { className: "bd-tab-note" }, " · " + (selection.length > 1 ? selection.length : selected.node.type)) : null);
        })),
      e("div", { className: "bd-shell", "data-pane": pane },
        e("aside", { className: "bd-left", "aria-label": "Assets and layers" },
          e("div", { className: "bd-left-tabs", role: "tablist", "aria-label": "Left panel" },
            e("button", { type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === "assets"), onClick: function () { setLeft("assets"); } }, e(Icon, { name: "plus" }), "Assets"),
            e("button", { type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === "layers"), onClick: function () { setLeft("layers"); } }, e(Icon, { name: "blocks" }), "Layers")),
          e("div", { className: "bd-left-body" }, left === "assets" ? assetsPanel() : layersPanel())),
        e("div", { className: "bd-center" }, toolbar, stage),
        e("aside", { className: "bd-right", "aria-label": "Inspector", ref: rightRef }, inspector)),
      drag ? e("div", { className: "bd-ghost", style: { left: drag.x + "px", top: drag.y + "px" }, "aria-hidden": true }, drag.label) : null,
      e("dialog", { className: "bd-code", ref: dialogRef, "aria-labelledby": "bd-code-title" },
        e("div", { className: "bd-code-head" },
          e("h2", { id: "bd-code-title" }, "Code"),
          e("p", { className: "bd-inspect-sub" }, "React with @dovetail-ds/react. Sample data from the specimens is included so it renders as you see it; replace it with your own."),
          e("div", { className: "bd-code-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: function () { copyText(code).then(function () { announce("Code copied"); }); } }, e(Icon, { name: "copy" }), "Copy"),
            e("a", { className: "bd-btn", href: "data:text/plain;charset=utf-8," + encodeURIComponent(code), download: "Screen.jsx" }, "Download Screen.jsx"),
            e("button", { type: "button", className: "bd-btn", onClick: function () { dialogRef.current.close(); } }, e(Icon, { name: "close" }), "Close"))),
        e("pre", { className: "bd-code-pre", tabIndex: 0 }, e("code", null, code))),
      e("div", { className: "visually-hidden", role: "status", "aria-live": "polite" }, say));
  }

  mountEl.textContent = "";
  ReactDOM.createRoot(mountEl).render(e(App));
})();
