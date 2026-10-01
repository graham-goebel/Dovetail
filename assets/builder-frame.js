/* The builder's canvas. Runs inside assets/builder-frame.html and exposes
   window.BuilderFrame to the builder page (assets/builder.js), which owns the
   document tree, the selection and every control. This side only does what
   needs the canvas's own React and the real component elements:

   - render(tree, options): draws the tree with the bundle's components;
   - rect(id) and drop(x, y, dragId): geometry, in this frame's coordinates;
   - jsx(tree, name): the code for the tree, with each component's full props;
   - detach(node): the same thing built from primitives, where a recipe exists;
   - textRect(id, text): where a node's text sits, for editing it in place;
   - height() and scrollBy(dx, dy): how tall the content is, and scrolling
     that hands back what it couldn't use, so the builder pans the rest.

   The builder shows several frames side by side, each its own copy of this
   page. Every call back to it goes through host(), which the builder binds to
   this frame.

   A node is { id, type, props, style, children }. `props` holds only what the
   reader changed; everything else comes from the component's specimen
   (assets/specimens.js), the same starting point the component pages use, so
   a dropped component looks like a real use of it rather than an empty shell.
   `style` holds token names, never values. Each name is looked up in the
   builder data (assets/builder-data.js, generated and checked by the site
   build), whose declarations are the only way a value reaches the canvas.
   Group is the builder's own flex container: a div whose gap is a token. */

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
  var CONTAINERS = { Root: true, Group: true, Section: true, Stack: true, Inline: true, Grid: true, Card: true };

  var DATA = window.DovetailBuilderData || { tokens: {} };
  var STYLE_KEYS = Object.keys(DATA.tokens);

  /* Group's gap: the inline scale in a row, the stack scale in a column. */
  var GROUP_GAP = { row: "--dt-space-inline-", column: "--dt-space-stack-" };
  function groupStyle(p) {
    var dir = p.direction === "column" ? "column" : "row";
    var st = { display: "flex", flexDirection: dir, flexWrap: p.wrap === false ? "nowrap" : "wrap", alignItems: p.align || "stretch", justifyContent: p.justify || "flex-start" };
    var gap = p.gap || "sm";
    if (gap !== "none") st.gap = "var(" + GROUP_GAP[dir] + gap + ")";
    return st;
  }

  /* The page root's gap reads a layout layer, so it follows the layout's
     character with everything else. */
  var ROOT_GAP = { related: "--dt-layout-stack-related", group: "--dt-layout-stack-group", block: "--dt-layout-stack-block", section: "--dt-layout-stack-section" };

  function styleFor(st) {
    if (!st) return null;
    var out = null;
    STYLE_KEYS.forEach(function (k) {
      if (!st[k]) return;
      var o = DATA.tokens[k].options.filter(function (x) { return x.value === st[k]; })[0];
      if (o) out = Object.assign(out || {}, o.css);
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
  var CLEAN = { Group: true, Section: true, Stack: true, Inline: true, Grid: true };

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
    if (node.type === "Group") {
      var gp = node.props || {};
      var gkids = (node.children || []).length ? node.children.map(function (c) { return renderNode(c, node.id); }) : empty(node.id);
      return e("div", { key: node.id, "data-bf-id": node.id, "data-bf-type": "Group", style: { display: "contents" } },
        e("div", { className: node.style && node.style.dark ? "dark" : undefined, style: Object.assign(groupStyle(gp), styleFor(node.style) || {}) }, gkids));
    }
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
    if (opts.preview) cls.push("bf-preview");
    else cls.push("bf-editing");
    /* A frame that hugs its content grows to it, so nothing here may fill the
       window, and nothing scrolls. */
    if (opts.hug) cls.push("bf-hug");
    html.style.overflow = opts.hug ? "hidden" : "";
    /* While editing, a finger pans and pinches the builder's canvas. */
    html.style.touchAction = opts.preview ? "" : "none";
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
  var bound = null;
  function host() {
    var h = window.parent && window.parent !== window ? window.parent.BuilderHost : null;
    if (!h) return null;
    if (!bound || bound.host !== h) bound = { host: h, api: h.bind ? h.bind(window) : h };
    return bound.api;
  }

  /* Press on any part of a node and drag to move it. Inside the selection,
     the selection moves; elsewhere, the node under the pointer does. Touch
     scrolls instead, and moves with the selection's tag. */
  var press = null;
  var swallowClick = false;

  ["click", "submit", "auxclick", "dblclick"].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      if (!editing()) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (!host()) return;
      var w = ev.target.closest ? ev.target.closest("[data-bf-id]") : null;
      var id = w ? w.getAttribute("data-bf-id") : "root";
      if (type === "dblclick") { host().edit(id); return; }
      if (type !== "click") return;
      if (swallowClick) { swallowClick = false; return; }
      /* Shift adds to the selection; Cmd or Ctrl goes straight to the text. */
      host().pick(id, ev.shiftKey, ev.metaKey || ev.ctrlKey);
    }, true);
  });
  /* A pan or a pinch: every finger while editing, the middle button, a drag
     on the frame's own background, or any drag while the builder holds Space.
     The builder moves the canvas and says whether the pointer moved, so a pan
     doesn't end in a click. */
  var pans = {};
  function panning(ev) {
    if (!host()) return false;
    if (ev.pointerType === "touch") return true;
    if (ev.button === 1 || (host().spaceHeld && host().spaceHeld())) return true;
    var w = ev.target.closest ? ev.target.closest("[data-bf-id]") : null;
    return ev.button === 0 && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey && (!w || w.getAttribute("data-bf-id") === "root");
  }
  document.addEventListener("pointerdown", function (ev) {
    if (!editing()) return;
    /* No focus, no text selection, no native drag of an image. */
    if (ev.pointerType === "mouse") ev.preventDefault();
    if (panning(ev)) {
      pans[ev.pointerId] = true;
      try { ev.target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      host().gesture("down", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType);
      return;
    }
    if (ev.button !== 0 || ev.pointerType === "touch" || ev.shiftKey || ev.metaKey || ev.ctrlKey || !host()) return;
    var w = ev.target.closest ? ev.target.closest("[data-bf-id]") : null;
    var id = w ? w.getAttribute("data-bf-id") : null;
    if (!id || id === "root" || !index[id]) return;
    var sel = host().selection();
    var dragId = sel && sel !== "root" && index[sel] && contains(sel, id) ? sel : id;
    press = { id: dragId, x: ev.clientX, y: ev.clientY, pointer: ev.pointerId, active: false };
    try { ev.target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
  }, true);
  document.addEventListener("pointermove", function (ev) {
    if (!editing() || !host()) return;
    if (pans[ev.pointerId]) { host().gesture("move", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType); return; }
    if (press && ev.pointerId === press.pointer) {
      if (!press.active && Math.abs(ev.clientX - press.x) + Math.abs(ev.clientY - press.y) > 5) {
        press.active = true;
        host().dragStart(press.id);
      }
      if (press.active) { host().dragMove(ev.clientX, ev.clientY); return; }
    }
    if (ev.pointerType === "mouse") host().hover(pick(ev.clientX, ev.clientY));
  }, true);
  function release(commit) {
    return function (ev) {
      if (pans[ev.pointerId]) {
        delete pans[ev.pointerId];
        if (host() && host().gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType)) {
          swallowClick = true;
          setTimeout(function () { swallowClick = false; }, 0);
        }
        return;
      }
      if (!press || ev.pointerId !== press.pointer) return;
      if (press.active && host()) {
        host().dragEnd(commit);
        /* The click that follows this release is the drag's, not a pick. */
        swallowClick = true;
        setTimeout(function () { swallowClick = false; }, 0);
      }
      press = null;
    };
  }
  document.addEventListener("pointerup", release(true), true);
  document.addEventListener("pointercancel", release(false), true);
  document.addEventListener("pointerleave", function () { if (host()) host().hover(null); });
  document.addEventListener("keydown", function (ev) {
    if (!editing() || !host()) return;
    if (host().key(ev)) ev.preventDefault();
  }, true);
  document.addEventListener("keyup", function (ev) { if (host() && host().keyup) host().keyup(ev); }, true);

  /* The wheel scrolls this frame while it can, then pans the canvas; with
     Ctrl or Cmd (a trackpad pinch) it zooms the canvas at the pointer. */
  function room(dx, dy) {
    var se = document.scrollingElement || html;
    if (dy > 0 && se.scrollTop + se.clientHeight < se.scrollHeight - 1) return true;
    if (dy < 0 && se.scrollTop > 0) return true;
    if (dx > 0 && se.scrollLeft + se.clientWidth < se.scrollWidth - 1) return true;
    if (dx < 0 && se.scrollLeft > 0) return true;
    return false;
  }
  window.addEventListener("wheel", function (ev) {
    if (!host() || !host().wheel) return;
    if (!(ev.ctrlKey || ev.metaKey) && room(ev.deltaX, ev.deltaY)) return;
    ev.preventDefault();
    host().wheel(ev.clientX, ev.clientY, ev.deltaX, ev.deltaY, ev.ctrlKey || ev.metaKey, ev.deltaMode);
  }, { passive: false });
  window.addEventListener("scroll", function () { if (host()) host().moved(); }, { passive: true });
  window.addEventListener("resize", function () { if (host()) host().moved(); });
  if (window.ResizeObserver) new ResizeObserver(function () { if (host()) host().moved(); }).observe(mount);

  /* The site's Configure panel themes every same-origin frame, its context
  included. Dark mode here belongs to each frame's own setting, on the canvas
  root, so it's taken back off <html>. */
  function keepHtmlNeutral() {
    if (html.classList.contains("dark")) html.classList.remove("dark");
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
    if (node.type === "Group") {
      var gs = Object.assign(groupStyle(node.props || {}), styleFor(node.style) || {});
      var gattrs = (node.style && node.style.dark ? ' className="dark"' : "") + " style={" + value(gs, used, 0) + "}";
      var gopen = pad + "<div" + gattrs;
      if (!(node.children || []).length) return gopen + " />";
      return gopen + ">\n" + node.children.map(function (c) { return block(c, used, pad + "  "); }).join("\n") + "\n" + pad + "</div>";
    }
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

  function jsx(tree, name) {
    var used = new Set();
    var fn = String(name || "Screen").replace(/[^A-Za-z0-9]+(.)?/g, function (m, c) { return c ? c.toUpperCase() : ""; }).replace(/^[a-z]/, function (c) { return c.toUpperCase(); }).replace(/^\d/, "S$&") || "Screen";
    var page = tree.page || {};
    var kids = tree.root.children.map(function (c) { return block(c, used, "      "); });
    var rootStyle = ["background: \"var(--dt-surface-" + (page.surface || "base") + ")\""];
    if (page.gap && ROOT_GAP[page.gap]) rootStyle.push("display: \"flex\"", "flexDirection: \"column\"", "gap: \"var(" + ROOT_GAP[page.gap] + ")\"");
    var cls = page.dark ? "dark" : "";
    var rootAttrs = (cls ? ' className="' + cls + '"' : "") + (page.spacing ? ' data-layout="' + page.spacing + '"' : "") + " style={{ " + rootStyle.join(", ") + " }}";
    var names = Array.from(used).filter(function (n) { return n !== "Root" && NS[n]; }).sort();
    return (names.length ? "import { " + names.join(", ") + ' } from "@dovetail-ds/react";\n\n' : "") +
      "export function " + fn + "() {\n  return (\n    <div" + rootAttrs + ">\n" + kids.join("\n") + (kids.length ? "\n" : "") + "    </div>\n  );\n}\n";
  }

  /* ------------------------------------------------------------ detach */

  /* A component rebuilt from primitives, so its parts can be moved and
     restyled. Each recipe reads the props the node renders with (its specimen's
     and the reader's) and lays out Groups, Headings, Text and the smaller
     components the same way. Nodes come back without ids; the builder assigns
     them. Where no recipe exists, detach returns null and the button is off. */
  function n(type, props, children, style) {
    var node = { type: type, props: props || {}, style: style || {} };
    if (children) node.children = children.filter(Boolean);
    return node;
  }
  var str = function (v) { return typeof v === "string" || typeof v === "number" ? String(v) : null; };
  var text = function (v, props) { var t = str(v); return t ? n("Text", Object.assign({ children: t }, props || {})) : null; };
  var heading = function (v, size) { var t = str(v); return t ? n("Heading", { children: t, size: size }) : null; };
  var plain = function (props) {
    var out = {};
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (k !== "children" && k !== "style" && k !== "className" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) out[k] = v;
    });
    return out;
  };
  /* A React element from a specimen (a row of Buttons, an img) as nodes. */
  function fromElement(el) {
    if (el === null || el === undefined || el === false) return null;
    if (typeof el === "string" || typeof el === "number") return text(el);
    if (Array.isArray(el)) return el.map(fromElement).filter(Boolean);
    if (!isElement(el)) return null;
    if (el.type === React.Fragment) return fromElement(el.props.children);
    if (el.type === "img") return n("Image", { src: el.props.src, alt: el.props.alt || "" });
    if (typeof el.type === "string") return fromElement(el.props.children);
    var name = names.get(el.type);
    if (!name) return null;
    var kids = [].concat(fromElement(el.props.children) || []);
    if (name === "Inline" || name === "Stack") return n("Group", { direction: name === "Inline" ? "row" : "column", gap: el.props.gap || "sm", align: el.props.align, justify: el.props.justify }, kids);
    var props = plain(el.props);
    if (typeof el.props.children === "string") props.children = el.props.children;
    return CONTAINERS[name] ? n(name, props, kids) : n(name, props);
  }
  var section = function (b, kids) { return n("Section", plain({ tone: b.tone, dark: b.dark, texture: b.texture, spacing: b.spacing, width: b.width }), kids); };
  var header = function (b, size) { return [text(b.eyebrow, { variant: "eyebrow" }), heading(b.title, size || "display-sm"), text(b.lead, { variant: "lead", tone: "secondary" })]; };
  var RECIPES = {
    Stack: function (b, node) { return n("Group", { direction: "column", gap: b.gap || "md", align: b.align, justify: b.justify }, node.children, node.style); },
    Inline: function (b, node) { return n("Group", { direction: "row", gap: b.gap || "sm", align: b.align || "center", justify: b.justify, wrap: b.wrap !== false }, node.children, node.style); },
    Card: function (b, node) {
      return n("Group", { direction: "column", gap: "xs" },
        [text(b.eyebrow, { variant: "eyebrow" }), heading(b.title, "heading-md"), text(b.description, { tone: "secondary" })].concat(node.children || [], [].concat(fromElement(b.footer) || [])),
        Object.assign({ padding: "md", surface: "raised", border: "default", radius: "container" }, node.style));
    },
    BlockHeader: function (b) { return n("Group", { direction: "column", gap: "xs", align: b.align === "center" ? "center" : "flex-start" }, header(b, b.size).concat([].concat(fromElement(b.actions) || []))); },
    HeroBlock: function (b) {
      var copy = n("Group", { direction: "column", gap: "sm", align: b.layout === "centered" ? "center" : "flex-start" }, header(b, "display-lg").concat([].concat(fromElement(b.actions) || [])));
      var media = fromElement(b.media);
      /* Copy beside media as two equal columns, the way the block lays them out. */
      if (b.layout === "centered" || !media) return section(b, [n("Group", { direction: "column", gap: "lg", align: b.layout === "centered" ? "center" : "flex-start" }, [copy].concat(media ? [media] : []))]);
      return section(b, [n("Grid", { columns: 2, gap: "xl", align: "center" }, [copy, media])]);
    },
    SplitBlock: function (b) {
      var points = Array.isArray(b.points) ? n("Group", { direction: "column", gap: "2xs" }, b.points.map(function (p) { return text(p); })) : null;
      var copy = n("Group", { direction: "column", gap: "sm" }, header(b).concat([text(b.body, { tone: "secondary" }), points].concat([].concat(fromElement(b.actions) || []))));
      var media = fromElement(b.media);
      if (!media) return section(b, [copy]);
      return section(b, [n("Grid", { columns: 2, gap: "xl", align: b.align === "top" ? "start" : "center" }, b.reverse ? [media, copy] : [copy, media])]);
    },
    CtaBlock: function (b) { return section(b, [n("Group", { direction: "column", gap: "sm", align: "center" }, header(b).concat([].concat(fromElement(b.actions) || [])))]); },
    FeatureGridBlock: function (b) {
      var items = (b.items || []).map(function (it) { return n("Card", plain({ title: it.title, description: it.description }), []); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: b.columns || 3 }, items)])]);
    },
    StatsBlock: function (b) {
      var stats = (b.stats || []).map(function (it) { return n("Stat", plain({ label: it.label, value: it.value, caption: it.caption })); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: Math.min(4, stats.length || 3) }, stats)])]);
    },
    TestimonialBlock: function (b) {
      var quotes = (b.quotes || []).map(function (q) { return n("Quote", plain({ children: q.quote, attribution: q.name, role: q.role })); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: Math.min(2, quotes.length || 2) }, quotes)])]);
    },
    FaqBlock: function (b) {
      var items = (b.items || []).map(function (it) { return n("Card", plain({ title: it.question, description: it.answer }), []); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Group", { direction: "column", gap: "sm" }, items)])]);
    },
    ProductGridBlock: function (b) {
      var cards = (b.products || []).map(function (pr) { return n("ProductCard", plain({ name: pr.name, price: pr.price, compareAt: pr.compareAt, href: pr.href, locale: pr.locale, currency: pr.currency })); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: b.columns || 3 }, cards)])]);
    },
  };
  function detach(node) {
    var recipe = RECIPES[node.type];
    if (!recipe) return null;
    try { return recipe(propsOf(node), node); } catch (err) { return null; }
  }

  /* Where a node's text is drawn: the box of the element holding it, and the
     type it's set in, so an editor laid over it reads the same. */
  function textRect(id, want) {
    var w = wrapper(id);
    if (!w) return null;
    var target = String(want == null ? "" : want).trim();
    var walker = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
    var node, hit = null;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim() && (!target || node.textContent.trim() === target)) { hit = node; break; }
    }
    var el = hit ? hit.parentElement : null;
    var r = el ? el.getBoundingClientRect() : rect(id);
    if (!r) return null;
    var cs = el ? getComputedStyle(el) : null;
    return {
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      font: cs ? { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textAlign: cs.textAlign, color: cs.color, textTransform: cs.textTransform } : null,
    };
  }

  window.BuilderFrame = {
    render: render,
    detach: detach,
    textRect: textRect,
    canDetach: function (type) { return !!RECIPES[type]; },
    rect: rect,
    drop: drop,
    pick: pick,
    jsx: jsx,
    has: function (type) { return type === "Group" || !!NS[type]; },
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
    /* How tall the content is, for a frame that hugs it. */
    height: function () {
      var r = mount.firstElementChild;
      return r ? Math.ceil(r.getBoundingClientRect().height) : 0;
    },
    /* Scrolls by (dx, dy) and returns how far it really went. */
    scrollBy: function (dx, dy) {
      var x = window.scrollX, y = window.scrollY;
      window.scrollBy(dx, dy);
      return { x: window.scrollX - x, y: window.scrollY - y };
    },
  };
  if (host()) host().ready();
})();
