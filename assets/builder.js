/* The builder: a canvas to arrange Dovetail components and blocks into new
   screens, with an inspector that offers only tokens.

   This page owns the document, the selection, the history and every control.
   The canvas is a page of its own (assets/builder-frame.html), so a phone frame
   is really 390px wide; it renders the document with the real components and
   answers geometry questions through window.BuilderFrame. The two share the
   docs site's origin, so the Configure panel's theme reaches the canvas too.

   What the builder may place, each component's props (read from its .d.ts)
   and the token lists come from assets/builder-data.js, which the site build
   writes and checks: a token that doesn't exist fails the build.

   The document: { page, root }, where root is { id: "root", type: "Root",
   children } and each node is { id, type, props, style, children? }. props
   holds only what the reader changed, as plain strings, numbers and booleans;
   style holds token names. Nothing else survives a save, a share link or an
   import (see clean()), so a link can't smuggle a value or a handler in. */

(function () {
  "use strict";

  var mountEl = document.getElementById("builder");
  var DATA = window.DovetailBuilderData;
  if (!mountEl || !DATA || !window.React || !window.ReactDOM) return;

  var e = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback, useMemo = React.useMemo;

  var STORE_KEY = "dovetail-builder";
  var VIEWPORTS = [["phone", "Phone", 390], ["tablet", "Tablet", 768], ["desktop", "Desktop", 1280]];
  var VIEWPORT_WIDTH = { phone: 390, tablet: 768, desktop: 1280 };
  var CONTEXTS = [["product", "Product"], ["marketing", "Marketing"], ["social", "Social"]];
  var SPACINGS = [["", "Page default"], ["tight", "Tight"], ["balanced", "Balanced"], ["open", "Open"]];
  var WRAPS = ["Stack", "Inline", "Grid", "Section", "Card"];
  var META = DATA.components;

  function storage(fn) { try { return fn(window.localStorage); } catch (err) { return null; } }
  function isContainer(type) { return type === "Root" || !!(META[type] && META[type].container); }

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
      from.parent.children.splice(from.index, 1);
      if (from.parent === to.node && from.index < index) index--;
      to.node.children.splice(Math.max(0, Math.min(index, to.node.children.length)), 0, from.node);
      return id;
    },
    remove: function (doc, id) {
      var at = locate(doc, id);
      if (!at || !at.parent) return null;
      at.parent.children.splice(at.index, 1);
      var next = at.parent.children[at.index] || at.parent.children[at.index - 1];
      return next ? next.id : at.parent.id;
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
     an import: known components, their own scalar props, and token names
     from the lists. */
  var STYLE_KEYS = Object.keys(DATA.tokens);
  function tokenAllowed(key, v) {
    return DATA.tokens[key] && DATA.tokens[key].options.some(function (o) { return o.value === v; });
  }
  function cleanNode(n) {
    if (!n || typeof n !== "object" || !META[n.type]) return null;
    var names = META[n.type].props.map(function (p) { return p.name; }).concat(["children"]);
    if (n.type === "Grid") names.push("minColumnWidth");
    var props = {};
    Object.keys(n.props || {}).forEach(function (k) {
      var v = n.props[k];
      if (names.indexOf(k) < 0) return;
      if (k === "minColumnWidth") { if (DATA.columnWidths.some(function (w) { return w.value === v; })) props[k] = v; return; }
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") props[k] = v;
    });
    var style = {};
    Object.keys(n.style || {}).forEach(function (k) {
      if (k === "dark") { if (n.style.dark === true) style.dark = true; return; }
      if (STYLE_KEYS.indexOf(k) >= 0 && tokenAllowed(k, n.style[k])) style[k] = n.style[k];
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
    base.page.surface = tokenAllowed("surface", p.surface) ? p.surface : "base";
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
            make("Inline", { justify: "flex-end" }, [make("Button", { variant: "secondary", children: "Cancel" }), make("Button", { children: "Save changes" })]),
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
    var json = JSON.stringify(doc);
    var bytes = new TextEncoder().encode(json);
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
    if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) first.page.viewport = "phone";
    return { doc: first, from: "starter" };
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

  /* --------------------------------------------------------- small parts */

  /* An insertion line is a box with no height or no width; give it some. */
  function thick(r) {
    if (!r) return r;
    if (r.height < 1) return { left: r.left, top: r.top - 1.5, width: r.width, height: 3 };
    if (r.width < 1) return { left: r.left - 1.5, top: r.top, width: 3, height: r.height };
    return r;
  }

  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  function Icon(props) {
    var P = {
      undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
      redo: "m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
      up: "m6 15 6-6 6 6",
      down: "m6 9 6 6 6-6",
      copy: "M8 8h12v12H8zM16 8V4H4v12h4",
      trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
      grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
      code: "m8 8-4 4 4 4M16 8l4 4-4 4",
      link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
      eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
      plus: "M12 5v14M5 12h14",
      parent: "M9 14 4 9l5-5M4 9h9a7 7 0 0 1 7 7v4",
      close: "M6 6l12 12M18 6 6 18",
    };
    return e("svg", { className: "bd-ic", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" },
      e("path", { d: P[props.name] }));
  }

  function Chips(props) {
    return e("div", { className: "bd-chips", role: "group", "aria-label": props.label },
      props.options.map(function (o) {
        var v = Array.isArray(o) ? o[0] : o.value;
        var text = Array.isArray(o) ? o[1] : o.label;
        return e("button", {
          key: String(v), type: "button", className: "bd-chip", "aria-pressed": String(props.value === v),
          onClick: function () { props.onChange(props.value === v && props.toggle ? undefined : v); },
        }, text);
      }));
  }

  function Field(props) {
    return e("div", { className: "bd-field" },
      e("span", { className: "bd-field-label", id: props.id, title: props.note || undefined }, props.label),
      props.children,
      props.hint ? e("span", { className: "bd-field-hint" }, props.hint) : null);
  }

  function Select(props) {
    return e("select", {
      className: "bd-select", "aria-labelledby": props.labelledBy, value: props.value == null ? "" : String(props.value),
      onChange: function (ev) { props.onChange(ev.target.value === "" ? undefined : ev.target.value); },
    }, props.options.map(function (o) { return e("option", { key: o[0], value: o[0] }, o[1]); }));
  }

  function Section(props) {
    return e("section", { className: "bd-sec" }, e("h3", { className: "bd-sec-h" }, props.title), props.children);
  }

  /* ------------------------------------------------------------ the app */

  function App() {
    var init = useMemo(initialDoc, []);
    var docState = useState(init.doc);
    var doc = docState[0], setDoc = docState[1];
    var selState = useState(null);
    var sel = selState[0], setSel = selState[1];
    var hoverState = useState(null);
    var hover = hoverState[0], setHover = hoverState[1];
    var leftState = useState("add");
    var left = leftState[0], setLeft = leftState[1];
    var paneState = useState("canvas");
    var pane = paneState[0], setPane = paneState[1];
    var previewState = useState(false);
    var preview = previewState[0], setPreview = previewState[1];
    var queryState = useState("");
    var query = queryState[0], setQuery = queryState[1];
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
    var boxState = useState({ w: 0, h: 0 });
    var box = boxState[0], setBox = boxState[1];
    var dragState = useState(null);
    var drag = dragState[0], setDrag = dragState[1];
    var marksState = useState({ sel: null, hover: null, drop: null });
    var marks = marksState[0], setMarks = marksState[1];

    var history = useRef({ past: [], future: [] });
    var docRef = useRef(doc); docRef.current = doc;
    var selRef = useRef(sel); selRef.current = sel;
    var frameRef = useRef(null);
    var stageRef = useRef(null);
    var dialogRef = useRef(null);
    var rightRef = useRef(null);
    var dragRef = useRef(null);
    var dropRef = useRef(null);
    var justDragged = useRef(false);

    var api = function () {
      var f = frameRef.current;
      try { return f && f.contentWindow && f.contentWindow.BuilderFrame; } catch (err) { return null; }
    };

    var announce = useCallback(function (text) { setSay(""); setTimeout(function () { setSay(text); }, 30); }, []);

    var commit = useCallback(function (next, nextSel, message) {
      history.current.past.push(JSON.stringify(docRef.current));
      if (history.current.past.length > 100) history.current.past.shift();
      history.current.future = [];
      setDoc(next);
      if (nextSel !== undefined) setSel(nextSel);
      if (message) announce(message);
    }, [announce]);

    var change = useCallback(function (fn, message) {
      var next = copy(docRef.current);
      var nextSel = fn(next);
      if (nextSel === null) return;
      commit(next, nextSel === undefined ? undefined : nextSel, message);
    }, [commit]);

    var undo = useCallback(function () {
      var h = history.current;
      if (!h.past.length) return;
      h.future.push(JSON.stringify(docRef.current));
      var prev = JSON.parse(h.past.pop());
      setDoc(prev);
      if (selRef.current && !locate(prev, selRef.current)) setSel(null);
      announce("Undone");
    }, [announce]);
    var redo = useCallback(function () {
      var h = history.current;
      if (!h.future.length) return;
      h.past.push(JSON.stringify(docRef.current));
      var next = JSON.parse(h.future.pop());
      setDoc(next);
      if (selRef.current && !locate(next, selRef.current)) setSel(null);
      announce("Redone");
    }, [announce]);

    /* Save as you go. A link someone shared stays in the address bar only
       until the first change, so a reload doesn't throw that change away. */
    useEffect(function () {
      storage(function (s) { s.setItem(STORE_KEY, JSON.stringify(doc)); });
    }, [doc]);
    var firstDoc = useRef(doc);
    useEffect(function () {
      if (doc !== firstDoc.current && /^#b=/.test(location.hash)) window.history.replaceState(null, "", location.pathname + location.search);
    }, [doc]);
    useEffect(function () {
      if (init.from === "link") announce("Opened a shared layout");
    }, []);

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
    }, []);

    var toStage = useCallback(function (r) {
      if (!r) return null;
      return { left: offX + r.left * scale, top: offY + r.top * scale, width: r.width * scale, height: r.height * scale };
    }, [offX, offY, scale]);

    var remeasure = useCallback(function () {
      var f = api();
      if (!f) return;
      setMarks(function (m) {
        return {
          sel: selRef.current && selRef.current !== "root" ? toStage(f.rect(selRef.current)) : null,
          hover: hoverRef.current && hoverRef.current !== selRef.current && hoverRef.current !== "root" ? toStage(f.rect(hoverRef.current)) : null,
          drop: m.drop,
        };
      });
    }, [toStage]);
    var hoverRef = useRef(hover); hoverRef.current = hover;
    var remeasureRef = useRef(remeasure); remeasureRef.current = remeasure;

    /* The canvas calls back through window.BuilderHost. */
    useEffect(function () {
      var raf = 0;
      window.BuilderHost = {
        ready: function () { setReady(true); },
        pick: function (id) {
          setSel(id === "root" ? null : id);
          if (id && id !== "root" && window.matchMedia("(max-width: 900px)").matches) announce((locate(docRef.current, id) || { node: { type: "" } }).node.type + " selected. Open Edit to change it.");
        },
        hover: function (id) { if (hoverRef.current !== id) setHover(id); },
        key: function (ev) { return keyRef.current(ev); },
        moved: function () {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () { remeasureRef.current(); });
        },
      };
      return function () { delete window.BuilderHost; };
    }, []);

    var onFrameLoad = function () { if (api()) setReady(true); };

    useEffect(function () {
      var f = api();
      if (!ready || !f) return;
      if (!placeable) {
        var ok = {};
        Object.keys(META).forEach(function (n) { ok[n] = f.has(n) && (META[n].container || f.hasStarter(n)); });
        setPlaceable(ok);
        var sc = {};
        Object.keys(META).forEach(function (n) { sc[n] = f.scalars(n); });
        setScalars(sc);
      }
      f.render(doc, { preview: preview });
      requestAnimationFrame(function () { remeasureRef.current(); });
    }, [ready, doc, preview]);

    useEffect(function () { remeasure(); }, [sel, hover, scale, offX, box.h]);
    /* A new selection opens at the top of the inspector. */
    useEffect(function () { if (rightRef.current) rightRef.current.scrollTop = 0; }, [sel]);

    /* ------------------------------------------------- placing things */

    var target = function () {
      var s = selRef.current;
      var d = docRef.current;
      if (!s) return { parent: "root", index: d.root.children.length };
      var at = locate(d, s);
      if (!at) return { parent: "root", index: d.root.children.length };
      if (isContainer(at.node.type)) return { parent: at.node.id, index: at.node.children.length };
      return { parent: at.parent.id, index: at.index + 1 };
    };

    var add = function (type, where) {
      var t = where || target();
      var n = make(type);
      var parentName = t.parent === "root" ? "the page" : (locate(docRef.current, t.parent) || { node: { type: "page" } }).node.type;
      change(function (d) { return ops.insert(d, t.parent, t.index, n); }, "Added " + type + " to " + parentName);
      if (window.matchMedia("(max-width: 900px)").matches) setPane("canvas");
    };

    /* Dragging works from the palette, the layers list and the selection's
       handle. The canvas stops taking pointer events while a drag is on, so
       the pointer stays with this page; the canvas only answers where a drop
       would land. */
    var startDrag = function (ev, payload) {
      if (ev.button !== undefined && ev.button !== 0) return;
      /* Capture keeps the pointer's events with this page even over the
         canvas, before the drag has gone far enough to switch the canvas off. */
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      dragRef.current = { payload: payload, x: ev.clientX, y: ev.clientY, active: false, id: ev.pointerId };
      var move = function (mv) {
        var dr = dragRef.current;
        if (!dr || mv.pointerId !== dr.id) return;
        if (!dr.active) {
          if (Math.abs(mv.clientX - dr.x) + Math.abs(mv.clientY - dr.y) < 6) return;
          dr.active = true;
          setDrag({ label: payload.label, x: mv.clientX, y: mv.clientY });
        }
        mv.preventDefault();
        setDrag({ label: payload.label, x: mv.clientX, y: mv.clientY });
        var f = api();
        var frame = frameRef.current;
        if (!f || !frame) return;
        var r = frame.getBoundingClientRect();
        var inside = mv.clientX >= r.left && mv.clientX <= r.right && mv.clientY >= r.top && mv.clientY <= r.bottom;
        var hit = inside ? f.drop((mv.clientX - r.left) / scaleRef.current, (mv.clientY - r.top) / scaleRef.current, payload.id || null, 12 / scaleRef.current) : null;
        dropRef.current = hit;
        setMarks(function (m) {
          return Object.assign({}, m, { drop: hit ? { line: hit.line ? thick(toStageRef.current(hit.line)) : null, box: hit.box ? toStageRef.current(hit.box) : null } : null });
        });
        /* Near the top or bottom of the canvas, scroll it. */
        if (inside) {
          var w = frame.contentWindow;
          var edge = 48;
          if (mv.clientY - r.top < edge) w.scrollBy(0, -12);
          else if (r.bottom - mv.clientY < edge) w.scrollBy(0, 12);
        }
      };
      var end = function (up) {
        var dr = dragRef.current;
        if (!dr || (up && up.pointerId !== dr.id)) return;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("keydown", esc, true);
        dragRef.current = null;
        var hit = dropRef.current;
        dropRef.current = null;
        setDrag(null);
        setMarks(function (m) { return Object.assign({}, m, { drop: null }); });
        if (!dr.active) return;
        justDragged.current = true;
        setTimeout(function () { justDragged.current = false; }, 50);
        if (!hit || !up) return;
        if (payload.kind === "new") add(payload.type, { parent: hit.parent, index: hit.index });
        else change(function (d) { return ops.move(d, payload.id, hit.parent, hit.index); }, "Moved " + payload.label);
      };
      var cancel = function () { dropRef.current = null; end(null); };
      var esc = function (k) { if (k.key === "Escape") { k.preventDefault(); cancel(); announce("Drag cancelled"); } };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", esc, true);
    };
    var scaleRef = useRef(scale); scaleRef.current = scale;
    var toStageRef = useRef(toStage); toStageRef.current = toStage;

    /* ------------------------------------------------- keyboard */

    var selected = sel ? locate(doc, sel) : null;

    var actions = {
      remove: function () { if (selRef.current) { var t = locate(docRef.current, selRef.current); change(function (d) { return ops.remove(d, selRef.current); }, "Deleted " + (t ? t.node.type : "")); } },
      duplicate: function () { if (selRef.current) change(function (d) { return ops.duplicate(d, selRef.current); }, "Duplicated"); },
      up: function () { if (selRef.current) change(function (d) { return ops.nudge(d, selRef.current, -1); }, "Moved up"); },
      down: function () { if (selRef.current) change(function (d) { return ops.nudge(d, selRef.current, 1); }, "Moved down"); },
      parent: function () {
        var at = selRef.current && locate(docRef.current, selRef.current);
        setSel(at && at.parent && at.parent.id !== "root" ? at.parent.id : null);
      },
      wrap: function (type) { if (selRef.current && type) change(function (d) { return ops.wrap(d, selRef.current, type); }, "Wrapped in " + type); },
    };

    var keyRef = useRef(function () { return false; });
    keyRef.current = function (ev) {
      if (dialogRef.current && dialogRef.current.open) return false;
      var t = ev.target;
      var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing) return false;
      var mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.key.toLowerCase() === "z") { (ev.shiftKey ? redo : undo)(); return true; }
      if (mod && ev.key.toLowerCase() === "y") { redo(); return true; }
      if (!selRef.current) return false;
      if (ev.key === "Delete" || ev.key === "Backspace") { actions.remove(); return true; }
      if (mod && ev.key.toLowerCase() === "d") { actions.duplicate(); return true; }
      if (ev.altKey && ev.key === "ArrowUp") { actions.up(); return true; }
      if (ev.altKey && ev.key === "ArrowDown") { actions.down(); return true; }
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

    /* ------------------------------------------------- page settings */

    var setPage = function (key, value, message) {
      change(function (d) { d.page[key] = value; return undefined; }, message);
    };
    var setProp = function (id, key, value) {
      change(function (d) { var at = locate(d, id); if (!at) return null; if (value === undefined) delete at.node.props[key]; else at.node.props[key] = value; return undefined; });
    };
    var setStyle = function (id, key, value) {
      change(function (d) { var at = locate(d, id); if (!at) return null; if (value === undefined) delete at.node.style[key]; else at.node.style[key] = value; return undefined; });
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

    var startFrom = function (id) {
      var s = STARTERS.filter(function (x) { return x[0] === id; })[0];
      if (!s) return;
      commit(s[2](), null, "Started from " + s[1] + ". Undo to go back.");
    };

    /* ------------------------------------------------- rendering */

    var labelOf = function (n) {
      var base = scalars[n.type] || {};
      var text = n.props.children != null ? n.props.children : n.props.title != null ? n.props.title : n.props.label != null ? n.props.label : base.children || base.title || base.label || base.name;
      return typeof text === "string" || typeof text === "number" ? String(text) : "";
    };

    function Palette() {
      var q = query.trim().toLowerCase();
      var groups = DATA.groups.map(function (g) {
        var items = g.items.filter(function (n) {
          if (placeable && !placeable[n]) return false;
          return !q || n.toLowerCase().indexOf(q) >= 0 || String(META[n].blurb || "").toLowerCase().indexOf(q) >= 0;
        });
        return { g: g, items: items };
      }).filter(function (x) { return x.items.length; });
      return e("div", { className: "bd-palette" },
        e("label", { className: "bd-search" },
          e("span", { className: "visually-hidden" }, "Filter components"),
          e("input", { type: "search", placeholder: "Filter components", value: query, onChange: function (ev) { setQuery(ev.target.value); } })),
        e("p", { className: "bd-tip" }, "Drag onto the canvas, or tap to add after the selection."),
        groups.length ? null : e("p", { className: "bd-empty-note" }, "Nothing matches."),
        groups.map(function (x) {
          return e("section", { key: x.g.id, className: "bd-group" },
            e("h3", { className: "bd-group-h" }, x.g.label),
            e("ul", { className: "bd-items" }, x.items.map(function (n) {
              return e("li", { key: n },
                e("button", {
                  type: "button", className: "bd-item", "data-type": n,
                  "aria-label": "Add " + n,
                  onPointerDown: function (ev) { startDrag(ev, { kind: "new", type: n, label: n }); },
                  onClick: function () { if (!justDragged.current) add(n); },
                },
                  e("span", { className: "bd-item-name" }, n),
                  META[n].blurb ? e("span", { className: "bd-item-blurb" }, META[n].blurb) : null));
            })));
        }));
    }

    function Layers() {
      var rows = [];
      (function walk(n, depth) {
        (n.children || []).forEach(function (c) {
          rows.push({ n: c, depth: depth });
          if (c.children) walk(c, depth + 1);
        });
      })(doc.root, 0);
      return e("div", { className: "bd-layers" },
        e("button", { type: "button", className: cx("bd-layer", !sel && "is-current"), "aria-current": !sel ? "true" : undefined, onClick: function () { setSel(null); } },
          e("span", { className: "bd-layer-name" }, "Page")),
        rows.length ? null : e("p", { className: "bd-empty-note" }, "The page is empty. Add something from the Add tab."),
        rows.map(function (r) {
          var text = labelOf(r.n);
          return e("button", {
            key: r.n.id, type: "button", className: cx("bd-layer", sel === r.n.id && "is-current"),
            style: { paddingInlineStart: "calc(var(--dt-space-inset-sm) + " + r.depth + " * var(--dt-space-inset-md))" },
            "aria-current": sel === r.n.id ? "true" : undefined,
            onClick: function () { if (!justDragged.current) setSel(r.n.id); },
            onPointerDown: function (ev) { startDrag(ev, { kind: "move", id: r.n.id, label: r.n.type }); },
            onPointerEnter: function () { setHover(r.n.id); },
            onPointerLeave: function () { setHover(null); },
          },
            e("span", { className: "bd-layer-name" }, r.n.type),
            text ? e("span", { className: "bd-layer-text" }, text) : null);
        }));
    }

    function PropControl(p, node) {
      var id = "bd-p-" + node.id + "-" + p.name;
      var base = scalars[node.type] || {};
      var own = node.props[p.name];
      var current = own !== undefined ? own : base[p.name] !== undefined ? base[p.name] : p.default != null ? (p.kind === "boolean" ? p.default === "true" : p.kind === "number" ? Number(p.default) : p.default) : undefined;
      var set = function (v) { setProp(node.id, p.name, v); };
      var control;
      if (p.kind === "enum") {
        control = p.options.length > 5
          ? e(Select, { labelledBy: id, value: current, onChange: set, options: [["", "Default"]].concat(p.options.map(function (o) { return [o, o]; })) })
          : e(Chips, { label: p.name, value: current, onChange: set, options: p.options.map(function (o) { return [o, o]; }) });
      } else if (p.kind === "boolean") {
        control = e(Chips, { label: p.name, value: !!current, onChange: set, options: [[false, "Off"], [true, "On"]] });
      } else if (p.kind === "number" && node.type === "Grid" && p.name === "columns") {
        control = e(Chips, { label: p.name, value: current, onChange: set, options: [1, 2, 3, 4, 5, 6].map(function (n) { return [n, String(n)]; }) });
      } else if (p.kind === "number") {
        control = e("input", { className: "bd-input", type: "number", "aria-labelledby": id, value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : Number(ev.target.value)); } });
      } else if (p.kind === "text" || (p.kind === "node" && typeof base[p.name] === "string")) {
        control = e("input", { className: "bd-input", type: "text", "aria-labelledby": id, value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : ev.target.value); } });
      } else return null;
      return e(Field, { key: p.name, id: id, label: p.name, note: p.note }, control);
    }

    function TokenControl(key, node) {
      var def = DATA.tokens[key];
      var id = "bd-t-" + node.id + "-" + key;
      var value = node.style[key];
      var tok = value ? def.options.filter(function (o) { return o.value === value; })[0] : null;
      return e(Field, { key: key, id: id, label: def.label, hint: tok ? tok.token : null },
        e(Select, { labelledBy: id, value: value, onChange: function (v) { setStyle(node.id, key, v); },
          options: [["", "None"]].concat(def.options.map(function (o) { return [o.value, o.value]; })) }));
    }

    function PageInspector() {
      var surfaceId = "bd-page-surface";
      var tok = DATA.tokens.surface.options.filter(function (o) { return o.value === doc.page.surface; })[0];
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("h2", { className: "bd-inspect-title" }, "Page"),
          e("p", { className: "bd-inspect-sub" }, "Select something on the canvas to change it. These settings apply to the whole frame.")),
        e(Section, { title: "Frame" },
          e(Field, { label: "Viewport" }, e(Chips, { label: "Viewport", value: doc.page.viewport, onChange: function (v) { if (v) setPage("viewport", v); }, options: VIEWPORTS.map(function (v) { return [v[0], v[1] + " " + v[2]]; }) })),
          e(Field, { label: "Mode" }, e(Chips, { label: "Mode", value: doc.page.dark, onChange: function (v) { setPage("dark", !!v); }, options: [[false, "Light"], [true, "Dark"]] })),
          e(Field, { label: "Context" }, e(Chips, { label: "Context", value: doc.page.context, onChange: function (v) { if (v) setPage("context", v); }, options: CONTEXTS }))),
        e(Section, { title: "Layout" },
          e(Field, { label: "Character", hint: "Sets data-layout, which moves every layout layer token together." },
            e(Chips, { label: "Character", value: doc.page.spacing, onChange: function (v) { setPage("spacing", v || ""); }, options: SPACINGS })),
          e(Field, { label: "Gap between sections", hint: doc.page.gap ? "--dt-layout-stack-" + doc.page.gap : "None: blocks keep their own rhythm." },
            e(Chips, { label: "Gap between sections", value: doc.page.gap, onChange: function (v) { setPage("gap", v || ""); }, options: [["", "None"]].concat(DATA.rootGaps.map(function (g) { return [g, g]; })) }))),
        e(Section, { title: "Style" },
          e(Field, { id: surfaceId, label: "Surface", hint: tok ? tok.token : "" },
            e(Select, { labelledBy: surfaceId, value: doc.page.surface, onChange: function (v) { setPage("surface", v || "base"); }, options: DATA.tokens.surface.options.map(function (o) { return [o.value, o.value]; }) }))));
    }

    function NodeInspector() {
      var node = selected.node;
      var meta = META[node.type] || { props: [] };
      var layoutProps = meta.props.filter(function (p) { return p.layout; });
      var otherProps = meta.props.filter(function (p) { return !p.layout; });
      var base = scalars[node.type] || {};
      var textId = "bd-text-" + node.id;
      var hasText = !meta.container && (typeof base.children === "string" || typeof node.props.children === "string");
      var columnsId = "bd-cols-" + node.id;
      var first = selected.index === 0;
      var last = selected.parent && selected.index === selected.parent.children.length - 1;
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("nav", { className: "bd-crumbs", "aria-label": "Selection path" },
            selected.path.map(function (n, i) {
              var isLast = i === selected.path.length - 1;
              return e(React.Fragment, { key: n.id },
                i ? e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›") : null,
                isLast ? e("span", { className: "bd-crumb", "aria-current": "true" }, n.type === "Root" ? "Page" : n.type)
                  : e("button", { type: "button", className: "bd-crumb", onClick: function () { setSel(n.id === "root" ? null : n.id); } }, n.type === "Root" ? "Page" : n.type));
            })),
          e("h2", { className: "bd-inspect-title" }, node.type),
          meta.blurb ? e("p", { className: "bd-inspect-sub" }, meta.blurb + ". ", e("a", { href: meta.href }, "Docs")) : null,
          e("div", { className: "bd-actions", role: "toolbar", "aria-label": "Selection" },
            e("button", { type: "button", className: "bd-act", onClick: actions.up, disabled: first, title: "Move up (Alt+↑)" }, e(Icon, { name: "up" }), e("span", { className: "visually-hidden" }, "Move up")),
            e("button", { type: "button", className: "bd-act", onClick: actions.down, disabled: last, title: "Move down (Alt+↓)" }, e(Icon, { name: "down" }), e("span", { className: "visually-hidden" }, "Move down")),
            e("button", { type: "button", className: "bd-act", onClick: actions.parent, title: "Select parent (Esc)" }, e(Icon, { name: "parent" }), e("span", { className: "visually-hidden" }, "Select parent")),
            e("button", { type: "button", className: "bd-act", onClick: actions.duplicate, title: "Duplicate (Ctrl+D)" }, e(Icon, { name: "copy" }), e("span", { className: "visually-hidden" }, "Duplicate")),
            e("label", { className: "bd-wrap" },
              e("span", { className: "visually-hidden" }, "Wrap in"),
              e("select", { className: "bd-select bd-select-sm", value: "", onChange: function (ev) { actions.wrap(ev.target.value); } },
                e("option", { value: "" }, "Wrap in…"),
                WRAPS.filter(function (w) { return placeable == null || placeable[w]; }).map(function (w) { return e("option", { key: w, value: w }, w); }))),
            e("button", { type: "button", className: "bd-act bd-act-danger", onClick: actions.remove, title: "Delete (Del)" }, e(Icon, { name: "trash" }), e("span", { className: "visually-hidden" }, "Delete")))),
        layoutProps.length || node.type === "Grid" ? e(Section, { title: "Layout" },
          layoutProps.map(function (p) { return PropControl(p, node); }),
          node.type === "Grid" ? e(Field, { id: columnsId, label: "Responsive columns", hint: node.props.minColumnWidth ? "Fits columns at least this wide; ignores columns." : "Off: uses columns." },
            e(Select, { labelledBy: columnsId, value: node.props.minColumnWidth, onChange: function (v) { setProp(node.id, "minColumnWidth", v); },
              options: [["", "Off"]].concat(DATA.columnWidths.map(function (w) { return [w.value, w.label]; })) })) : null) : null,
        e(Section, { title: "Style" },
          e("p", { className: "bd-sec-note" }, "Token values only. Each one sets a custom property on the component."),
          STYLE_KEYS.map(function (k) { return TokenControl(k, node); }),
          e(Field, { label: "Dark band", hint: node.style.dark ? "Adds the dark class: everything inside resolves dark." : null },
            e(Chips, { label: "Dark band", value: !!node.style.dark, onChange: function (v) { setStyle(node.id, "dark", v ? true : undefined); }, options: [[false, "Off"], [true, "On"]] }))),
        hasText || otherProps.length ? e(Section, { title: "Content and props" },
          hasText ? e(Field, { id: textId, label: "Text" },
            e("input", { className: "bd-input", type: "text", "aria-labelledby": textId, value: node.props.children != null ? String(node.props.children) : String(base.children || ""),
              onChange: function (ev) { setProp(node.id, "children", ev.target.value); } })) : null,
          otherProps.map(function (p) { return PropControl(p, node); })) : null);
    }

    var canUndo = history.current.past.length > 0;
    var canRedo = history.current.future.length > 0;

    var toolbar = e("div", { className: "bd-toolbar", role: "toolbar", "aria-label": "Builder" },
      e("label", { className: "bd-start" },
        e("span", { className: "visually-hidden" }, "Start from a layout"),
        e("select", { className: "bd-select bd-select-sm", value: "", onChange: function (ev) { startFrom(ev.target.value); ev.target.value = ""; } },
          e("option", { value: "" }, "Start from"),
          STARTERS.map(function (s) { return e("option", { key: s[0], value: s[0] }, s[1]); }))),
      e("span", { className: "bd-tool-group" },
        e("button", { type: "button", className: "bd-act", onClick: undo, disabled: !canUndo, title: "Undo (Ctrl+Z)" }, e(Icon, { name: "undo" }), e("span", { className: "visually-hidden" }, "Undo")),
        e("button", { type: "button", className: "bd-act", onClick: redo, disabled: !canRedo, title: "Redo (Ctrl+Shift+Z)" }, e(Icon, { name: "redo" }), e("span", { className: "visually-hidden" }, "Redo"))),
      e(Chips, { label: "Viewport", value: doc.page.viewport, onChange: function (v) { if (v) setPage("viewport", v); }, options: VIEWPORTS.map(function (v) { return [v[0], v[1]]; }) }),
      e("span", { className: "bd-tool-mode" }, e(Chips, { label: "Mode", value: doc.page.dark, onChange: function (v) { setPage("dark", !!v); }, options: [[false, "Light"], [true, "Dark"]] })),
      e("span", { className: "bd-tool-spacer" }),
      e("button", { type: "button", className: "bd-btn", "aria-pressed": String(preview), onClick: function () { setPreview(!preview); setSel(null); announce(preview ? "Editing" : "Preview: the components respond to clicks and typing"); } }, e(Icon, { name: "eye" }), e("span", { className: "bd-btn-label" }, "Preview")),
      e("button", { type: "button", className: "bd-btn", onClick: share }, e(Icon, { name: "link" }), e("span", { className: "bd-btn-label" }, "Share")),
      e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: openCode, disabled: !ready }, e(Icon, { name: "code" }), "Code"));

    var stage = e("div", { className: cx("bd-stage", drag && "is-dragging"), ref: stageRef },
      e("iframe", {
        ref: frameRef, className: "bd-frame", title: "Builder canvas, " + vpWidth + "px wide", src: mountEl.getAttribute("data-frame"), onLoad: onFrameLoad,
        style: { width: vpWidth + "px", height: frameH + "px", transform: "scale(" + scale + ")", left: offX + "px", top: offY + "px" },
      }),
      e("div", { className: "bd-marks", "aria-hidden": true },
        !preview && marks.hover ? e("div", { className: "bd-mark bd-mark-hover", style: marks.hover }) : null,
        !preview && marks.sel && selected ? e("div", { className: cx("bd-mark bd-mark-sel", marks.sel.top < 24 && "is-top"), style: marks.sel },
          e("span", {
            className: "bd-mark-tag", onPointerDown: function (ev) { ev.preventDefault(); startDrag(ev, { kind: "move", id: selected.node.id, label: selected.node.type }); },
            title: "Drag to move",
          }, e(Icon, { name: "grip" }), selected.node.type)) : null,
        marks.drop && marks.drop.line ? e("div", { className: "bd-mark-line", style: marks.drop.line }) : null,
        marks.drop && marks.drop.box ? e("div", { className: "bd-mark-box", style: marks.drop.box }) : null),
      ready ? null : e("p", { className: "bd-stage-loading" }, "Loading the canvas…"));

    return e(React.Fragment, null,
      e("div", { className: "bd-tabs", role: "tablist", "aria-label": "Builder panels" },
        [["add", "Add"], ["canvas", "Canvas"], ["edit", "Edit"]].map(function (t) {
          return e("button", { key: t[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(pane === t[0]), onClick: function () { setPane(t[0]); } },
            t[1], t[0] === "edit" && selected ? e("span", { className: "bd-tab-note" }, " · " + selected.node.type) : null);
        })),
      e("div", { className: "bd-shell", "data-pane": pane },
        e("aside", { className: "bd-left", "aria-label": "Components and layers" },
          e("div", { className: "bd-left-tabs", role: "tablist", "aria-label": "Left panel" },
            e("button", { type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === "add"), onClick: function () { setLeft("add"); } }, e(Icon, { name: "plus" }), "Add"),
            e("button", { type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === "layers"), onClick: function () { setLeft("layers"); } }, "Layers")),
          e("div", { className: "bd-left-body" }, left === "add" ? Palette() : Layers())),
        e("div", { className: "bd-center" }, toolbar, stage),
        e("aside", { className: "bd-right", "aria-label": "Inspector", ref: rightRef }, selected ? NodeInspector() : PageInspector())),
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
