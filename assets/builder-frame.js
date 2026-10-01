/* The builder's canvas. Runs inside assets/builder-frame.html and exposes
   window.BuilderFrame to the builder page (assets/builder.js), which owns the
   document tree, the selection and every control. This side only does what
   needs the canvas's own React and the real component elements:

   - render(tree, options): draws the tree with the bundle's components;
   - rect(id) and drop(x, y, dragId): geometry, in this frame's coordinates;
   - jsx(tree): the code for the tree, with each component's full props.

   A node is { id, type, props, style, children }. `props` holds only what the
   reader changed; everything else comes from the component's specimen
   (assets/specimens.js), the same starting point the component pages use, so
   a dropped component looks like a real use of it rather than an empty shell.
   `style` holds token names, never values: STYLE below turns each one into a
   custom property, which is the only way a value reaches the canvas. */

(function () {
  "use strict";

  var NS = window.BeamMobileDesignSystem_e33121;
  var specs = window.DovetailSpecimens || { build: {}, notes: {}, samples: {} };
  var mount = document.getElementById("bf-mount");
  if (!NS || !window.React || !window.ReactDOM || !mount) return;

  var e = React.createElement;
  var root = ReactDOM.createRoot(mount);
  var html = document.documentElement;

  /* Components whose children the reader arranges. Their specimen's own
     children are dropped; the tree supplies new ones. */
  var CONTAINERS = { Root: true, Section: true, Stack: true, Inline: true, Grid: true, Card: true };

  /* Token-only styling. Each key maps a token name chosen in the inspector to
     the declarations it sets. */
  var STYLE = {
    surface: function (v) { return { background: "var(--dt-surface-" + v + ")" }; },
    padding: function (v) { return { padding: "var(--dt-space-inset-" + v + ")" }; },
    radius: function (v) { return { borderRadius: "var(--dt-radius-" + v + ")", overflow: "hidden" }; },
    border: function (v) { return { border: "var(--dt-border-width-default) solid var(--dt-border-" + v + ")" }; },
    elevation: function (v) { return { boxShadow: "var(--dt-elevation-" + v + ")" }; },
    width: function (v) { return { width: "100%", maxWidth: "var(--dt-size-container-" + v + ")", marginInline: "auto" }; },
  };
  var STYLE_ORDER = ["surface", "padding", "radius", "border", "elevation", "width"];

  /* The page root's gap reads a layout layer, so it follows the layout's
     character with everything else. */
  var ROOT_GAP = { related: "--dt-layout-stack-related", group: "--dt-layout-stack-group", block: "--dt-layout-stack-block", section: "--dt-layout-stack-section" };

  function styleFor(s) {
    if (!s) return null;
    var out = null;
    STYLE_ORDER.forEach(function (k) {
      if (!s[k] || !STYLE[k]) return;
      out = Object.assign(out || {}, STYLE[k](s[k]));
    });
    return out;
  }

  /* The component's own element inside a specimen, which may wrap it. */
  function findElement(node, type) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        var hit = findElement(node[i], type);
        if (hit) return hit;
      }
      return null;
    }
    if (node.type === type) return node;
    return node.props ? findElement(node.props.children, type) : null;
  }

  /* Layout containers start clean: their specimens show off a variant (a
     photo band, a wide gap) that would be a surprising default for an empty
     box. Card keeps its specimen's title and copy. */
  var CLEAN = { Section: true, Stack: true, Inline: true, Grid: true };

  var baseCache = {};
  function base(type) {
    if (baseCache[type]) return baseCache[type];
    if (CLEAN[type]) return (baseCache[type] = {});
    var Comp = NS[type];
    var build = (specs.samples && specs.samples[type]) || specs.build[type];
    var props = {};
    if (Comp && build) {
      try {
        var el = findElement(build(), Comp);
        if (el) props = Object.assign({}, el.props);
      } catch (err) { props = {}; }
    }
    if (CONTAINERS[type]) delete props.children;
    baseCache[type] = props;
    return props;
  }

  /* The props a node renders with: the specimen's, then the reader's. */
  function propsOf(node) {
    var p = Object.assign({}, base(node.type));
    var own = node.props || {};
    Object.keys(own).forEach(function (k) {
      if (own[k] === null || own[k] === undefined) delete p[k];
      else p[k] = own[k];
    });
    var st = styleFor(node.style);
    if (st) p.style = Object.assign({}, p.style || {}, st);
    if (node.style && node.style.dark) p.className = ((p.className || "") + " dark").trim();
    return p;
  }

  /* A prop combination a component rejects shows a note on that node only. */
  class Guard extends React.Component {
    constructor(p) { super(p); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error: error }; }
    componentDidUpdate(prev) { if (prev.stamp !== this.props.stamp && this.state.error) this.setState({ error: null }); }
    render() {
      return this.state.error
        ? e("div", { className: "bf-error" }, this.props.name + " doesn't render with these props: " + String(this.state.error.message || this.state.error))
        : this.props.children;
    }
  }

  var stamp = 0;
  var index = {};

  function empty(id) {
    return e("div", { className: "bf-empty", "data-bf-slot": id, key: "empty" }, "Drop components here");
  }

  function renderNode(node, parentId) {
    index[node.id] = { node: node, parent: parentId };
    var Comp = NS[node.type];
    if (!Comp) return e("div", { key: node.id, className: "bf-error", "data-bf-id": node.id }, "Unknown component " + node.type);
    var p = propsOf(node);
    var kids;
    if (CONTAINERS[node.type]) {
      kids = (node.children || []).length ? node.children.map(function (c) { return renderNode(c, node.id); }) : empty(node.id);
    }
    var el = kids === undefined ? e(Comp, p) : e(Comp, p, kids);
    return e("div", { key: node.id, "data-bf-id": node.id, "data-bf-type": node.type, style: { display: "contents" } },
      e(Guard, { stamp: stamp, name: node.type }, el));
  }

  var current = null;
  var opts = {};

  /* React commits on its own schedule, so the builder hears about a new
     layout from here, after the canvas has really changed. */
  function Painted(props) {
    React.useLayoutEffect(function () { if (host()) host().moved(); });
    return props.children;
  }

  function render(tree, options) {
    current = tree;
    opts = options || {};
    stamp++;
    index = {};
    var page = tree.page || {};
    index.root = { node: tree.root, parent: null };
    var cls = ["bf-root"];
    if (page.dark) cls.push("dark");
    if (page.context) cls.push("dt-context-" + page.context);
    if (opts.preview) cls.push("bf-preview");
    else cls.push("bf-editing");
    var style = { background: "var(--dt-surface-" + (page.surface || "base") + ")", color: "var(--dt-text-primary)" };
    if (page.gap && ROOT_GAP[page.gap]) style.gap = "calc(var(" + ROOT_GAP[page.gap] + ") * var(--dt-layout-scale, 1))";
    var kids = tree.root.children.length ? tree.root.children.map(function (c) { return renderNode(c, "root"); }) : empty("root");
    root.render(e(Painted, null, e("div", { className: cls.join(" "), "data-layout": page.spacing || undefined, "data-bf-id": "root", style: style }, kids)));
  }

  /* ---------------------------------------------------------- geometry */

  function wrapper(id) {
    return document.querySelector('[data-bf-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  }

  /* A node's box. Its wrapper is display: contents, so the box is the union of
     what it renders. */
  function rect(id) {
    var w = wrapper(id);
    if (!w) return null;
    var r;
    if (id === "root") r = w.getBoundingClientRect();
    else {
      var range = document.createRange();
      range.selectNodeContents(w);
      r = range.getBoundingClientRect();
    }
    if (!r || (!r.width && !r.height)) return null;
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  }

  function contains(ancestorId, id) {
    var cur = index[id];
    while (cur) {
      if (cur.node.id === ancestorId) return true;
      cur = cur.parent ? index[cur.parent] : null;
    }
    return false;
  }

  /* The element that lays a container's children out: the parent of its first
     child's box, which is not always the component's root (Section and Card
     wrap their children in an inner column). */
  function layoutBox(id) {
    var entry = index[id];
    if (!entry) return null;
    var w = wrapper(id);
    if (!w) return null;
    var first = (entry.node.children || []).length ? wrapper(entry.node.children[0].id) : w.querySelector('[data-bf-slot="' + id + '"]');
    if (!first) return null;
    var box = first.parentElement;
    while (box && getComputedStyle(box).display === "contents") box = box.parentElement;
    return box;
  }

  function axisOf(id) {
    var box = layoutBox(id);
    if (!box) return "y";
    var cs = getComputedStyle(box);
    if (cs.display.indexOf("grid") >= 0) return "grid";
    if (cs.display.indexOf("flex") >= 0 && cs.flexDirection.indexOf("row") === 0) return "x";
    return "y";
  }

  function childRects(id, skip) {
    var entry = index[id];
    return (entry.node.children || []).map(function (c, i) { return { id: c.id, i: i, r: c.id === skip ? null : rect(c.id) }; })
      .filter(function (c) { return c.r; });
  }

  /* Where in a container a point lands, in reading order. */
  function indexIn(id, x, y, axis, skip) {
    var kids = childRects(id, skip);
    for (var k = 0; k < kids.length; k++) {
      var r = kids[k].r;
      if (axis === "y") {
        if (y < r.top + r.height / 2) return kids[k].i;
      } else {
        if (y < r.top) return kids[k].i;
        if (y <= r.bottom && x < r.left + r.width / 2) return kids[k].i;
      }
    }
    return (index[id].node.children || []).length;
  }

  /* The line that shows an insertion point, in frame coordinates. */
  function lineFor(id, at, axis, skip) {
    var node = index[id].node;
    var kids = (node.children || []).filter(function (c) { return c.id !== skip; });
    var before = node.children[at] && node.children[at].id !== skip ? node.children[at] : null;
    if (!before) {
      for (var j = at; j < node.children.length; j++) if (node.children[j].id !== skip) { before = node.children[j]; break; }
    }
    if (!kids.length) {
      var slot = document.querySelector('[data-bf-slot="' + id + '"]');
      var sr = slot ? slot.getBoundingClientRect() : rect(id);
      return sr ? { box: { left: sr.left, top: sr.top, width: sr.width, height: sr.height } } : null;
    }
    var r, edge;
    if (before) { r = rect(before.id); edge = "start"; }
    else { r = rect(kids[kids.length - 1].id); edge = "end"; }
    if (!r) return null;
    if (axis === "y") return { line: { left: r.left, top: edge === "start" ? r.top : r.bottom, width: r.width, height: 0 } };
    return { line: { left: edge === "start" ? r.left : r.right, top: r.top, width: 0, height: r.height } };
  }

  /* Where a dragged component would land at (x, y): { parent, index, line }
     or null. dragId is the node being moved, if any; it can't land inside
     itself. */
  function drop(x, y, dragId, edgePx) {
    if (!current) return null;
    var el = document.elementFromPoint(x, y);
    var w = el && el.closest ? el.closest("[data-bf-id]") : null;
    var id = w ? w.getAttribute("data-bf-id") : "root";
    if (!index[id]) id = "root";
    if (dragId && dragId !== "root" && contains(dragId, id)) {
      /* Over the dragged node itself: treat it as its own slot in its parent. */
      id = dragId;
    }
    while (id) {
      var entry = index[id];
      var node = entry.node;
      var r = rect(id);
      var parentId = entry.parent;
      if (CONTAINERS[node.type] && id !== dragId) {
        var edge = parentId ? Math.min(edgePx || 10, r ? r.height / 4 : 0, r ? r.width / 4 : 0) : 0;
        var pAxis = parentId ? axisOf(parentId) : "y";
        var nearStart = r && (pAxis === "y" ? y - r.top < edge : x - r.left < edge);
        var nearEnd = r && (pAxis === "y" ? r.bottom - y < edge : r.right - x < edge);
        if (!parentId || !(nearStart || nearEnd)) {
          var axis = axisOf(id);
          var at = indexIn(id, x, y, axis, dragId);
          var shown = lineFor(id, at, axis, dragId);
          return { parent: id, index: at, line: shown && shown.line, box: shown && shown.box };
        }
      }
      if (!parentId) return null;
      /* A leaf, or the edge of a container: before or after it, in its parent. */
      var siblings = index[parentId].node.children;
      var mine = siblings.indexOf(node);
      var ax = axisOf(parentId);
      var after = r ? (ax === "y" ? y > r.top + r.height / 2 : (y > r.bottom ? true : y < r.top ? false : x > r.left + r.width / 2)) : true;
      var at2 = mine + (after ? 1 : 0);
      if (dragId && siblings[mine] && siblings[mine].id === dragId) at2 = mine;
      var shown2 = lineFor(parentId, at2, ax, dragId);
      return { parent: parentId, index: at2, line: shown2 && shown2.line, box: shown2 && shown2.box };
    }
    return null;
  }

  function pick(x, y) {
    var el = document.elementFromPoint(x, y);
    var w = el && el.closest ? el.closest("[data-bf-id]") : null;
    return w ? w.getAttribute("data-bf-id") : null;
  }

  /* ------------------------------------------------------------- events */

  /* While editing, a click selects instead of following a link, submitting a
     form or opening a menu. Preview mode hands the canvas back. */
  function editing() { return current && !opts.preview; }
  function host() { return window.parent && window.parent !== window ? window.parent.BuilderHost : null; }

  ["click", "submit", "auxclick", "dblclick"].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      if (!editing()) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (type === "click" && host()) {
        var w = ev.target.closest ? ev.target.closest("[data-bf-id]") : null;
        host().pick(w ? w.getAttribute("data-bf-id") : "root");
      }
    }, true);
  });
  document.addEventListener("pointerdown", function (ev) {
    if (!editing()) return;
    /* No focus, no text selection, no native drag of an image. */
    if (ev.pointerType === "mouse") ev.preventDefault();
  }, true);
  document.addEventListener("pointermove", function (ev) {
    if (!editing() || !host() || ev.pointerType !== "mouse") return;
    host().hover(pick(ev.clientX, ev.clientY));
  }, true);
  document.addEventListener("pointerleave", function () { if (host()) host().hover(null); });
  document.addEventListener("keydown", function (ev) {
    if (!editing() || !host()) return;
    if (host().key(ev)) ev.preventDefault();
  }, true);
  window.addEventListener("scroll", function () { if (host()) host().moved(); }, { passive: true });
  window.addEventListener("resize", function () { if (host()) host().moved(); });
  if (window.ResizeObserver) new ResizeObserver(function () { if (host()) host().moved(); }).observe(mount);

  /* The site's Configure panel themes every same-origin frame, dark mode and
     context included. Here those two belong to the builder's own controls,
     on the canvas root, so they're taken back off <html>. */
  function keepHtmlNeutral() {
    ["dark", "dt-context-product", "dt-context-marketing", "dt-context-social"].forEach(function (c) {
      if (html.classList.contains(c)) html.classList.remove(c);
    });
  }
  keepHtmlNeutral();
  new MutationObserver(keepHtmlNeutral).observe(html, { attributes: true, attributeFilter: ["class"] });

  /* ---------------------------------------------------------------- code */

  var names = new Map();
  Object.keys(NS).forEach(function (k) { if (typeof NS[k] === "function" || typeof NS[k] === "object") names.set(NS[k], k); });

  function isElement(v) { return v && typeof v === "object" && v.$$typeof && v.props !== undefined; }
  function tagOf(type, used) {
    if (typeof type === "string") return type;
    if (type === React.Fragment) return "";
    var n = names.get(type);
    if (n) { used.add(n); return n; }
    return "Component";
  }
  function attrName(k) { return k === "className" ? "className" : k; }

  function value(v, used, depth) {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "function") return "() => {}";
    if (isElement(v)) return inline(v, used);
    if (Array.isArray(v)) return "[" + v.map(function (x) { return value(x, used, depth + 1); }).join(", ") + "]";
    if (typeof v === "object") {
      var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined; });
      if (!keys.length) return "{}";
      return "{ " + keys.map(function (k) { return (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ": " + value(v[k], used, depth + 1); }).join(", ") + " }";
    }
    return "undefined";
  }

  function attrs(props, used) {
    return Object.keys(props).filter(function (k) {
      return k !== "children" && k !== "key" && k !== "ref" && props[k] !== undefined && !/^data-bf-/.test(k);
    }).map(function (k) {
      var v = props[k];
      if (v === true) return attrName(k);
      if (typeof v === "string" && !/["\n{}<>]/.test(v)) return attrName(k) + '="' + v + '"';
      return attrName(k) + "={" + value(v, used, 0) + "}";
    });
  }

  function childText(c, used) {
    if (c === null || c === undefined || c === false || c === true) return "";
    if (Array.isArray(c)) return c.map(function (x) { return childText(x, used); }).join("");
    if (isElement(c)) return inline(c, used);
    var s = String(c);
    return /[{}<>]/.test(s) ? "{" + JSON.stringify(s) + "}" : s;
  }

  /* An element on one line, for a prop value or a specimen's own children. */
  function inline(el, used) {
    var tag = tagOf(el.type, used);
    var a = attrs(el.props || {}, used);
    var kids = childText(el.props ? el.props.children : null, used);
    var open = "<" + tag + (a.length ? " " + a.join(" ") : "");
    return kids ? open + ">" + kids + "</" + tag + ">" : (tag ? open + " />" : "<></>");
  }

  function block(node, used, pad) {
    var tag = node.type;
    used.add(tag);
    var p = propsOf(node);
    var a = attrs(p, used);
    var open = pad + "<" + tag + (a.length ? " " + a.join(" ") : "");
    if (CONTAINERS[node.type]) {
      if (!(node.children || []).length) return open + " />";
      return open + ">\n" + node.children.map(function (c) { return block(c, used, pad + "  "); }).join("\n") + "\n" + pad + "</" + tag + ">";
    }
    var kids = childText(p.children, used);
    return kids ? open + ">" + kids + "</" + tag + ">" : open + " />";
  }

  function jsx(tree) {
    var used = new Set();
    var page = tree.page || {};
    var kids = tree.root.children.map(function (c) { return block(c, used, "      "); });
    var rootStyle = ["background: \"var(--dt-surface-" + (page.surface || "base") + ")\""];
    if (page.gap && ROOT_GAP[page.gap]) rootStyle.push("display: \"flex\"", "flexDirection: \"column\"", "gap: \"var(" + ROOT_GAP[page.gap] + ")\"");
    var cls = [page.dark ? "dark" : "", page.context ? "dt-context-" + page.context : ""].filter(Boolean).join(" ");
    var rootAttrs = (cls ? ' className="' + cls + '"' : "") + (page.spacing ? ' data-layout="' + page.spacing + '"' : "") + " style={{ " + rootStyle.join(", ") + " }}";
    var names = Array.from(used).filter(function (n) { return n !== "Root" && NS[n]; }).sort();
    return (names.length ? "import { " + names.join(", ") + ' } from "@dovetail-ds/react";\n\n' : "") +
      "export function Screen() {\n  return (\n    <div" + rootAttrs + ">\n" + kids.join("\n") + (kids.length ? "\n" : "") + "    </div>\n  );\n}\n";
  }

  window.BuilderFrame = {
    render: render,
    rect: rect,
    drop: drop,
    pick: pick,
    jsx: jsx,
    has: function (type) { return !!NS[type]; },
    /* A component's starting props that are plain values, so the inspector
       can show what a control is set to before the reader touches it. */
    scalars: function (type) {
      var b = base(type), out = {};
      Object.keys(b).forEach(function (k) {
        var v = b[k];
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
      });
      return out;
    },
    hasStarter: function (type) { return !!((specs.samples && specs.samples[type]) || specs.build[type]); },
  };
  if (host()) host().ready();
})();
