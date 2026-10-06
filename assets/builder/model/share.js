/* Share links, saved work and the first layout a visit opens. */

import { DATA, LIB_KINDS, PANELS, PREFS_KEY, PRESET, mql, storage } from "../config.js";
import { readLayout } from "./paste.js";
import { libScopeOf, pageOf } from "./store.js";
import { STARTERS } from "./starters.js";
import { clean, cleanNode, copy, frameById, uid } from "./tree.js";
import { seedPlayground } from "./playground.js";

/* ---------------------------------------------------- share and storage */

/* The Content library as saved, cleaned like anything else that comes in. */
function loadLibrary(saved) {
  var raw = saved && typeof saved === "object" ? saved : {};
  var out = {};
  LIB_KINDS.forEach(function (k) {
    out[k] = (Array.isArray(raw[k]) ? raw[k] : []).filter(function (it) {
      return it && typeof it.id === "string" && typeof it.name === "string" && typeof it.src === "string" && (k === "video" ? /^data:video\//.test(it.src) : /^data:image\//.test(it.src));
    }).map(function (it) { return { id: it.id, name: it.name.slice(0, 80), src: it.src, original: typeof it.original === "string" && /^data:image\//.test(it.original) ? it.original : undefined }; });
  });
  /* Local components: layers kept to reuse, cleaned like anything else
     that comes in, with the tokens they're built on. */
  out.components = (Array.isArray(raw.components) ? raw.components : []).map(function (c) {
    if (!c || typeof c.id !== "string" || typeof c.name !== "string" || !c.node || typeof c.node !== "object") return null;
    var node = cleanNode(c.node, null);
    return node ? { id: c.id, name: c.name.slice(0, 60), node: node, tokens: Array.isArray(c.tokens) ? c.tokens.filter(function (t) { return typeof t === "string" && /^--dt-[\w-]+$/.test(t); }).slice(0, 300) : [], made: typeof c.made === "number" ? c.made : 0 } : null;
  }).filter(Boolean);
  return out;
}

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

/* What the address asks for, read once: #jsx= an example from the docs, or
   #b= a share link (then maybe &f= the frame and &n= the layer). */
function readHash() {
  var jx = /^#jsx=([\w-]+)$/.exec(location.hash);
  if (jx) {
    /* Read once: a reload shouldn't add the example again. */
    try { window.history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* keep going */ }
    try {
      var bin = atob(jx[1].replace(/-/g, "+").replace(/_/g, "/"));
      var bytes = new Uint8Array(bin.length);
      for (var b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
      return { kind: "jsx", src: new TextDecoder().decode(bytes) };
    } catch (err) { return { kind: "jsx", src: null }; }
  }
  var m = /^#b=([\w-]+)((?:&[fn]=[\w-]{1,40})*)$/.exec(location.hash);
  if (m) {
    var f = /&f=([\w-]+)/.exec(m[2]), n = /&n=([\w-]+)/.exec(m[2]);
    return { kind: "link", data: decode(m[1]), frame: f ? f[1] : null, node: n ? n[1] : null };
  }
  return null;
}

/* A first project's first layout: the landing page, phone-wide on a phone. */
function starterDoc() {
  var first = STARTERS[0][2]();
  if (mql("(max-width: 900px)")) first.frames[0].width = PRESET.phone.width;
  return first;
}

/* The project a visit opens, and its document: a share link opens as a new
   project, an example from the docs joins the last project as a frame, and
   otherwise the last project opens. A browser's first visit also gets the
   Playground, and opens its Start here file. */
function openStart(store) {
  var hash = readHash();
  return store.listProjects().then(function (projects) {
    return seedPlayground(store).then(function (seeded) { return [projects, seeded]; });
  }).then(function (got) {
    var projects = got[0], seeded = got[1];
    var last = store.lastOpened();
    var pick = projects.filter(function (p) { return p.id === last; })[0] || projects[0] || null;
    var current = function () {
      if (!pick) return Promise.resolve(null);
      var page = pageOf(pick);
      return store.loadDoc(pick.id, page).then(function (doc) { return doc ? { project: pick, page: page, doc: doc } : null; });
    };
    var fresh = function (name, doc, extra) {
      return store.createProject(name, doc).then(function (meta) { return Object.assign({ project: meta, page: pageOf(meta), doc: doc }, extra); });
    };
    if (hash && hash.kind === "link" && hash.data) {
      var dropped = [];
      var d = clean(hash.data, dropped);
      if (hash.frame && frameById(d, hash.frame)) d.active = hash.frame;
      return fresh(d.frames.length === 1 ? d.frames[0].name : "Shared layout", d, { from: "link", dropped: dropped, focus: hash.node });
    }
    if (hash && hash.kind === "jsx") {
      var read = hash.src ? readLayout(hash.src) : null;
      return current().then(function (cur) {
        if (!read || !read.doc) {
          var err = read && read.error ? read.error : "That example couldn't be read.";
          return cur ? Object.assign(cur, { from: "jsx", dropped: [], error: err }) : fresh("Untitled", starterDoc(), { from: "jsx", dropped: [], error: err });
        }
        var added = read.doc.frames.map(function (f) { var c = copy(f); c.id = uid(); c.name = "Example"; return c; });
        if (!cur) return fresh("Examples", { frames: added, active: added[0].id }, { from: "jsx", dropped: read.report });
        var base = copy(cur.doc);
        base.frames = base.frames.concat(added).slice(-24);
        base.active = added[0].id;
        return { project: cur.project, doc: base, from: "jsx", dropped: read.report };
      });
    }
    return current().then(function (cur) {
      if (cur) return Object.assign(cur, { from: "saved" });
      if (seeded && seeded.first) return { project: seeded.first, page: pageOf(seeded.first), doc: seeded.doc, from: "playground" };
      return fresh("Untitled", starterDoc(), { from: "starter" });
    });
  }).then(function (init) {
    store.setLastOpened(init.project.id);
    return store.loadLibrary(libScopeOf(init.project)).then(function (lib) {
      init.library = loadLibrary(lib);
      return init;
    });
  });
}

function cleanPanels(raw) {
  var q = raw && typeof raw === "object" ? raw : {};
  var width = function (side) {
    var b = PANELS[side], v = q[side];
    return typeof v === "number" && isFinite(v) ? Math.min(b.max, Math.max(b.min, Math.round(v / PANELS.step) * PANELS.step)) : b.def;
  };
  return { left: width("left"), right: width("right"), leftClosed: q.leftClosed === true, rightClosed: q.rightClosed === true };
}

function loadPrefs() {
  var p = storage(function (s) { return JSON.parse(s.getItem(PREFS_KEY) || "null"); }) || {};
  return {
    category: DATA.groups.some(function (g) { return g.id === p.category; }) ? p.category : DATA.groups[0].id,
    kind: ["primitives", "variables", "components", "blocks", "templates"].indexOf(p.kind) >= 0 ? p.kind : null,
    view: p.view === "list" ? "list" : "grid",
    tabs: p.tabs && typeof p.tabs === "object" ? p.tabs : {},
    closed: p.closed && typeof p.closed === "object" ? p.closed : {},
    stage: typeof p.stage === "string" && /^#[0-9a-f]{6}$/i.test(p.stage) ? p.stage.toLowerCase() : "",
    /* What the canvas shows and snaps to, from the View menu. */
    canvas: Object.assign({ rulers: false, guides: true, columns: false, snapObjects: true, snapGuides: true },
      p.canvas && typeof p.canvas === "object" ? Object.keys(p.canvas).reduce(function (o, k) { if (typeof p.canvas[k] === "boolean") o[k] = p.canvas[k]; return o; }, {}) : {}),
    /* How wide each floating panel is, and whether it's folded away. */
    panels: cleanPanels(p.panels),
  };
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

export { cleanPanels, copyText, decode, encode, loadLibrary, loadPrefs, openStart, readHash, starterDoc, thick, withoutUploads };
