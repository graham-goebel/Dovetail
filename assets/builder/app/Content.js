/* The Content panel: this file's or project's uploads (images, illustrations,
   icons, video) and its brand, as cards that open their galleries, with
   upload, search, background removal and drag onto the canvas. The App
   keeps the library and does the work; Content draws it. Memoized. */

import { LIB_KINDS, cx, e } from "../config.js";
import { Icon } from "../ui/icons.js";
import { Dropdown } from "../ui/parts.js";

var LIB_TABS = [["images", "Images", "image"], ["illustrations", "Illustrations", "squiggle"], ["icons", "Icons", "star"], ["video", "Video", "video"]];
var WORDMARK_TONE = { primary: "brand", secondary: "brand-secondary" };
/* The brand as things to drag onto a frame: the logo (the wordmark file, else
   the name set in type) and the mark. */
function brandPieces(b) {
  var name = b.name || "Your brand";
  var P = window.DovetailConfigurePanel;
  var tone = P && P.config ? WORDMARK_TONE[P.config().wordmarkColor] : null;
  var logo = b.wordmark
    ? { kind: "asset", src: b.wordmark, label: name, media: "image", props: { ratio: "21:9", fit: "contain", radius: "none" }, extra: { name: "Logo", style: { w: "x4" } } }
    : { kind: "new", type: "Heading", label: name, props: Object.assign({ children: name, size: "heading-md", balance: false }, tone ? { tone: tone } : {}), extra: { name: "Logo" } };
  var mark = b.mark ? { kind: "asset", src: b.mark, label: name + " mark", media: "image", props: { ratio: "square", fit: "contain", radius: "none" }, extra: { name: "Brand mark", style: { w: "x2" } } } : null;
  return { logo: logo, mark: mark };
}

/* The Brand gallery: name, logo and mark, each uploaded, replaced or removed. */
function brandPanel(p) {
  var b = p.brand;
  var pieces = brandPieces(b);
  var tile = function (key, label, piece, preview, emptyNote, hint) {
    var fileId = "bd-brand-" + key;
    var hasFile = !!b[key];
    return e("section", { className: "bd-content-sec bd-brand-sec", "aria-labelledby": fileId + "-h",
      onDragOver: function (ev) { if (ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], "Files") >= 0) ev.preventDefault(); },
      onDrop: function (ev) { if (!ev.dataTransfer.files.length) return; ev.preventDefault(); p.readBrandFile(key, ev.dataTransfer.files[0]); } },
      e("h3", { className: "bd-content-h", id: fileId + "-h" }, label),
      piece ? e("button", { type: "button", className: cx("bd-brand-tile", key === "mark" && "is-mark"), "data-brand": key, title: "Drag the " + label.toLowerCase() + " onto a frame, or press to add it",
        onPointerDown: function (ev) { if (ev.pointerType !== "touch") p.startDrag(ev, piece); },
        onClick: function () { if (!p.justDragged.current) p.placeBrand(piece); } }, preview)
        : e("div", { className: "bd-brand-tile is-empty" }, e(Icon, { name: "image" }), e("span", null, emptyNote)),
      e("div", { className: "bd-content-add" },
        e("label", { className: "bd-btn", htmlFor: fileId }, e(Icon, { name: "upload" }), hasFile ? "Replace" : "Upload"),
        e("input", { id: fileId, type: "file", className: "visually-hidden", accept: "image/png,image/jpeg,image/gif,image/webp,image/svg+xml",
          onChange: function (ev) { p.readBrandFile(key, ev.target.files[0]); ev.target.value = ""; } }),
        hasFile ? e("button", { type: "button", className: "bd-btn", onClick: function () { var patch = {}; patch[key] = ""; if (p.setBrandPart(patch)) p.announce("Removed the " + label.toLowerCase() + "."); } }, "Remove") : null),
      hint ? e("p", { className: "bd-content-note" }, hint) : null);
  };
  return e("div", { className: "bd-content" },
    e("div", { className: "bd-panel-head bd-gallery-head" },
      e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to Content", title: "Back to Content", onClick: function () { p.setLibTab(null); p.setBrandErr(null); } }, e(Icon, { name: "left" })),
      e("h2", { className: "bd-panel-title" }, "Brand")),
    e("p", { className: "bd-content-note bd-brand-intro" }, "The same name, logo and mark as Configure's Brand group. Each file keeps its own, and the builder's own header isn't changed. Drag one onto a frame, or press it to add it."),
    e("section", { className: "bd-content-sec" },
      e("label", { className: "bd-content-h", htmlFor: "bd-brand-name" }, "Name"),
      e("input", { id: "bd-brand-name", className: "bd-input", type: "text", maxLength: 80, placeholder: "Your brand", value: b.name,
        onChange: function (ev) { p.setBrandPart({ name: ev.target.value }); } })),
    p.brandErr ? e("p", { className: "bd-brand-err", role: "alert" }, p.brandErr) : null,
    tile("wordmark", "Logo", pieces.logo,
      b.wordmark ? e("img", { src: b.wordmark, alt: "", draggable: false }) : e("span", { className: "bd-brand-word" }, b.name || "Your brand"),
      "", b.wordmark ? null : "Without a logo file, the logo is the name, set in type. SVG or PNG, up to 512KB."),
    tile("mark", "Brand mark", pieces.mark, b.mark ? e("img", { src: b.mark, alt: "", draggable: false }) : null, "No brand mark yet", "A small symbol for beside the logo, or on its own. SVG or PNG, up to 512KB."));
}

/* Content opens on a card for each kind; a card opens its gallery. */
function brandCard(p) {
  var b = p.brand;
  var pics = [b.mark, b.wordmark].filter(Boolean);
  var note = b.wordmark && b.mark ? "Logo and mark" : b.wordmark ? "Logo" : b.mark ? "Mark, and the name" : b.name ? "The name" : "Name, logo and mark";
  return e("li", { key: "brand" }, e("button", { type: "button", className: "bd-kind", "data-kind": "brand", onClick: function () { p.setLibTab("brand"); } },
    e("span", { className: "bd-kind-pics is-brand" }, pics.length ? pics.map(function (src, i) { return e("img", { key: i, src: src, alt: "", draggable: false }); }) : b.name ? e("span", { className: "bd-brand-word" }, b.name) : e(Icon, { name: "tag" })),
    e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, "Brand"), e("span", { className: "bd-kind-note" }, note)),
    e(Icon, { name: "right", className: "bd-kind-chev" })));
}

/* { query, tab, library, busy, brandErr, brand, scopeNote, frameName, justDragged,
     startDrag, insertAsset(item, clip), addToLibrary(kind, files), cutBackground(src),
     libUpdate(kind, id, patch), readBrandFile(kind, file), placeBrand(piece),
     setBrandPart(patch), announce, setLibTab, setBrandErr, setThemeStamp } */
var Content = React.memo(function Content(p) {
  var q0 = p.query.trim().toLowerCase();
  if (!p.tab && q0) {
    var hits = [];
    LIB_KINDS.forEach(function (k) { p.library[k].forEach(function (it) { if (it.name.toLowerCase().indexOf(q0) >= 0) hits.push({ kind: k, it: it }); }); });
    return e("div", { className: "bd-content" },
      e("div", { className: "bd-panel-head" }, e("h2", { className: "bd-panel-title" }, "Results"), e("span", { className: "bd-count" }, hits.length)),
      hits.length ? e("ul", { className: "bd-lib", role: "list" }, hits.map(function (h) {
        var clip = h.kind === "video";
        return e("li", { key: h.it.id, className: "bd-lib-item" },
          e("button", { type: "button", className: cx("bd-lib-thumb", (h.kind === "images" || clip) && !h.it.original && "is-fill"), title: h.it.name + ": drag onto a frame, or press to add",
            onPointerDown: function (ev) { if (ev.pointerType !== "touch") p.startDrag(ev, { kind: "asset", src: h.it.src, label: h.it.name, media: clip ? "video" : "image" }); },
            onClick: function () { if (!p.justDragged.current) p.insertAsset(h.it, clip); } },
            clip ? e("video", { src: h.it.src, muted: true, playsInline: true, preload: "metadata" }) : e("img", { src: h.it.src, alt: "", draggable: false })),
          e("span", { className: "bd-lib-name" }, h.it.name));
      })) : e("p", { className: "bd-empty-note" }, "Nothing in your content matches."));
  }
  if (!p.tab) {
    return e("div", { className: "bd-content" },
      e("div", { className: "bd-panel-head" }, e("h2", { className: "bd-panel-title" }, "Content")),
      e("p", { className: "bd-content-note bd-content-scope" }, p.scopeNote),
      e("ul", { className: "bd-kinds", role: "list" }, [brandCard(p)].concat(LIB_TABS.map(function (t) {
        var items = p.library[t[0]];
        var note = t[0] === "icons" ? (items.length ? items.length + " of yours, and the icon library" : "The icon library, and yours") : items.length ? items.length + (items.length === 1 ? " item" : " items") : "Nothing yet";
        return e("li", { key: t[0] }, e("button", { type: "button", className: "bd-kind", "data-kind": t[0], onClick: function () { p.setLibTab(t[0]); } },
          e("span", { className: cx("bd-kind-pics", t[0] === "icons" && "is-icons") }, items.length
            ? items.slice(0, 3).map(function (it) { return t[0] === "video" ? e("video", { key: it.id, src: it.src, muted: true, playsInline: true, preload: "metadata" }) : e("img", { key: it.id, src: it.src, alt: "", draggable: false }); })
            : e(Icon, { name: t[2] })),
          e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, t[1]), e("span", { className: "bd-kind-note" }, note)),
          e(Icon, { name: "right", className: "bd-kind-chev" })));
      }))));
  }
  if (p.tab === "brand") return brandPanel(p);
  var kind = p.tab;
  var cq = p.query.trim().toLowerCase();
  var items = p.library[kind].filter(function (it) { return !cq || it.name.toLowerCase().indexOf(cq) >= 0; });
  var fileId = "bd-lib-file";
  var lib = window.DovetailConfigurePanel && window.DovetailConfigurePanel.config ? window.DovetailConfigurePanel.config().iconLib : null;
  var icons = (window.DovetailConfigure && window.DovetailConfigure.icons) || {};
  return e("div", { className: "bd-content",
    onDragOver: function (ev) { ev.preventDefault(); ev.currentTarget.classList.add("is-drop"); },
    onDragLeave: function (ev) { ev.currentTarget.classList.remove("is-drop"); },
    onDrop: function (ev) { ev.preventDefault(); ev.currentTarget.classList.remove("is-drop"); p.addToLibrary(kind, ev.dataTransfer.files); } },
    e("div", { className: "bd-panel-head bd-gallery-head" },
      e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to Content", title: "Back to Content", onClick: function () { p.setLibTab(null); } }, e(Icon, { name: "left" })),
      e("h2", { className: "bd-panel-title" }, LIB_TABS.filter(function (t) { return t[0] === kind; })[0][1])),
    kind === "icons" ? e("section", { className: "bd-content-sec", "aria-labelledby": "bd-iconlib" },
      e("h3", { className: "bd-content-h", id: "bd-iconlib" }, "Icon library"),
      e("p", { className: "bd-content-note" }, "The set every component draws its icons from, here and on every page."),
      e("div", { className: "bd-iconlibs", role: "radiogroup", "aria-labelledby": "bd-iconlib" },
        Object.keys(icons).concat(["custom"]).map(function (k) {
          var info = icons[k] || { label: "Custom", note: "Your own set, named in Configure's Media group." };
          return e("button", { key: k, type: "button", role: "radio", className: "bd-iconlib", "aria-checked": String(lib === k),
            onClick: function () { if (window.DovetailConfigurePanel && window.DovetailConfigurePanel.setIconLib) { window.DovetailConfigurePanel.setIconLib(k); p.setThemeStamp(function (n) { return n + 1; }); } } },
            e("span", { className: "bd-iconlib-name" }, info.label), e("span", { className: "bd-iconlib-note" }, info.note));
        }))) : null,
    e("section", { className: "bd-content-sec", "aria-label": "Your " + kind },
          kind === "icons" ? e("h3", { className: "bd-content-h" }, "Your icons") : null,
          e("div", { className: "bd-content-add" },
            e("label", { className: "bd-btn", htmlFor: fileId }, e(Icon, { name: "upload" }), "Upload " + (kind === "icons" ? "SVG icons" : kind === "video" ? "clips" : kind)),
            e("input", { id: fileId, type: "file", multiple: true, className: "visually-hidden", accept: kind === "icons" ? "image/svg+xml,.svg" : kind === "video" ? "video/*" : "image/*",
              onChange: function (ev) { var f = ev.target.files; p.addToLibrary(kind, f); ev.target.value = ""; } }),
            e("span", { className: "bd-content-note" }, "or drop files here")),
          p.busy ? e("p", { className: "bd-content-busy", role: "status" }, p.busy) : null,
          items.length ? e("ul", { className: cx("bd-lib", kind === "icons" && "is-icons"), role: "list" }, items.map(function (it) {
            return e("li", { key: it.id, className: "bd-lib-item" },
              e("button", { type: "button", className: cx("bd-lib-thumb", (kind === "images" || kind === "video") && !it.original && "is-fill"), title: it.name + ": drag onto a frame, or onto a picture or video to fill it; press to add",
                onPointerDown: function (ev) { if (ev.pointerType !== "touch") p.startDrag(ev, { kind: "asset", src: it.src, label: it.name, media: kind === "video" ? "video" : "image" }); },
                onClick: function () { if (!p.justDragged.current) p.insertAsset(it, kind === "video"); } },
                kind === "video" ? e("video", { src: it.src, muted: true, playsInline: true, preload: "metadata" }) : e("img", { src: it.src, alt: "", draggable: false })),
              e("span", { className: "bd-lib-name" }, it.name),
              e(Dropdown, { menu: true, label: "Actions for " + it.name, icon: "more", compact: true, narrow: true, className: "bd-dd-icon bd-lib-menu",
                options: [{ value: "insert", label: "Add to " + p.frameName, icon: "plus" }]
                  .concat(kind !== "icons" && kind !== "video" ? [{ value: "cut", label: "Remove background", icon: "wand" }] : [])
                  .concat(it.original ? [{ value: "restore", label: "Put the background back", icon: "undo" }] : [])
                  .concat([{ value: "delete", label: "Delete", icon: "trash", danger: true }]),
                onChange: function (v) {
                  if (v === "insert") p.insertAsset(it, kind === "video");
                  else if (v === "cut") p.cutBackground(it.src).then(function (url) { if (url) p.libUpdate(kind, it.id, { src: url, original: it.original || it.src }); });
                  else if (v === "restore") p.libUpdate(kind, it.id, { src: it.original, original: undefined });
                  else if (v === "delete") p.libUpdate(kind, it.id, { removed: true });
                } }));
          })) : e("div", { className: "bd-empty" }, e(Icon, { name: LIB_TABS.filter(function (t) { return t[0] === kind; })[0][2] }),
            e("p", null, kind === "icons" ? "Upload SVG icons to use as pictures on the canvas." : kind === "video" ? "Upload clips up to 1.5 MB to reuse them: drag one onto a frame, or onto a Video to fill it." : "Upload " + kind + " to reuse them: drag one onto a frame, or onto a picture to fill it."))));
});

export { Content, LIB_TABS };
