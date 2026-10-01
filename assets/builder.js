/* The builder: a canvas to arrange Dovetail components and blocks into new
   screens, with an inspector that offers only tokens.

   This page owns the document, the selection, the history and every control.
   The canvas is a page of its own (assets/builder-frame.html), so a phone frame
   is really 390px wide; it renders the active frame with the real components
   and answers geometry questions through window.BuilderFrame, and reports
   presses, drags, picks and double-clicks back through window.BuilderHost.
   The two share the docs site's origin, so the Configure panel's theme reaches
   the canvas too.

   What the builder may place, each component's props (read from its .d.ts),
   the frame sizes and the token options with the declarations each sets come
   from assets/builder-data.js, which the site build writes and checks: a token
   that doesn't exist fails the build.

   The document: { frames, active }. A frame is { id, name, size, dark,
   context, surface, spacing, gap, root }, where root is { id: "root", type:
   "Root", children } and each node is { id, type, name?, props, style,
   children? }. props holds only what the reader changed, as plain strings,
   numbers and booleans (plus an uploaded image as a data URL); style holds
   token option names. Nothing else survives a save, a share link or an import
   (see clean()), so a link can't smuggle a value or a handler in. */

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
  var FRAMES = DATA.frames;
  var FRAME_WIDTH = {};
  FRAMES.forEach(function (f) { FRAME_WIDTH[f.id] = f.width; });
  var FRAME_ICON = { phone: "phone", "phone-lg": "phone", tablet: "tablet", laptop: "desktop", desktop: "desktop", wide: "desktop" };
  var CONTEXTS = [["product", "Product"], ["marketing", "Marketing"], ["social", "Social"]];
  var SPACINGS = [["", "Page default"], ["tight", "Tight"], ["balanced", "Balanced"], ["open", "Open"]];
  var WRAPS = ["Group", "Stack", "Inline", "Grid", "Section", "Card"];
  var ZOOMS = [["fit", "Fit"], [0.5, "50%"], [0.75, "75%"], [1, "100%"], [1.25, "125%"], [1.5, "150%"], [2, "200%"]];
  var META = DATA.components;
  var STYLE_KEYS = Object.keys(DATA.tokens);
  var SECTIONS = [["size", "Size"], ["spacing", "Spacing"], ["appearance", "Appearance"]];
  var TEXT_PROPS = ["children", "title", "label", "text", "name", "brand", "value"];
  var MEDIA_URL = /^(https?:\/\/|data:(image|video)\/)/;
  var MEDIA_LIMIT = 1500000;

  /* Each category's icon in the assets panel. */
  var GROUP_ICON = {
    layout: "layout", typography: "type", actions: "pointer", forms: "form", display: "image", navigation: "compass",
    feedback: "bell", content: "file", commerce: "bag", chat: "chat", blocks: "blocks",
  };

  function storage(fn) { try { return fn(window.localStorage); } catch (err) { return null; } }
  function isContainer(type) { return type === "Root" || !!(META[type] && META[type].container); }
  function mql(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  /* ------------------------------------------------------------ the tree */

  var seq = 0;
  function uid() { seq++; return "n" + Date.now().toString(36).slice(-5) + seq.toString(36); }

  function make(type, props, children, style) {
    var n = { id: uid(), type: type, props: props || {}, style: style || {} };
    if (isContainer(type)) n.children = children || [];
    return n;
  }

  function makeFrame(name, size) {
    return { id: uid(), name: name || "Frame", size: FRAME_WIDTH[size] ? size : "desktop", dark: false, context: "product", surface: "base", spacing: "", gap: "", root: { id: "root", type: "Root", props: {}, style: {}, children: [] } };
  }
  function emptyDoc() {
    var f = makeFrame("Frame 1", "desktop");
    return { frames: [f], active: f.id };
  }
  function active(doc) { return doc.frames.filter(function (f) { return f.id === doc.active; })[0] || doc.frames[0]; }
  function copy(doc) { return JSON.parse(JSON.stringify(doc)); }

  function locate(doc, id) {
    var frame = active(doc);
    if (id === "root") return { node: frame.root, parent: null, index: -1, path: [frame.root] };
    var out = null;
    (function walk(n, path) {
      (n.children || []).forEach(function (c, i) {
        if (out) return;
        if (c.id === id) out = { node: c, parent: n, index: i, path: path.concat([c]) };
        else if (c.children) walk(c, path.concat([c]));
      });
    })(frame.root, [frame.root]);
    return out;
  }

  function fresh(n) {
    var c = { id: uid(), type: n.type, props: Object.assign({}, n.props), style: Object.assign({}, n.style) };
    if (n.name) c.name = n.name;
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
    replace: function (doc, id, n) {
      var at = locate(doc, id);
      if (!at || !at.parent) return null;
      at.parent.children.splice(at.index, 1, n);
      return n.id;
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
     an import: known components, their own scalar props, an uploaded image or
     a URL where a media prop takes one, and option names from the token lists. */
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
      var spec = meta.props.filter(function (p) { return p.name === k; })[0];
      if (k === "minColumnWidth") { if (DATA.columnWidths.some(function (w) { return w.value === v; })) props[k] = v; return; }
      if (spec && spec.kind === "media") { if (typeof v === "string" && MEDIA_URL.test(v)) props[k] = v; return; }
      if (spec && spec.kind === "enum" && spec.options.indexOf(v) < 0) return;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") props[k] = v;
    });
    var style = {};
    /* Older layouts stored two-sided margins. */
    var st = Object.assign({}, n.style || {});
    if (st.marginY) { st.marginTop = st.marginTop || st.marginY; st.marginBottom = st.marginBottom || st.marginY; }
    if (st.marginX) { st.marginLeft = st.marginLeft || st.marginX; st.marginRight = st.marginRight || st.marginX; }
    Object.keys(st).forEach(function (k) {
      if (k === "dark") { if (st.dark === true) style.dark = true; return; }
      if (tokenOption(k, st[k])) style[k] = st[k];
    });
    var out = { id: typeof n.id === "string" && /^[\w-]{1,40}$/.test(n.id) ? n.id : uid(), type: n.type, props: props, style: style };
    /* A Group can be named by hand; a detached component keeps its old name
       on whatever container it became. */
    if (isContainer(n.type) && typeof n.name === "string" && n.name.trim()) out.name = n.name.trim().slice(0, 60);
    if (isContainer(n.type)) out.children = (Array.isArray(n.children) ? n.children : []).map(cleanNode).filter(Boolean);
    return out;
  }
  function cleanFrame(f, i) {
    var base = makeFrame("Frame " + (i + 1), "desktop");
    if (!f || typeof f !== "object") return base;
    if (typeof f.id === "string" && /^[\w-]{1,40}$/.test(f.id)) base.id = f.id;
    if (typeof f.name === "string" && f.name.trim()) base.name = f.name.trim().slice(0, 60);
    /* Older layouts named the size "viewport". */
    var size = f.size || f.viewport;
    base.size = FRAME_WIDTH[size] ? size : "desktop";
    base.dark = f.dark === true;
    base.context = CONTEXTS.some(function (c) { return c[0] === f.context; }) ? f.context : "product";
    base.surface = tokenOption("surface", f.surface) ? f.surface : "base";
    base.spacing = SPACINGS.some(function (s) { return s[0] === f.spacing; }) ? f.spacing : "";
    base.gap = DATA.rootGaps.indexOf(f.gap) >= 0 ? f.gap : "";
    var kids = f.root && Array.isArray(f.root.children) ? f.root.children : [];
    base.root.children = kids.map(cleanNode).filter(Boolean);
    var seen = {};
    (function dedupe(n) { (n.children || []).forEach(function (c) { if (seen[c.id]) c.id = uid(); seen[c.id] = true; dedupe(c); }); })(base.root);
    return base;
  }
  function clean(doc) {
    if (!doc || typeof doc !== "object") return emptyDoc();
    /* A layout saved before frames existed is one frame. */
    var frames = Array.isArray(doc.frames) && doc.frames.length ? doc.frames : [Object.assign({}, doc.page || {}, { root: doc.root })];
    var out = { frames: frames.slice(0, 24).map(cleanFrame), active: null };
    var ids = {};
    out.frames.forEach(function (f) { if (ids[f.id]) f.id = uid(); ids[f.id] = true; });
    out.active = ids[doc.active] ? doc.active : out.frames[0].id;
    return out;
  }

  /* ------------------------------------------------------------ starters */

  function one(name, size, children, extra) {
    var f = makeFrame(name, size);
    Object.assign(f, extra || {});
    f.root.children = children;
    return { frames: [f], active: f.id };
  }
  var STARTERS = [
    ["landing", "Landing page", function () {
      return one("Landing", "desktop", [
        make("HeroBlock"), make("FeatureGridBlock", { tone: "subtle" }), make("StatsBlock"),
        make("TestimonialBlock", { tone: "subtle" }), make("CtaBlock", { tone: "brand" }),
      ], { context: "marketing" });
    }],
    ["store", "Store page", function () {
      return one("Store", "desktop", [make("Navbar", { brand: "Kiln & Co." }), make("ProductGridBlock"), make("SplitBlock", { tone: "subtle" }), make("FaqBlock"), make("CtaBlock", { tone: "brand-muted" })]);
    }],
    ["settings", "Settings form", function () {
      return one("Settings", "desktop", [
        make("Section", { width: "narrow" }, [
          make("Stack", { layer: "block" }, [
            make("Heading", { children: "Workspace settings" }),
            make("Card", { eyebrow: "", title: "Profile", description: "How the workspace appears to its members." }, [
              make("Stack", { layer: "group" }, [make("Input"), make("Select"), make("Switch"), make("Checkbox")]),
            ]),
            make("Group", { justify: "flex-end", gap: "sm" }, [make("Button", { variant: "secondary", children: "Cancel" }), make("Button", { children: "Save changes" })]),
          ]),
        ]),
      ], { surface: "subtle" });
    }],
    ["chat", "Support chat (phone)", function () {
      return one("Support chat", "phone", [make("Stack", { gap: "md" }, [make("ChatBlock")], { padding: "md" })], { surface: "subtle" });
    }],
    ["blank", "Blank frame", function () { return emptyDoc(); }],
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
  /* Uploaded files are too big for a link; they stay in this browser. */
  function withoutUploads(doc) {
    var d = copy(doc), dropped = 0;
    (function walk(n) {
      Object.keys(n.props || {}).forEach(function (k) { if (typeof n.props[k] === "string" && /^data:/.test(n.props[k])) { delete n.props[k]; dropped++; } });
      (n.children || []).forEach(walk);
    })({ children: d.frames.map(function (f) { return f.root; }) });
    return { doc: d, dropped: dropped };
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
    if (mql("(max-width: 900px)")) first.frames[0].size = "phone";
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

  /* --------------------------------------------------------------- icons */

  var PATHS = {
    undo: ["M9 14 4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
    redo: ["m15 14 5-5-5-5", "M20 9H9a5 5 0 0 0 0 10h3"],
    down: ["m6 9 6 6 6-6"],
    right: ["m9 6 6 6-6 6"],
    copy: ["M8 8h12v12H8z", "M16 8V4H4v12h4"],
    trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
    code: ["m8 8-4 4 4 4", "M16 8l4 4-4 4"],
    link: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1", "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
    eye: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    plus: ["M12 5v14", "M5 12h14"],
    close: ["M6 6l12 12", "M18 6 6 18"],
    search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5"],
    check: ["m5 12 5 5 9-10"],
    alert: ["M12 8v5", "M12 16h.01", "M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
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
    detach: ["M9 4H4v5", "M15 4h5v5", "M20 15v5h-5", "M4 15v5h5", "m10 10 4 4", "m14 10-4 4"],
    frame: ["M6 3v18", "M18 3v18", "M3 6h18", "M3 18h18"],
    more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
    zoomIn: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5", "M11 8v6", "M8 11h6"],
    sides: ["M4 4h16v16H4z", "M4 9h16", "M4 15h16", "M9 4v16", "M15 4v16"],
    upload: ["M12 16V4", "m7 9 5-5 5 5", "M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"],
    pencil: ["M4 20h4l10.5-10.5a2 2 0 0 0-4-4L4 16z", "m13 7 4 4"],
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
      type: "button", role: "switch", className: cx("bd-switch", props.mixed && "is-mixed"), "aria-checked": props.mixed ? "mixed" : String(!!props.value), "aria-labelledby": props.labelledBy,
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
    var activeI = activeState[0], setActive = activeState[1];
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
      var width = Math.max(r.width, props.narrow ? 140 : 200);
      var below = window.innerHeight - r.bottom - 12;
      var above = r.top - 12;
      var want = Math.min(340, options.length * 44 + 12);
      var up = below < want && above > below;
      var left = props.alignEnd ? r.right - width : r.left;
      setPos({
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)), width: width,
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
      var l = list.current;
      var el = l.querySelector('[data-i="' + activeI + '"]');
      if (!el) return;
      if (el.offsetTop < l.scrollTop) l.scrollTop = el.offsetTop;
      else if (el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = el.offsetTop + el.offsetHeight - l.clientHeight;
    }, [open, activeI]);

    var onListKey = function (ev) {
      var k = ev.key;
      if (k === "ArrowDown") { ev.preventDefault(); setActive(Math.min(options.length - 1, activeI + 1)); }
      else if (k === "ArrowUp") { ev.preventDefault(); setActive(Math.max(0, activeI - 1)); }
      else if (k === "Home") { ev.preventDefault(); setActive(0); }
      else if (k === "End") { ev.preventDefault(); setActive(options.length - 1); }
      else if (k === "Enter" || k === " ") { ev.preventDefault(); choose(options[activeI]); }
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

    var label = props.menu ? props.placeholder : props.mixed ? "Mixed" : selected ? (selected.label || String(selected.value)) : props.placeholder || "None";
    return e(React.Fragment, null,
      e("button", {
        ref: btn, id: ids.btn, type: "button", className: cx("bd-dd", props.compact && "bd-dd-compact", props.mixed && "is-mixed", props.className),
        "aria-haspopup": props.menu ? "menu" : "listbox", "aria-expanded": String(open), "aria-controls": open ? ids.list : undefined,
        "aria-labelledby": props.labelledBy ? props.labelledBy + " " + ids.btn : undefined, "aria-label": props.labelledBy ? undefined : props.label,
        title: props.title, disabled: props.disabled,
        onClick: function () { if (open) close(false); else show(); },
        onKeyDown: function (ev) { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); show(); } },
      },
        props.icon ? e(Icon, { name: props.icon }) : selected && selected.icon && props.iconValue ? e(Icon, { name: selected.icon }) : null,
        !props.menu && selected && !props.mixed ? e(Preview, { option: selected, kind: props.preview }) : null,
        props.iconOnly ? e("span", { className: "visually-hidden" }, label) : e("span", { className: "bd-dd-label" }, label),
        e(Icon, { name: "down", className: "bd-dd-chev" })),
      open && pos ? ReactDOM.createPortal(e("ul", {
        ref: list, id: ids.list, role: props.menu ? "menu" : "listbox", tabIndex: -1, className: "bd-dd-list",
        "aria-labelledby": props.labelledBy || ids.btn, "aria-activedescendant": ids.list + "-" + activeI,
        style: { left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.maxHeight },
        onKeyDown: onListKey,
      }, options.map(function (o, i) {
        var isSel = !props.menu && !props.mixed && o.value === props.value;
        return e("li", {
          key: String(o.value), id: ids.list + "-" + i, "data-i": i, role: props.menu ? "menuitem" : "option",
          "aria-selected": props.menu ? undefined : String(isSel), "aria-disabled": o.disabled ? "true" : undefined,
          className: cx("bd-dd-opt", i === activeI && "is-active", isSel && "is-selected", o.disabled && "is-disabled", o.danger && "is-danger"),
          onPointerMove: function () { if (activeI !== i) setActive(i); },
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
      e("h3", { className: "bd-sec-h" }, props.title),
      props.children);
  }

  /* A name that turns into a text field on double-click, Enter or F2. */
  function Renamable(props) {
    var editState = useState(!!props.startEditing);
    var editing = editState[0], setEditing = editState[1];
    var input = useRef(null);
    useEffect(function () { if (editing && input.current) { input.current.focus(); input.current.select(); } }, [editing]);
    useEffect(function () { if (props.startEditing) setEditing(true); }, [props.startEditing]);
    if (editing) {
      return e("input", {
        ref: input, className: cx("bd-rename", props.className), type: "text", defaultValue: props.value, "aria-label": props.label, maxLength: 60,
        onBlur: function (ev) { setEditing(false); props.onChange(ev.target.value.trim()); },
        onKeyDown: function (ev) {
          ev.stopPropagation();
          if (ev.key === "Enter") { ev.preventDefault(); ev.target.blur(); }
          if (ev.key === "Escape") { ev.preventDefault(); ev.target.value = props.value; ev.target.blur(); }
        },
        onPointerDown: function (ev) { ev.stopPropagation(); },
      });
    }
    return e("span", {
      className: props.className, title: props.hint || "Double-click to rename", tabIndex: props.focusable ? 0 : undefined,
      onDoubleClick: function (ev) { ev.stopPropagation(); setEditing(true); },
      onKeyDown: props.focusable ? function (ev) { if (ev.key === "F2" || ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); setEditing(true); } } : undefined,
    }, props.value);
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
        var s = Math.min(props.wide ? 1 : 1.6, (W - 12) / w, (H - 12) / h);
        stage.style.transform = "translate(" + Math.max(0, (W - w * s) / 2) + "px, " + Math.max(0, (H - h * s) / 2) + "px) scale(" + s + ")";
        stage.style.opacity = "1";
      };
      var draw = function () {
        if (done) return;
        done = true;
        stage = document.createElement("div");
        stage.className = "bd-thumb-stage";
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

  /* A text field laid over the node whose text it edits, in the same type. */
  function InlineEditor(props) {
    var ref = useRef(null);
    useEffect(function () {
      var el = ref.current;
      if (!el) return;
      el.focus();
      el.select();
    }, []);
    var box = props.box, font = props.font || {}, s = props.scale;
    var px = function (v) { var n = parseFloat(v); return isNaN(n) ? undefined : n * s + "px"; };
    return e("textarea", {
      ref: ref, className: "bd-inline", value: props.value, "aria-label": "Edit text", rows: 1, spellCheck: false,
      style: {
        left: box.left, top: box.top, width: Math.max(box.width, 80 * s), minHeight: box.height,
        fontFamily: font.fontFamily, fontSize: px(font.fontSize), fontWeight: font.fontWeight, lineHeight: px(font.lineHeight) || "normal",
        letterSpacing: px(font.letterSpacing), textAlign: font.textAlign, color: font.color, textTransform: font.textTransform,
      },
      onChange: function (ev) { props.onChange(ev.target.value); },
      onKeyDown: function (ev) {
        ev.stopPropagation();
        if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); props.onDone(true); }
        if (ev.key === "Escape") { ev.preventDefault(); props.onDone(false); }
      },
      onBlur: function () { props.onDone(true); },
      onPointerDown: function (ev) { ev.stopPropagation(); },
    });
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
    var detachableState = useState({});
    var detachable = detachableState[0], setDetachable = detachableState[1];
    var codeState = useState("");
    var code = codeState[0], setCode = codeState[1];
    var sayState = useState("");
    var say = sayState[0], setSay = sayState[1];
    var savedState = useState({ ok: true, at: null });
    var saved = savedState[0], setSaved = savedState[1];
    var boxState = useState({ w: 0, h: 0 });
    var box = boxState[0], setBox = boxState[1];
    var zoomState = useState("fit");
    var zoom = zoomState[0], setZoom = zoomState[1];
    var dragState = useState(null);
    var drag = dragState[0], setDrag = dragState[1];
    var marksState = useState({ sel: [], hover: null, drop: null });
    var marks = marksState[0], setMarks = marksState[1];
    var listDropState = useState(null);
    var listDrop = listDropState[0], setListDrop = listDropState[1];
    var editState = useState(null);
    var edit = editState[0], setEdit = editState[1];
    var wideState = useState(function () { return mql("(min-width: 901px)"); });
    var wide = wideState[0], setWide = wideState[1];
    var sidesState = useState({});
    var sidesOpen = sidesState[0], setSidesOpen = sidesState[1];
    var renameState = useState(null);
    var renaming = renameState[0], setRenaming = renameState[1];

    var frame = active(doc);
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
    var editRef = useRef(edit); editRef.current = edit;
    var justDragged = useRef(false);

    var api = function () {
      var f = frameRef.current;
      try { return f && f.contentWindow && f.contentWindow.BuilderFrame; } catch (err) { return null; }
    };

    var announce = useCallback(function (text) { setSay(""); setTimeout(function () { setSay(text); }, 30); }, []);
    var select = useCallback(function (ids) { setSelection(ids.filter(function (x) { return x && x !== "root"; })); }, []);

    var snapshot = useCallback(function () {
      history.current.past.push(JSON.stringify(docRef.current));
      if (history.current.past.length > 100) history.current.past.shift();
      history.current.future = [];
    }, []);
    var commit = useCallback(function (next, nextSel, message) {
      snapshot();
      setDoc(next);
      if (nextSel !== undefined) select(nextSel === null || nextSel === "root" ? [] : [].concat(nextSel));
      if (message) announce(message);
    }, [announce, select, snapshot]);

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
       storage, or too many uploads), so work is never lost quietly. */
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
    useEffect(function () {
      if (!window.matchMedia) return;
      var m = window.matchMedia("(min-width: 901px)");
      var on = function () { setWide(m.matches); };
      m.addEventListener("change", on);
      return function () { m.removeEventListener("change", on); };
    }, []);
    /* The selection belongs to one frame. */
    useEffect(function () { setSelection([]); setEdit(null); }, [doc.active]);

    /* ------------------------------------------------- canvas plumbing */

    var vpWidth = FRAME_WIDTH[frame.size] || 1280;
    var PAD = 16;
    var fitScale = box.w ? Math.min(1, (box.w - PAD * 2) / vpWidth) : 1;
    var scale = zoom === "fit" ? fitScale : zoom;
    var innerW = Math.max(box.w, vpWidth * scale + PAD * 2);
    var frameH = box.h ? Math.max(200, (box.h - PAD * 2) / scale) : 800;
    var offX = Math.max(PAD, (innerW - vpWidth * scale) / 2);
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

    /* Ctrl or Cmd and the wheel zooms the canvas; the keys below do too. */
    var fitScaleRef = useRef(fitScale); fitScaleRef.current = fitScale;
    useEffect(function () {
      var el = stageRef.current;
      if (!el) return;
      var onWheel = function (ev) {
        if (!(ev.ctrlKey || ev.metaKey)) return;
        ev.preventDefault();
        setZoom(function (z) {
          var cur = z === "fit" ? fitScaleRef.current : z;
          var next = Math.min(2, Math.max(0.25, cur * (ev.deltaY < 0 ? 1.1 : 0.9)));
          return Math.round(next * 100) / 100;
        });
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return function () { el.removeEventListener("wheel", onWheel); };
    }, []);
    var zoomBy = function (dir) {
      setZoom(function (z) {
        var cur = z === "fit" ? fitScaleRef.current : z;
        var steps = ZOOMS.filter(function (x) { return x[0] !== "fit"; }).map(function (x) { return x[0]; });
        var next = dir > 0 ? steps.filter(function (s) { return s > cur + 0.01; })[0] : steps.filter(function (s) { return s < cur - 0.01; }).pop();
        return next === undefined ? z : next;
      });
    };

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
      var ed = editRef.current;
      if (ed) {
        var t = f.textRect(ed.id, ed.value);
        if (t) setEdit(function (cur) { return cur && cur.id === ed.id ? Object.assign({}, cur, { box: toStage(t.rect), font: t.font }) : cur; });
      }
    }, [toStage]);
    var remeasureRef = useRef(remeasure); remeasureRef.current = remeasure;

    /* ------------------------------------------------- dragging */

    var resolve = function (x, y, payload) {
      var list = layersRef.current;
      var el = document.elementFromPoint(x, y);
      if (list && el && list.contains(el)) return listTarget(el, y, payload);
      var fr = frameRef.current;
      var f = api();
      if (!fr || !f) return null;
      var r = fr.getBoundingClientRect();
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
      var root = active(d).root;
      if (!row) return { where: "list", parent: "root", index: root.children.length, indicator: { top: layersRef.current.scrollHeight - 2, left: 8 } };
      var id = row.getAttribute("data-layer");
      if (id === "root") return { where: "list", parent: "root", index: 0, indicator: { top: row.offsetTop + row.offsetHeight, left: 8 } };
      var at = locate(d, id);
      if (!at) return null;
      if (payload.id && at.path.some(function (n) { return n.id === payload.id; })) return null;
      var r = row.getBoundingClientRect();
      var depth = Number(row.getAttribute("data-depth")) || 0;
      var rel = (y - r.top) / r.height;
      if (at.node.children && rel > 0.3 && rel < 0.7) return { where: "list", parent: id, index: at.node.children.length, inside: id };
      var after = rel >= 0.5;
      return { where: "list", parent: at.parent.id, index: at.index + (after ? 1 : 0), indicator: { top: row.offsetTop + (after ? row.offsetHeight : 0), left: 8 + depth * 14 } };
    };

    var show = function (hit) {
      setListDrop(hit && hit.where === "list" ? hit : null);
      setMarks(function (m) {
        return Object.assign({}, m, { drop: hit && hit.where === "canvas" ? { line: hit.line ? thick(toStageRef.current(hit.line)) : null, box: hit.box ? toStageRef.current(hit.box) : null } : null });
      });
    };

    var autoscroll = function (x, y) {
      var fr = frameRef.current;
      if (fr) {
        var r = fr.getBoundingClientRect();
        if (x >= r.left && x <= r.right) {
          if (y - r.top < 48 && y >= r.top - 24) fr.contentWindow.scrollBy(0, -14);
          else if (r.bottom - y < 48 && y <= r.bottom + 24) fr.contentWindow.scrollBy(0, 14);
        }
      }
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
        pick: function (id, additive, deep) { pickRef.current(id, additive, deep, "canvas"); },
        edit: function (id) { beginEditRef.current(id); },
        hover: function (id) { if (hoverRef.current !== id) setHover(id); },
        key: function (ev) { return keyRef.current(ev); },
        moved: function () {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () { remeasureRef.current(); });
        },
        dragStart: function (id) {
          var at = locate(docRef.current, id);
          if (!at) return;
          dragRef.current = { payload: { kind: "move", id: id, label: at.node.type }, active: true };
          if (selRef.current.indexOf(id) < 0) select([id]);
        },
        dragMove: function (fx, fy) {
          var fr = frameRef.current;
          if (!fr || !dragRef.current) return;
          var r = fr.getBoundingClientRect();
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
        var ok = {}, sc = {}, det = {};
        Object.keys(META).forEach(function (n) { ok[n] = f.has(n) && (META[n].container || f.hasStarter(n)); sc[n] = f.scalars(n); det[n] = f.canDetach(n); });
        setPlaceable(ok);
        setScalars(sc);
        setDetachable(det);
      }
      f.render({ page: { dark: frame.dark, context: frame.context, surface: frame.surface, spacing: frame.spacing, gap: frame.gap }, root: frame.root }, { preview: preview });
    }, [ready, doc, preview]);

    useEffect(function () { remeasure(); }, [selection, hover, scale, offX, box.h, edit && edit.id]);
    useEffect(function () { if (rightRef.current) rightRef.current.scrollTop = 0; }, [sel]);

    /* ------------------------------------------------- selecting */

    var textPropOf = function (node) {
      var base = scalars[node.type] || {};
      for (var i = 0; i < TEXT_PROPS.length; i++) {
        var k = TEXT_PROPS[i];
        if (k === "children" && isContainer(node.type)) continue;
        if (typeof node.props[k] === "string" || typeof base[k] === "string") return k;
      }
      return null;
    };

    /* Shift adds to the selection; Cmd or Ctrl selects and goes straight to
       the text. A click on nothing clears it. */
    var pick = function (id, additive, deep, from) {
      if (!id || id === "root") { if (!additive) select([]); return; }
      var cur = selRef.current;
      if (additive) {
        select(cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]));
        return;
      }
      select([id]);
      if (deep) { setTimeout(function () { beginEditRef.current(id); }, 0); return; }
      if (from === "canvas" && mql("(max-width: 900px)")) {
        var at = locate(docRef.current, id);
        announce((at ? at.node.type : "") + " selected. Open Edit to change it.");
      }
    };
    var pickRef = useRef(pick); pickRef.current = pick;

    /* Typing into the canvas: the text prop of the node, edited where it is.
       The whole edit is one undo step; Escape puts the old text back. */
    var beginEdit = function (id) {
      var at = locate(docRef.current, id);
      var f = api();
      if (!at || !f) return;
      var prop = textPropOf(at.node);
      if (!prop) { select([id]); return; }
      var base = scalars[at.node.type] || {};
      var value = typeof at.node.props[prop] === "string" ? at.node.props[prop] : String(base[prop] || "");
      var t = f.textRect(id, value);
      if (!t) return;
      select([id]);
      snapshot();
      setEdit({ id: id, prop: prop, value: value, before: value, box: toStageRef.current(t.rect), font: t.font });
      if (mql("(max-width: 900px)")) setPane("canvas");
    };
    var beginEditRef = useRef(beginEdit); beginEditRef.current = beginEdit;
    var editChange = function (value) {
      var ed = editRef.current;
      if (!ed) return;
      setEdit(Object.assign({}, ed, { value: value }));
      var next = copy(docRef.current);
      var at = locate(next, ed.id);
      if (!at) return;
      at.node.props[ed.prop] = value;
      setDoc(next);
    };
    var editDone = function (keep) {
      var ed = editRef.current;
      if (!ed) return;
      setEdit(null);
      if (!keep) {
        var prev = history.current.past.pop();
        if (prev) setDoc(JSON.parse(prev));
        announce("Edit cancelled");
      } else if (ed.value === ed.before) history.current.past.pop();
    };

    /* ------------------------------------------------- placing things */

    var target = function () {
      var d = docRef.current;
      var s = selRef.current;
      var id = s.length ? s[s.length - 1] : null;
      var at = id ? locate(d, id) : null;
      if (!at) return { parent: "root", index: active(d).root.children.length };
      if (isContainer(at.node.type)) return { parent: at.node.id, index: at.node.children.length };
      return { parent: at.parent.id, index: at.index + 1 };
    };

    var add = function (type, where) {
      var t = where || target();
      var n = make(type);
      var parentName = t.parent === "root" ? "the frame" : (locate(docRef.current, t.parent) || { node: { type: "frame" } }).node.type;
      change(function (d) { return ops.insert(d, t.parent, t.index, n); }, "Added " + type + " to " + parentName);
      if (mql("(max-width: 900px)")) setPane("canvas");
    };

    var actions = {
      remove: function () {
        var ids = selRef.current.slice();
        if (!ids.length) return;
        change(function (d) { return ops.remove(d, ids); }, ids.length > 1 ? "Deleted " + ids.length + " items" : "Deleted");
      },
      duplicate: function () {
        var ids = selRef.current.slice();
        if (!ids.length) return;
        var made = [];
        change(function (d) { ids.forEach(function (id) { var c = ops.duplicate(d, id); if (c) made.push(c); }); return made.length ? made : null; }, "Duplicated");
      },
      up: function () { var id = selRef.current[selRef.current.length - 1]; if (id && change(function (d) { return ops.nudge(d, id, -1); }, "Moved up")) select([id]); },
      down: function () { var id = selRef.current[selRef.current.length - 1]; if (id && change(function (d) { return ops.nudge(d, id, 1); }, "Moved down")) select([id]); },
      /* Enter goes into the selection: a container's children, or a leaf's text. */
      into: function () {
        var d = docRef.current;
        var ids = selRef.current;
        if (!ids.length) { if (active(d).root.children.length) select(active(d).root.children.map(function (c) { return c.id; })); return; }
        var kids = [];
        ids.forEach(function (id) { var at = locate(d, id); if (at && at.node.children) kids.push.apply(kids, at.node.children.map(function (c) { return c.id; })); });
        if (kids.length) { select(kids); announce(kids.length + " selected"); return; }
        if (ids.length === 1) beginEdit(ids[0]);
      },
      /* Shift+Enter goes out to the parents. */
      out: function () {
        var d = docRef.current;
        var parents = [];
        selRef.current.forEach(function (id) { var at = locate(d, id); if (at && at.parent && at.parent.id !== "root" && parents.indexOf(at.parent.id) < 0) parents.push(at.parent.id); });
        select(parents);
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
      /* The component rebuilt from primitives, where the canvas has a recipe. */
      detach: function () {
        var id = selRef.current[selRef.current.length - 1];
        var at = id && locate(docRef.current, id);
        var f = api();
        if (!at || !f) return;
        var built = f.detach(at.node);
        var node = built && cleanNode(built);
        if (!node) { announce(at.node.type + " has no primitive version yet"); return; }
        if (isContainer(node.type) && !node.name) node.name = at.node.type;
        change(function (d) { return ops.replace(d, id, node); }, at.node.type + " detached into primitives");
      },
      rename: function () { var id = selRef.current[selRef.current.length - 1]; if (id) setRenaming(id); },
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
      if (mod && (ev.key === "=" || ev.key === "+")) { zoomBy(1); return true; }
      if (mod && ev.key === "-") { zoomBy(-1); return true; }
      if (mod && ev.key === "0") { setZoom("fit"); return true; }
      if (ev.key === "Enter") { (ev.shiftKey ? actions.out : actions.into)(); return true; }
      if (ev.key === "Escape") { select([]); return true; }
      if (!selRef.current.length) return false;
      if (mod && key === "g") { (ev.shiftKey ? actions.ungroup : actions.group)(); return true; }
      if (ev.key === "Delete" || ev.key === "Backspace") { actions.remove(); return true; }
      if (mod && key === "d") { actions.duplicate(); return true; }
      if ((ev.altKey || mod) && ev.key === "ArrowUp") { actions.up(); return true; }
      if ((ev.altKey || mod) && ev.key === "ArrowDown") { actions.down(); return true; }
      if (ev.key === "F2") { actions.rename(); return true; }
      return false;
    };
    useEffect(function () {
      var onKey = function (ev) {
        /* The toolbar renders into the site header, outside the builder's box. */
        var inside = mountEl.contains(ev.target) || ev.target === document.body || (ev.target.closest && ev.target.closest("#app-toolbar"));
        if (!inside) return;
        if (keyRef.current(ev)) ev.preventDefault();
      };
      document.addEventListener("keydown", onKey);
      return function () { document.removeEventListener("keydown", onKey); };
    }, []);

    /* ------------------------------------------------- settings */

    var setFrame = function (key, value, message) { change(function (d) { active(d)[key] = value; return undefined; }, message); };
    /* Props and styles apply to every selected node, so several of the same
       kind change together. */
    var setProp = function (ids, key, value) {
      change(function (d) {
        var any = false;
        [].concat(ids).forEach(function (id) { var at = locate(d, id); if (!at) return; any = true; if (value === undefined) delete at.node.props[key]; else at.node.props[key] = value; });
        return any ? undefined : null;
      });
    };
    var setStyle = function (ids, key, value) {
      change(function (d) {
        var any = false;
        [].concat(ids).forEach(function (id) { var at = locate(d, id); if (!at) return; any = true; if (value === undefined || value === "") delete at.node.style[key]; else at.node.style[key] = value; });
        return any ? undefined : null;
      });
    };
    var setName = function (id, name) { change(function (d) { var at = locate(d, id); if (!at) return null; if (name) at.node.name = name; else delete at.node.name; return undefined; }); };

    var frameOps = {
      add: function () {
        var f = makeFrame("Frame " + (docRef.current.frames.length + 1), active(docRef.current).size);
        change(function (d) { d.frames.push(f); d.active = f.id; return undefined; }, "Added " + f.name);
      },
      duplicate: function (id) {
        change(function (d) {
          var src = d.frames.filter(function (x) { return x.id === id; })[0];
          if (!src) return null;
          var c = copy(src);
          c.id = uid();
          c.name = src.name + " copy";
          c.root = fresh(src.root);
          c.root.id = "root";
          d.frames.splice(d.frames.indexOf(src) + 1, 0, c);
          d.active = c.id;
          return undefined;
        }, "Duplicated frame");
      },
      remove: function (id) {
        if (docRef.current.frames.length < 2) return;
        var f = docRef.current.frames.filter(function (x) { return x.id === id; })[0];
        if (f && f.root.children.length && !window.confirm("Delete " + f.name + "? Undo brings it back.")) return;
        change(function (d) {
          var i = d.frames.findIndex(function (x) { return x.id === id; });
          if (i < 0) return null;
          d.frames.splice(i, 1);
          if (d.active === id) d.active = (d.frames[i] || d.frames[i - 1]).id;
          return undefined;
        }, "Deleted frame");
      },
      rename: function (id, name) { setRenaming(null); if (name) change(function (d) { var f = d.frames.filter(function (x) { return x.id === id; })[0]; if (!f || f.name === name) return null; f.name = name; return undefined; }); },
      show: function (id) { if (id !== docRef.current.active) change(function (d) { d.active = id; return undefined; }); },
    };

    var openCode = function () {
      var f = api();
      if (!f) return;
      var fr = active(docRef.current);
      setCode(f.jsx({ page: fr, root: fr.root }, fr.name));
      var dlg = dialogRef.current;
      if (dlg && dlg.showModal) dlg.showModal();
    };

    var share = function () {
      var out = withoutUploads(docRef.current);
      var url = location.origin + location.pathname + "#b=" + encode(out.doc);
      copyText(url).then(function () {
        announce(out.dropped ? "Link copied. Uploaded files aren't in it; they stay in this browser." : "Link copied. Anyone with it opens these frames.");
      }, function () { window.prompt("Copy this link", url); });
    };

    var startFrom = function (id) {
      var s = STARTERS.filter(function (x) { return x[0] === id; })[0];
      if (!s) return;
      var has = docRef.current.frames.some(function (f) { return f.root.children.length; });
      if (has && !window.confirm("Replace every frame with the " + s[1].toLowerCase() + "? Undo brings your work back.")) return;
      storage(function (st) { st.setItem(BACKUP_KEY, JSON.stringify(docRef.current)); });
      commit(s[2](), null, "Started from " + s[1] + ". Undo to go back.");
    };

    /* ------------------------------------------------- rendering helpers */

    var labelOf = function (n) {
      if (n.name) return n.name;
      var base = scalars[n.type] || {};
      var text = n.props.children != null ? n.props.children : n.props.title != null ? n.props.title : n.props.label != null ? n.props.label : base.children || base.title || base.label || base.name || base.brand;
      return typeof text === "string" || typeof text === "number" ? String(text) : "";
    };
    var typeIcon = function (type) {
      if (type === "Group") return "group";
      if (isContainer(type)) return "box";
      return "component";
    };
    var nodesOf = function (ids) { return ids.map(function (id) { return locate(doc, id); }).filter(Boolean).map(function (a) { return a.node; }); };
    var same = function (values) { return values.every(function (v) { return JSON.stringify(v) === JSON.stringify(values[0]); }); };

    var tokenDropdown = function (key, nodes, id, compact) {
      var def = DATA.tokens[key];
      var values = nodes.map(function (n) { return n.style[key] || ""; });
      var mixed = !same(values);
      var value = mixed ? "" : values[0];
      var options = [{ value: "", label: "None" }].concat(def.options.map(function (o) {
        return { value: o.value, label: o.label || o.value, hint: o.tokens.join(" · ") || "CSS keyword", tokens: o.tokens };
      }));
      return e(Dropdown, { labelledBy: id, value: value, mixed: mixed, options: options, preview: def.preview, compact: compact, narrow: compact,
        onChange: function (v) { setStyle(nodes.map(function (n) { return n.id; }), key, v); } });
    };

    /* A token with one value for every side, or one per side behind a toggle. */
    var tokenControl = function (key, nodes, id) {
      var def = DATA.tokens[key];
      var cur = !nodes.some(function (n) { return n.style[key] !== nodes[0].style[key]; }) ? tokenOption(key, nodes[0].style[key]) : null;
      var sides = def.sides;
      var anySide = sides && nodes.some(function (n) { return sides.some(function (k) { return n.style[k]; }); });
      var open = !!sidesOpen[key] || anySide;
      return e(Field, { key: key, id: id, label: def.label, hint: cur ? cur.tokens.join(" · ") || null : null },
        e("div", { className: "bd-sides-row" },
          tokenDropdown(key, nodes, id),
          sides ? e("button", {
            type: "button", className: "bd-act bd-act-sm", "aria-pressed": String(open), title: "Each side on its own", "aria-label": def.label + ", each side",
            onClick: function () { setSidesOpen(function (s) { var n = Object.assign({}, s); n[key] = !open; return n; }); },
          }, e(Icon, { name: "sides" })) : null),
        sides && open ? e("div", { className: "bd-sides" }, sides.map(function (k) {
          var sdef = DATA.tokens[k];
          var sid = id + "-" + k;
          return e("span", { key: k, className: "bd-side" },
            e("span", { className: "bd-side-l", id: sid, title: sdef.label }, sdef.side[0].toUpperCase()),
            tokenDropdown(k, nodes, sid, true));
        })) : null);
    };

    var propControl = function (p, nodes) {
      var first = nodes[0];
      var id = "bd-p-" + first.id + "-" + p.name;
      var base = scalars[first.type] || {};
      var dflt = p.default != null ? (p.kind === "boolean" ? p.default === "true" : p.kind === "number" ? Number(p.default) : p.default) : undefined;
      var values = nodes.map(function (n) { var own = n.props[p.name]; return own !== undefined ? own : base[p.name] !== undefined ? base[p.name] : dflt; });
      var mixed = !same(values);
      var current = mixed ? undefined : values[0];
      var ids = nodes.map(function (n) { return n.id; });
      var set = function (v) { setProp(ids, p.name, v); };
      var label = words(p.name);
      var control;
      if (p.kind === "media") {
        var src = typeof current === "string" ? current : "";
        var fileId = id + "-file";
        var isVideo = /^data:video|\.(mp4|webm|mov)(\?|$)/i.test(src);
        control = e("div", { className: "bd-media" },
          src ? e("span", { className: "bd-media-thumb", style: isVideo ? undefined : { backgroundImage: "url(" + JSON.stringify(src) + ")" }, "aria-hidden": true }, isVideo ? e(Icon, { name: "file" }) : null) : null,
          e("div", { className: "bd-media-actions" },
            e("label", { className: "bd-btn", htmlFor: fileId }, e(Icon, { name: "upload" }), "Upload"),
            e("input", { id: fileId, type: "file", className: "visually-hidden", accept: p.name === "poster" || first.type !== "Video" ? "image/*" : "video/*,image/*",
              onChange: function (ev) {
                var file = ev.target.files && ev.target.files[0];
                ev.target.value = "";
                if (!file) return;
                if (file.size > MEDIA_LIMIT) { announce("That file is over 1.5 MB. Paste a URL instead, or use a smaller file."); return; }
                var reader = new FileReader();
                reader.onload = function () { set(String(reader.result)); announce("Uploaded " + file.name + ". It stays in this browser and isn't in share links."); };
                reader.readAsDataURL(file);
              } }),
            src ? e("button", { type: "button", className: "bd-btn", onClick: function () { set(undefined); } }, e(Icon, { name: "close" }), "Clear") : null),
          e("input", { className: "bd-input", type: "url", "aria-label": label + " URL", placeholder: mixed ? "Mixed" : "or paste a URL", value: /^data:/.test(src) ? "" : src,
            onChange: function (ev) { var v = ev.target.value.trim(); set(v && MEDIA_URL.test(v) ? v : undefined); } }));
        return e(Field, { key: p.name, id: id, label: label, note: p.note, hint: /^data:/.test(src) ? "Uploaded file" : null }, control);
      }
      if (p.kind === "enum") {
        var icons = ENUM_ICONS[p.name];
        if (icons && p.options.every(function (o) { return icons[o]; })) {
          control = e(Segmented, { labelledBy: id, value: current, onChange: set, options: p.options.map(function (o) { return { value: o, label: ENUM_LABEL[o] || words(o), icon: icons[o] }; }) });
        } else if (p.options.length <= 3 && p.options.every(function (o) { return String(o).length <= 9; })) {
          control = e(Segmented, { labelledBy: id, value: current, onChange: set, wide: true, options: p.options.map(function (o) { return { value: o, label: String(o) }; }) });
        } else {
          control = e(Dropdown, { labelledBy: id, value: current, mixed: mixed, onChange: set, placeholder: "Default",
            options: p.options.map(function (o) { return { value: o, label: ENUM_LABEL[o] || String(o) }; }) });
        }
      } else if (p.kind === "boolean") {
        return e(Field, { key: p.name, id: id, label: label, note: p.note, inline: true }, e(Switch, { labelledBy: id, value: !!current, mixed: mixed, onChange: set }));
      } else if (p.kind === "number" && first.type === "Grid" && p.name === "columns") {
        control = e(Dropdown, { labelledBy: id, value: current, mixed: mixed, onChange: set, options: [1, 2, 3, 4, 5, 6].map(function (n) { return { value: n, label: n + (n === 1 ? " column" : " columns") }; }) });
      } else if (p.kind === "number") {
        control = e("input", { className: "bd-input", type: "number", "aria-labelledby": id, placeholder: mixed ? "Mixed" : "", value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : Number(ev.target.value)); } });
      } else if (p.kind === "text" || (p.kind === "node" && typeof base[p.name] === "string")) {
        control = e("input", { className: "bd-input", type: "text", "aria-labelledby": id, placeholder: mixed ? "Mixed" : "", value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : ev.target.value); } });
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
        })(frame.root, []);
      }
      (function walk(n, depth) {
        (n.children || []).forEach(function (c) {
          if (keep && !keep[c.id]) return;
          rows.push({ n: c, depth: depth });
          if (c.children && (q || !collapsed[c.id])) walk(c, depth + 1);
        });
      })(frame.root, 0);
      var toggle = function (id) { setCollapsed(function (c) { var n = Object.assign({}, c); if (n[id]) delete n[id]; else n[id] = true; return n; }); };
      return e("div", { className: "bd-layers-panel" },
        e("label", { className: "bd-search" },
          e(Icon, { name: "search" }),
          e("span", { className: "visually-hidden" }, "Filter layers"),
          e("input", { type: "search", placeholder: "Filter layers", value: layerQuery, onChange: function (ev) { setLayerQuery(ev.target.value); } })),
        e("div", { className: "bd-layers", ref: layersRef, role: "tree", "aria-label": "Layers", "aria-multiselectable": "true" },
          e("div", { className: cx("bd-layer", !sel && "is-current"), "data-layer": "root", role: "treeitem", "aria-selected": String(!sel) },
            e("button", { type: "button", className: "bd-layer-main", onClick: function () { select([]); } },
              e(Icon, { name: "frame" }), e("span", { className: "bd-layer-name" }, frame.name))),
          rows.length ? null : e("p", { className: "bd-empty-note" }, q ? "No layers match." : "The frame is empty. Add something from Assets."),
          rows.map(function (r) {
            var n = r.n;
            var text = labelOf(n);
            var on = selection.indexOf(n.id) >= 0;
            var open = !collapsed[n.id] || !!q;
            var renameable = n.type === "Group";
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
                onClick: function (ev) { if (!justDragged.current) pick(n.id, ev.shiftKey || ev.metaKey || ev.ctrlKey, false, "layers"); },
                onDoubleClick: function () { if (renameable) setRenaming(n.id); },
                onPointerDown: function (ev) { if (ev.pointerType === "mouse") startDrag(ev, { kind: "move", id: n.id, label: n.name || n.type }); },
              },
                e(Icon, { name: typeIcon(n.type) }),
                renameable && renaming === n.id
                  ? e(Renamable, { value: n.name || "Group", label: "Group name", startEditing: true, className: "bd-layer-name", onChange: function (v) { setRenaming(null); setName(n.id, v === "Group" ? "" : v); } })
                  : e("span", { className: "bd-layer-name" }, n.name || n.type),
                text && !n.name ? e("span", { className: "bd-layer-text" }, text) : null));
          }),
          listDrop && listDrop.indicator ? e("div", { className: "bd-layers-line", style: { top: listDrop.indicator.top + "px", left: listDrop.indicator.left + "px" }, "aria-hidden": true }) : null),
        e("p", { className: "bd-tip" }, "Drag rows to reorder or nest. Shift-click to select several. Double-click a group to rename it."));
    };

    var frameInspector = function () {
      var surfaceOptions = DATA.tokens.surface.options.map(function (o) { return { value: o.value, label: o.value, hint: o.tokens[0], tokens: o.tokens }; });
      var cur = DATA.tokens.surface.options.filter(function (o) { return o.value === frame.surface; })[0];
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("h2", { className: "bd-inspect-title" }, e(Icon, { name: "frame" }),
            e(Renamable, { value: frame.name, label: "Frame name", focusable: true, className: "bd-title-name", startEditing: renaming === "frame:" + frame.id, onChange: function (v) { frameOps.rename(frame.id, v); } })),
          e("p", { className: "bd-inspect-sub" }, "Select something on the canvas or in the layers to change it. Light or dark is in the toolbar."),
          e("div", { className: "bd-actions" },
            e("button", { type: "button", className: "bd-btn", onClick: function () { frameOps.duplicate(frame.id); } }, e(Icon, { name: "copy" }), "Duplicate frame"),
            doc.frames.length > 1 ? e("button", { type: "button", className: "bd-btn", onClick: function () { frameOps.remove(frame.id); } }, e(Icon, { name: "trash" }), "Delete") : null)),
        e(Section, { title: "Frame" },
          e(Field, { id: "bd-fr-size", label: "Size" },
            e(Dropdown, { labelledBy: "bd-fr-size", value: frame.size, iconValue: true, onChange: function (v) { setFrame("size", v); },
              options: FRAMES.map(function (f) { return { value: f.id, label: f.label, hint: f.width + "px", icon: FRAME_ICON[f.id] || "desktop" }; }) })),
          e(Field, { id: "bd-pg-ctx", label: "Context" }, e(Segmented, { labelledBy: "bd-pg-ctx", wide: true, value: frame.context, onChange: function (v) { setFrame("context", v); }, options: CONTEXTS.map(function (c) { return { value: c[0], label: c[1] }; }) })),
          e(Field, { id: "bd-pg-char", label: "Layout character", hint: "Sets data-layout, which moves every layout layer token together." },
            e(Dropdown, { labelledBy: "bd-pg-char", value: frame.spacing, onChange: function (v) { setFrame("spacing", v || ""); }, options: SPACINGS.map(function (s) { return { value: s[0], label: s[1] }; }) })),
          e(Field, { id: "bd-pg-gap", label: "Gap between sections", hint: frame.gap ? "--dt-layout-stack-" + frame.gap : "None: blocks keep their own rhythm." },
            e(Dropdown, { labelledBy: "bd-pg-gap", value: frame.gap, onChange: function (v) { setFrame("gap", v || ""); },
              options: [{ value: "", label: "None" }].concat(DATA.rootGaps.map(function (g) { return { value: g, label: g, hint: "--dt-layout-stack-" + g }; })) })),
          e(Field, { id: "bd-pg-surface", label: "Fill", hint: cur ? cur.tokens[0] : null },
            e(Dropdown, { labelledBy: "bd-pg-surface", value: frame.surface, preview: "color", onChange: function (v) { setFrame("surface", v || "base"); }, options: surfaceOptions }))));
    };

    /* One node, or several: the same kind edits every prop together; a mix
       of kinds edits size, spacing and appearance together. */
    var nodeInspector = function (nodes) {
      var first = nodes[0];
      var many = nodes.length > 1;
      var sameType = nodes.every(function (n) { return n.type === first.type; });
      var meta = sameType ? META[first.type] || { props: [] } : { props: [] };
      var base = scalars[first.type] || {};
      var layoutProps = meta.props.filter(function (p) { return p.layout; });
      var contentProps = meta.props.filter(function (p) { return !p.layout; });
      var textId = "bd-text-" + first.id;
      var hasText = sameType && !meta.container && (typeof base.children === "string" || typeof first.props.children === "string");
      var columnsId = "bd-cols-" + first.id;
      var ids = nodes.map(function (n) { return n.id; });
      var selected = !many ? locate(doc, first.id) : null;
      var textValues = nodes.map(function (n) { return n.props.children != null ? String(n.props.children) : String(base.children || ""); });
      var contentRows = (hasText ? [e(Field, { key: "text", id: textId, label: "Text", hint: many ? null : "Double-click it on the canvas to type in place" },
        e("input", { className: "bd-input", type: "text", "aria-labelledby": textId, placeholder: same(textValues) ? "" : "Mixed", value: same(textValues) ? textValues[0] : "",
          onChange: function (ev) { setProp(ids, "children", ev.target.value); } }))] : [])
        .concat(contentProps.map(function (p) { return propControl(p, nodes); }).filter(Boolean));
      var styleSection = function (sec) {
        var keys = STYLE_KEYS.filter(function (k) { return DATA.tokens[k].section === sec[0] && !DATA.tokens[k].side; });
        var toned = sec[0] === "appearance" && meta.props.some(function (p) { return p.name === "tone"; });
        var darkValues = nodes.map(function (n) { return !!n.style.dark; });
        return e(Section, { key: sec[0], title: sec[1] },
          toned ? e("p", { className: "bd-note" }, "This one paints its own background from Tone, under Layout. Fill here sits underneath it.") : null,
          keys.map(function (k) { return tokenControl(k, nodes, "bd-t-" + first.id + "-" + k); }),
          sec[0] === "appearance" ? e(Field, { id: "bd-dark-" + first.id, label: "Dark band", inline: true, hint: darkValues[0] && same(darkValues) ? "Adds the dark class: everything inside resolves dark." : null },
            e(Switch, { labelledBy: "bd-dark-" + first.id, value: darkValues[0], mixed: !same(darkValues), onChange: function (v) { setStyle(ids, "dark", v ? true : undefined); } })) : null);
      };
      var title = many ? nodes.length + " " + (sameType ? first.type + (first.type.endsWith("s") ? "" : "s") : "items") : null;
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          selected ? e("nav", { className: "bd-crumbs", "aria-label": "Selection path" },
            selected.path.map(function (n, i) {
              var isLast = i === selected.path.length - 1;
              var name = n.type === "Root" ? frame.name : n.name || n.type;
              return e(React.Fragment, { key: n.id },
                i ? e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›") : null,
                isLast ? e("span", { className: "bd-crumb", "aria-current": "true" }, name)
                  : e("button", { type: "button", className: "bd-crumb", onClick: function () { select(n.id === "root" ? [] : [n.id]); } }, name));
            })) : null,
          e("h2", { className: "bd-inspect-title" }, e(Icon, { name: sameType ? typeIcon(first.type) : "component" }),
            many ? title : first.type === "Group"
              ? e(Renamable, { value: first.name || "Group", label: "Group name", focusable: true, className: "bd-title-name", startEditing: renaming === first.id, onChange: function (v) { setRenaming(null); setName(first.id, v === "Group" ? "" : v); } })
              : first.type),
          many ? e("p", { className: "bd-inspect-sub" }, sameType ? "Changes apply to all of them. Mixed means they differ." : "Different components: size, spacing and appearance apply to all of them.")
            : meta.blurb ? e("p", { className: "bd-inspect-sub" }, meta.blurb + ".", meta.href ? e(React.Fragment, null, " ", e("a", { href: meta.href }, "Docs")) : null) : null,
          e("div", { className: "bd-actions", role: "toolbar", "aria-label": "Selection" },
            e(Dropdown, { menu: true, label: "Wrap in", placeholder: "Wrap in", icon: "wrap", compact: true, title: "Wrap in a container",
              options: WRAPS.filter(function (w) { return placeable == null || placeable[w]; }).map(function (w) { return { value: w, label: w, icon: typeIcon(w) }; }),
              onChange: actions.wrap }),
            !many && first.type === "Group"
              ? e("button", { type: "button", className: "bd-btn", onClick: actions.ungroup, title: "Ungroup (Ctrl+Shift+G)" }, e(Icon, { name: "group" }), "Ungroup")
              : e("button", { type: "button", className: "bd-btn", onClick: actions.group, title: "Group (Ctrl+G)" }, e(Icon, { name: "group" }), "Group"),
            !many && detachable[first.type]
              ? e("button", { type: "button", className: "bd-btn", onClick: actions.detach, title: "Rebuild from primitives, so its parts can be moved" }, e(Icon, { name: "detach" }), "Detach")
              : null)),
        contentRows.length ? e(Section, { title: "Content and props" }, contentRows) : null,
        sameType && (layoutProps.length || first.type === "Grid") ? e(Section, { title: "Layout" },
          layoutProps.map(function (p) { return propControl(p, nodes); }),
          first.type === "Grid" ? e(Field, { id: columnsId, label: "Responsive columns", hint: first.props.minColumnWidth ? "Fits columns at least this wide; ignores columns." : "Off: uses columns." },
            e(Dropdown, { labelledBy: columnsId, value: first.props.minColumnWidth || "", onChange: function (v) { setProp(ids, "minColumnWidth", v || undefined); },
              options: [{ value: "", label: "Off" }].concat(DATA.columnWidths.map(function (w) { return { value: w.value, label: w.label, hint: w.token }; })) })) : null) : null,
        SECTIONS.map(styleSection));
    };

    /* ------------------------------------------------- layout */

    var canUndo = history.current.past.length > 0;
    var canRedo = history.current.future.length > 0;
    var selectedNodes = nodesOf(selection);
    var savedText = saved.ok ? "Saved" : "Not saved";
    var savedTitle = saved.ok
      ? "Saved in this browser" + (saved.at ? " at " + saved.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "") + ". It stays when you reload or come back."
      : "This browser won't keep your work (a private window, blocked storage, or too many uploads). Use Share or Code to keep it.";

    var toolbar = e("div", { className: "bd-toolbar", role: "toolbar", "aria-label": "Builder" },
      e(Dropdown, { menu: true, label: "Start from a layout", placeholder: "Start from", compact: true, className: "bd-start",
        options: STARTERS.map(function (s) { return { value: s[0], label: s[1] }; }), onChange: startFrom }),
      e("span", { className: "bd-tool-group" },
        e("button", { type: "button", className: "bd-act", onClick: undo, disabled: !canUndo, title: "Undo (Ctrl+Z)", "aria-label": "Undo" }, e(Icon, { name: "undo" })),
        e("button", { type: "button", className: "bd-act", onClick: redo, disabled: !canRedo, title: "Redo (Ctrl+Shift+Z)", "aria-label": "Redo" }, e(Icon, { name: "redo" }))),
      e(Dropdown, { label: "Frame size", value: frame.size, compact: true, iconValue: true, className: "bd-frame-size", onChange: function (v) { setFrame("size", v); },
        options: FRAMES.map(function (f) { return { value: f.id, label: f.label, hint: f.width + "px", icon: FRAME_ICON[f.id] || "desktop" }; }) }),
      e("button", { type: "button", className: "bd-act", "aria-pressed": String(frame.dark), title: frame.dark ? "Dark. Switch to light" : "Light. Switch to dark", "aria-label": "Dark mode",
        onClick: function () { setFrame("dark", !frame.dark); } }, e(Icon, { name: frame.dark ? "moon" : "sun" })),
      e(Dropdown, { label: "Zoom", value: zoom, compact: true, narrow: true, className: "bd-zoom", icon: "zoomIn", onChange: setZoom,
        options: ZOOMS.map(function (z) { return { value: z[0], label: z[1] }; }) }),
      e("span", { className: "bd-tool-spacer" }),
      e("span", { className: cx("bd-saved", !saved.ok && "is-error"), title: savedTitle, role: "status" }, e(Icon, { name: saved.ok ? "check" : "alert" }), e("span", { className: "bd-saved-text" }, savedText)),
      e("button", { type: "button", className: "bd-act", "aria-pressed": String(preview), title: "Preview: use the components", "aria-label": "Preview",
        onClick: function () { setPreview(!preview); select([]); announce(preview ? "Editing" : "Preview: the components respond to clicks and typing"); } }, e(Icon, { name: "eye" })),
      e("button", { type: "button", className: "bd-act", onClick: share, title: "Copy a share link", "aria-label": "Share" }, e(Icon, { name: "link" })),
      e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: openCode, disabled: !ready }, e(Icon, { name: "code" }), "Code"));

    var frameStrip = e("div", { className: "bd-frames", role: "tablist", "aria-label": "Frames" },
      doc.frames.map(function (f) {
        var on = f.id === doc.active;
        return e("div", { key: f.id, className: cx("bd-frame-tab", on && "is-current") },
          e("button", {
            type: "button", role: "tab", "aria-selected": String(on), className: "bd-frame-btn", title: f.name + ", " + (FRAME_WIDTH[f.size] || 1280) + "px",
            onClick: function () { frameOps.show(f.id); },
          },
            e(Icon, { name: FRAME_ICON[f.size] || "desktop" }),
            on ? e(Renamable, { value: f.name, label: "Frame name", className: "bd-frame-name", startEditing: renaming === "frame:" + f.id, onChange: function (v) { frameOps.rename(f.id, v); } }) : e("span", { className: "bd-frame-name" }, f.name)),
          on ? e(Dropdown, { menu: true, label: "Frame actions", placeholder: "Frame actions", icon: "more", iconOnly: true, compact: true, alignEnd: true, className: "bd-frame-more",
            options: [{ value: "duplicate", label: "Duplicate frame", icon: "copy" }, { value: "rename", label: "Rename", icon: "pencil" }, { value: "delete", label: "Delete frame", icon: "trash", disabled: doc.frames.length < 2, danger: true }],
            onChange: function (v) { if (v === "duplicate") frameOps.duplicate(f.id); if (v === "delete") frameOps.remove(f.id); if (v === "rename") setRenaming("frame:" + f.id); } }) : null);
      }),
      e("button", { type: "button", className: "bd-act", onClick: frameOps.add, title: "New frame", "aria-label": "New frame" }, e(Icon, { name: "plus" })));

    var stage = e("div", { className: cx("bd-stage", drag && "is-dragging"), ref: stageRef,
      onPointerDown: function (ev) { if (ev.target === ev.currentTarget || ev.target.classList.contains("bd-stage-inner")) { select([]); if (editRef.current) editDone(true); } } },
      e("div", { className: "bd-stage-inner", style: { width: innerW + "px" } },
        e("iframe", {
          ref: frameRef, className: "bd-frame", title: "Builder canvas, " + frame.name + ", " + vpWidth + "px wide", src: mountEl.getAttribute("data-frame"), onLoad: onFrameLoad,
          style: { width: vpWidth + "px", height: frameH + "px", transform: "scale(" + scale + ")", left: offX + "px", top: offY + "px" },
        }),
        e("div", { className: "bd-marks", "aria-hidden": true },
          !preview && marks.hover ? e("div", { className: "bd-mark bd-mark-hover", style: marks.hover }) : null,
          !preview ? marks.sel.map(function (m) {
            var at = locate(doc, m.id);
            if (!at) return null;
            var isMain = m.id === sel && !edit;
            return e("div", { key: m.id, className: cx("bd-mark bd-mark-sel", m.id !== sel && "is-extra", m.r.top < 24 && "is-top"), style: m.r },
              isMain ? e("span", {
                className: "bd-mark-tag", title: "Drag to move",
                onPointerDown: function (ev) { ev.preventDefault(); startDrag(ev, { kind: "move", id: at.node.id, label: at.node.type }); },
              }, at.node.name || at.node.type) : null);
          }) : null,
          marks.drop && marks.drop.line ? e("div", { className: "bd-mark-line", style: marks.drop.line }) : null,
          marks.drop && marks.drop.box ? e("div", { className: "bd-mark-box", style: marks.drop.box }) : null),
        edit && edit.box ? e(InlineEditor, { key: edit.id, value: edit.value, box: edit.box, font: edit.font, scale: scale, onChange: editChange, onDone: editDone }) : null),
      ready ? null : e("p", { className: "bd-stage-loading" }, "Loading the canvas…"));

    var inspector = selectedNodes.length ? nodeInspector(selectedNodes) : frameInspector();
    var slot = wide ? document.getElementById("app-toolbar") : null;

    return e(React.Fragment, null,
      slot ? ReactDOM.createPortal(toolbar, slot) : null,
      e("div", { className: "bd-tabs", role: "tablist", "aria-label": "Builder panels" },
        [["add", "Add"], ["canvas", "Canvas"], ["edit", "Edit"]].map(function (t) {
          return e("button", { key: t[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(pane === t[0]), onClick: function () { setPane(t[0]); } },
            t[1], t[0] === "edit" && selectedNodes.length ? e("span", { className: "bd-tab-note" }, " · " + (selectedNodes.length > 1 ? selectedNodes.length : selectedNodes[0].type)) : null);
        })),
      e("div", { className: "bd-shell", "data-pane": pane },
        e("aside", { className: "bd-left", "aria-label": "Assets and layers" },
          e("div", { className: "bd-left-tabs", role: "tablist", "aria-label": "Left panel" },
            e("button", { type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === "assets"), onClick: function () { setLeft("assets"); } }, e(Icon, { name: "plus" }), "Assets"),
            e("button", { type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === "layers"), onClick: function () { setLeft("layers"); } }, e(Icon, { name: "blocks" }), "Layers")),
          e("div", { className: "bd-left-body" }, left === "assets" ? assetsPanel() : layersPanel())),
        e("div", { className: "bd-center" }, slot ? null : toolbar, frameStrip, stage),
        e("aside", { className: "bd-right", "aria-label": "Inspector", ref: rightRef }, inspector)),
      drag ? e("div", { className: "bd-ghost", style: { left: drag.x + "px", top: drag.y + "px" }, "aria-hidden": true }, drag.label) : null,
      e("dialog", { className: "bd-code", ref: dialogRef, "aria-labelledby": "bd-code-title" },
        e("div", { className: "bd-code-head" },
          e("h2", { id: "bd-code-title" }, "Code: " + frame.name),
          e("p", { className: "bd-inspect-sub" }, "React with @dovetail-ds/react. Sample data from the specimens is included so it renders as you see it; replace it with your own."),
          e("div", { className: "bd-code-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: function () { copyText(code).then(function () { announce("Code copied"); }); } }, e(Icon, { name: "copy" }), "Copy"),
            e("a", { className: "bd-btn", href: "data:text/plain;charset=utf-8," + encodeURIComponent(code), download: (frame.name.replace(/[^\w]+/g, "") || "Screen") + ".jsx" }, "Download"),
            e("button", { type: "button", className: "bd-btn", onClick: function () { dialogRef.current.close(); } }, e(Icon, { name: "close" }), "Close"))),
        e("pre", { className: "bd-code-pre", tabIndex: 0 }, e("code", null, code))),
      e("div", { className: "visually-hidden", role: "status", "aria-live": "polite" }, say));
  }

  mountEl.textContent = "";
  ReactDOM.createRoot(mountEl).render(e(App));
})();
