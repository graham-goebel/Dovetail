/* A whole project as code to drop into a React app: Download project code
   in the Export dialog. One file per frame under pages/, one per component
   under components/ (each imported where it's called), the project's
   theme.css, every uploaded picture under assets/, and a README.

     README.md
     theme.css
     pages/index.jsx            the first page; "About us" is about-us.jsx
     components/ProductTile.jsx
     assets/mug.png

   The components are worked out across every page at once
   (model/codegen.js), so a prop one page changes is a prop everywhere. The
   frame writes the code; this decides the files. */

import { PAGE_LINK } from "../ui/parts.js";
import { codeWithComponents } from "./codegen.js";

var DATA_URL = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/;
var EXT = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg", "video/mp4": "mp4", "video/webm": "webm" };

function slug(s, fallback) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

/* The route a page's links lead to: the first page is "/", "About us" is
   "/about-us". The README says to wire them up; they're plain paths. */
function routes(pages) {
  var out = {}, taken = {};
  pages.forEach(function (pg, i) {
    if (i === 0) { out[pg.id] = { file: "index", path: "/" }; taken.index = true; return; }
    var base = slug(pg.name, "page-" + (i + 1)), name = base, n = 2;
    while (taken[name]) name = base + "-" + n++;
    taken[name] = true;
    out[pg.id] = { file: name, path: "/" + name };
  });
  return out;
}

function base64Bytes(b64) {
  var bin = atob(b64), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* opts: {
     name,                       the project's name, for the README
     pages: [{ id, name, doc }], in order
     library,                    the Content library (components, pictures)
     themeCss,                   the project's theme.css, or ""
     exporter: { jsx(tree, name, opts), jsxComponent(c, localFrom) }
   }
   Returns { entries: [{ name, data }], notes } with what the code leaves out. */
function projectFiles(opts) {
  var pages = opts.pages.filter(function (p) { return p && p.doc && p.doc.frames; });
  var map = routes(pages);

  /* Every frame on every page, as roots for one pass of the components. */
  var frames = [];
  pages.forEach(function (pg) {
    var shown = pg.doc.frames;
    shown.forEach(function (fr) { frames.push({ page: pg, frame: fr, many: shown.length > 1 }); });
  });
  var got = codeWithComponents(frames.map(function (f) { return f.frame.root; }), opts.library);

  /* Uploaded pictures out of the code into assets/, named after what they
     are in Content where they're there, each once. */
  var assets = {}, assetNames = {}, entries = [];
  var named = {};
  ["images", "illustrations", "icons", "video"].forEach(function (k) {
    ((opts.library && opts.library[k]) || []).forEach(function (it) { if (it && it.src && !named[it.src]) named[it.src] = it.name; });
  });
  var assetFor = function (src) {
    if (assets[src]) return assets[src];
    var m = DATA_URL.exec(src);
    if (!m) return null;
    var base = slug(named[src], "picture"), name = base, n = 2, ext = EXT[m[1]] || "bin";
    while (assetNames[name + "." + ext]) name = base + "-" + n++;
    var file = name + "." + ext;
    assetNames[file] = true;
    entries.push({ name: "assets/" + file, data: base64Bytes(m[2]) });
    return (assets[src] = file);
  };
  /* A tree ready to write: page links as routes, pictures as files. */
  var prepare = function (tree) {
    return JSON.parse(JSON.stringify(tree), function (k, v) {
      if (typeof v !== "string") return v;
      var link = PAGE_LINK.exec(v);
      if (link) return map[link[1]] ? map[link[1]].path : undefined;
      var file = DATA_URL.test(v) ? assetFor(v) : null;
      return file ? "../assets/" + file : v;
    });
  };

  var files = [], firstFn = null;
  frames.forEach(function (f, i) {
    var r = map[f.page.id];
    var file = f.many ? r.file + "-" + slug(f.frame.name, "frame-" + (i + 1)) : r.file;
    while (files.indexOf(file) >= 0) file += "-2";
    files.push(file);
    var code = opts.exporter.jsx({ page: Object.assign({}, f.frame, { bare: !!f.frame.bare, root: undefined }), root: prepare(got.roots[i]) }, f.frame.name, { localFrom: "../components/" });
    entries.push({ name: "pages/" + file + ".jsx", data: code });
    if (!firstFn) { var fns = code.match(/export function (\w+)\(\)/g) || []; firstFn = fns.length ? fns[fns.length - 1].replace(/^export function |\(\)$/g, "") : null; }
  });
  got.components.forEach(function (c) {
    entries.push({ name: "components/" + c.name + ".jsx", data: opts.exporter.jsxComponent(Object.assign({}, c, { node: prepare(c.node) }), "./") });
  });

  var theme = opts.themeCss || "";
  if (theme) entries.push({ name: "theme.css", data: theme });
  entries.push({ name: "README.md", data: readme(opts.name, files, firstFn, got.components, theme, pages, map, Object.keys(assetNames)) });

  /* README, the theme, the pages, the components, the pictures; each group
     in the order it was written. */
  var rank = function (n) { return n === "README.md" ? 0 : n === "theme.css" ? 1 : /^pages\//.test(n) ? 2 : /^components\//.test(n) ? 3 : 4; };
  entries = entries.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return rank(a.x.name) - rank(b.x.name) || a.i - b.i; }).map(function (y) { return y.x; });
  return { entries: entries, notes: got.leftOut };
}

function readme(name, files, firstFn, components, theme, pages, map, assets) {
  var lines = [];
  lines.push("# " + (name || "Project"), "");
  lines.push("React code exported from the Dovetail Builder. Every component comes from `@dovetail-ds/react` and is styled only with its tokens, so it follows the theme.", "");
  lines.push("## Use it", "");
  lines.push("1. Install the system and React in your app:", "", "   ```sh", "   npm install @dovetail-ds/react react react-dom", "   ```", "");
  lines.push("2. Load its styles once, at the root of your app" + (theme ? ", then this project's theme after them:" : ":"), "", "   ```js", '   import "@dovetail-ds/react/styles.css";', '   import "@dovetail-ds/react/fonts.css";');
  if (theme) lines.push('   import "./theme.css";');
  lines.push("   ```", "");
  lines.push("3. Copy `pages/`" + (components.length ? ", `components/`" : "") + (assets.length ? " and `assets/`" : "") + " into your source, and render a page:", "", "   ```jsx", "   import { " + (firstFn || "Page") + ' } from "./pages/' + files[0] + '";', "", "   <" + (firstFn || "Page") + " />", "   ```", "", "   Each file in `pages/` exports one function, named after its frame.", "");
  lines.push("## Pages", "");
  pages.forEach(function (pg) { lines.push("- " + pg.name + ": `" + map[pg.id].path + "`"); });
  lines.push("", "Links between pages are written as these paths (`/`, `/about-us`). Point your router at the files in `pages/` to match, or change the paths.", "");
  if (components.length) {
    lines.push("## Components", "");
    components.forEach(function (c) { lines.push("- `" + c.name + "`" + (c.params.length ? " (" + c.params.map(function (p) { return p.name; }).join(", ") + ")" : "")); });
    lines.push("", "Each instance on a page is a call to its component, with the text it changed as props.", "");
  }
  if (assets.length) lines.push("## Pictures", "", "The pictures uploaded in the Builder are in `assets/`, and the code points at them there.", "");
  return lines.join("\n");
}

export { projectFiles, routes, slug };
