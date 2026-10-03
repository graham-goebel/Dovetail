/* Share links, saved work and the first layout a visit opens. */

import { DATA, LIB_KEY, LIB_KINDS, PREFS_KEY, PRESET, STORE_KEY, mql, storage } from "../config.js";
import { readLayout } from "./paste.js";
import { STARTERS } from "./starters.js";
import { clean, cleanNode, copy, emptyDoc, frameById, uid } from "./tree.js";

/* ---------------------------------------------------- share and storage */

/* The Content library saved in this browser, cleaned like anything else that comes in. */
function loadLibrary() {
  var raw = storage(function (s) { return JSON.parse(s.getItem(LIB_KEY) || "null"); }) || {};
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

/* A share link: #b= the layout, then maybe &f= the frame and &n= the
   layer it opens on. */
function initialDoc() {
  /* An example from the docs: its JSX, added as a frame beside what's saved. */
  var jx = /^#jsx=([\w-]+)$/.exec(location.hash);
  if (jx) {
    /* Read once: a reload shouldn't add the example again. */
    try { window.history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* keep going */ }
    var src = null;
    try {
      var bin = atob(jx[1].replace(/-/g, "+").replace(/_/g, "/"));
      var bytes = new Uint8Array(bin.length);
      for (var b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
      src = new TextDecoder().decode(bytes);
    } catch (err) { src = null; }
    var read = src ? readLayout(src) : null;
    if (read && read.doc) {
      var mine = storage(function (s) { return s.getItem(STORE_KEY); });
      var base = null;
      if (mine) { try { base = clean(JSON.parse(mine)); } catch (err) { base = null; } }
      var added = read.doc.frames.map(function (f) { var c = copy(f); c.id = uid(); c.name = "Example"; return c; });
      if (base) {
        base.frames = base.frames.concat(added).slice(-24);
        base.active = added[0].id;
      } else base = { frames: added, active: added[0].id };
      return { doc: base, from: "jsx", dropped: read.report };
    }
    return { doc: emptyDoc(), from: "jsx", dropped: [], error: read && read.error ? read.error : "That example couldn't be read." };
  }
  var m = /^#b=([\w-]+)((?:&[fn]=[\w-]{1,40})*)$/.exec(location.hash);
  if (m) {
    var shared = decode(m[1]);
    if (shared) {
      var dropped = [];
      var d = clean(shared, dropped);
      var f = /&f=([\w-]+)/.exec(m[2]), n = /&n=([\w-]+)/.exec(m[2]);
      if (f && frameById(d, f[1])) d.active = f[1];
      return { doc: d, from: "link", dropped: dropped, focus: n ? n[1] : null };
    }
  }
  var saved = storage(function (s) { return s.getItem(STORE_KEY); });
  if (saved) {
    try { return { doc: clean(JSON.parse(saved)), from: "saved" }; } catch (err) { /* fall through */ }
  }
  var first = STARTERS[0][2]();
  if (mql("(max-width: 900px)")) first.frames[0].width = PRESET.phone.width;
  return { doc: first, from: "starter" };
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

export { copyText, decode, encode, initialDoc, loadLibrary, loadPrefs, thick, withoutUploads };
