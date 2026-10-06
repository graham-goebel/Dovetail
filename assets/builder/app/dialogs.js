/* The builder's dialogs: Export (code and pictures), Paste a layout, Versions,
   Keyboard shortcuts, Create component and Play. Each is a <dialog> the App
   keeps a ref to and opens with showModal(); each is memoized, so one that is
   closed costs nothing when something else in the builder changes. Handlers
   come in as stable functions (useEvent in config.js). */

import { DATA, IS_MAC, SHORTCUTS, TOOL_INFO, cx, e, isContainer, kbd, mountEl, nameOf } from "../config.js";
import { readLayout } from "../model/paste.js";
import { VERSIONS_MAX } from "../model/store.js";
import { Icon } from "../ui/icons.js";
import { Segmented, playHeights } from "../ui/parts.js";

var memo = React.memo;

/* The dialog's top: its title, a line under it, and the actions on the right,
   Close last. */
function head(id, title, sub, actions) {
  return e("div", { className: "bd-code-head" },
    e("div", { className: "bd-code-intro" }, e("h2", { id: id }, title), e("p", { className: "bd-inspect-sub" }, sub)),
    e("div", { className: "bd-code-actions" }, actions));
}
var closeButton = function (dialogRef, title) {
  return e("button", { key: "close", type: "button", className: "bd-act", "aria-label": "Close", title: title || "Close", onClick: function () { dialogRef.current.close(); } }, e(Icon, { name: "close" }));
};

/* ------------------------------------------------------------- Export */

/* The code for a frame or the picked layers, to copy or download, with the
   same thing as a picture at a chosen scale, the layout as JSON, and a link.
   { dialogRef, code, title, picked, frameName, scale, setScale, hasSelection,
     onCopyCode, onExportImage(type), onCopyLayout, onShare } */
var CodeDialog = memo(function CodeDialog(p) {
  var name = p.title || p.frameName;
  return e("dialog", { className: "bd-code", ref: p.dialogRef, "aria-labelledby": "bd-code-title" },
    head("bd-code-title", "Export: " + name,
      "React with @dovetail-ds/react. Sample data from the specimens is included so it renders as you see it; replace it with your own. Or take " + (p.picked ? p.title : p.frameName) + " as a picture, or every frame as layout JSON.", [
        e("button", { key: "copy", type: "button", className: "bd-btn bd-btn-primary", onClick: p.onCopyCode }, e(Icon, { name: "copy" }), "Copy code"),
        e("a", { key: "dl", className: "bd-btn", href: "data:text/plain;charset=utf-8," + encodeURIComponent(p.code), download: (name.replace(/[^\w]+/g, "") || "Screen") + ".jsx" }, "Download .jsx"),
        e(Segmented, { key: "scale", label: "Picture scale", className: "bd-export-scale", value: String(p.scale), onChange: function (v) { if (v) p.setScale(Number(v)); },
          options: [{ value: "1", label: "1x" }, { value: "2", label: "2x" }, { value: "3", label: "3x" }] }),
        e("button", { key: "png", type: "button", className: "bd-btn", onClick: function () { p.onExportImage("png"); }, title: name + " as a PNG, at " + p.scale + "x" }, e(Icon, { name: "image" }), "PNG"),
        e("button", { key: "jpg", type: "button", className: "bd-btn", onClick: function () { p.onExportImage("jpeg"); }, title: name + " as a JPG, at " + p.scale + "x" }, "JPG"),
        e("button", { key: "json", type: "button", className: "bd-btn", onClick: p.onCopyLayout, title: "Every frame as builder JSON, to paste back here or hand to Claude" }, "Copy layout JSON"),
        e("button", { key: "link", type: "button", className: "bd-btn", onClick: p.onShare, title: p.hasSelection ? "Copy a link to the selected layer" : "Copy a link to " + p.frameName }, e(Icon, { name: "link" }), "Copy link"),
        closeButton(p.dialogRef),
      ]),
    e("pre", { className: "bd-code-pre", tabIndex: 0 }, e("code", null, p.code)));
});

/* ----------------------------------------------------- Paste a layout */

/* Builder JSON, a builder link or JSX, read as it's typed, with what would
   be left out; then added beside the frames or in place of them.
   { dialogRef, text, setText, onImport(mode) } */
var ImportDialog = memo(function ImportDialog(p) {
  var read = readLayout(p.text);
  var ok = read && !read.error;
  var formatHref = mountEl.getAttribute("data-format") || "assets/builder-layouts.md";
  return e("dialog", { className: "bd-code bd-import", ref: p.dialogRef, "aria-labelledby": "bd-import-title" },
    head("bd-import-title", "Paste a layout",
      e(React.Fragment, null, "Paste builder JSON (from Claude, a teammate or Copy layout JSON), a builder link, or JSX with Dovetail components (from the docs or the Code dialog). Only the components, props and tokens the builder can set come in. ",
        e("a", { href: formatHref, target: "_blank", rel: "noopener" }, "The layout format"), "."),
      [closeButton(p.dialogRef)]),
    e("div", { className: "bd-import-body" },
      e("textarea", { className: "bd-import-text", "aria-label": "Layout JSON, JSX or link", spellCheck: false, value: p.text, placeholder: '{ "frames": [ { "name": "Home", "width": 1280, "hug": true, "root": { "children": [ { "type": "HeroBlock" } ] } } ] }',
        onChange: function (ev) { p.setText(ev.target.value); } }),
      e("div", { className: "bd-import-report", role: "status", "aria-live": "polite" },
        !read ? e("p", { className: "bd-sec-empty" }, "Nothing pasted yet.")
          : read.error ? e("p", { className: "bd-import-error" }, e(Icon, { name: "alert" }), read.error)
          : e(React.Fragment, null,
            e("p", { className: "bd-import-ok" }, e(Icon, { name: "check" }),
              read.doc.frames.length + (read.doc.frames.length === 1 ? " frame, " : " frames, ") + read.layers + (read.layers === 1 ? " layer" : " layers") + ": " + read.doc.frames.map(function (f) { return f.name + " (" + f.width + (f.hug ? " wide, hugging" : " × " + f.height) + ")"; }).join(", ")),
            read.report.length ? e("div", { className: "bd-import-dropped" },
              e("p", null, read.report.length + (read.report.length === 1 ? " thing will be left out:" : " things will be left out:")),
              e("ul", null, read.report.slice(0, 12).map(function (line, i) { return e("li", { key: i }, line); })),
              read.report.length > 12 ? e("p", null, "and " + (read.report.length - 12) + " more.") : null) : e("p", { className: "bd-sec-empty" }, "Everything in it comes in."))),
      e("div", { className: "bd-import-actions" },
        e("button", { type: "button", className: "bd-btn bd-btn-primary", disabled: !ok, onClick: function () { p.onImport("add"); } }, e(Icon, { name: "plus" }), ok ? "Add " + (read.doc.frames.length === 1 ? "the frame" : read.doc.frames.length + " frames") : "Add"),
        e("button", { type: "button", className: "bd-btn", disabled: !ok, onClick: function () { p.onImport("replace"); } }, "Replace all frames"))));
});

/* ------------------------------------------------------------ Versions */

/* The project's kept versions, newest first, each with Restore.
   { dialogRef, open, onClose, projectName, versions, onKeep, onRestore(v) } */
var VersionsDialog = memo(function VersionsDialog(p) {
  var dialogProps = { className: "bd-code bd-versions", ref: p.dialogRef, "aria-labelledby": "bd-versions-title", onClose: p.onClose };
  if (!p.open) return e("dialog", dialogProps);
  return e("dialog", dialogProps,
    head("bd-versions-title", "Versions of " + p.projectName,
      "Kept every 10 minutes while you work and before big changes, " + VERSIONS_MAX + " at most. Restoring one is a step you can undo.", [
        e("button", { key: "keep", type: "button", className: "bd-btn", onClick: p.onKeep }, e(Icon, { name: "plus" }), "Keep this version"),
        closeButton(p.dialogRef),
      ]),
    p.versions.length ? e("ul", { className: "bd-versions-list", role: "list" }, p.versions.map(function (v) {
      return e("li", { key: v.key, className: "bd-version" },
        e("span", { className: "bd-version-when" }, new Date(v.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })),
        e("span", { className: "bd-version-what" }, v.label + " · " + v.frames + (v.frames === 1 ? " frame" : " frames")),
        e("button", { type: "button", className: "bd-btn", onClick: function () { p.onRestore(v); } }, "Restore"));
    })) : e("p", { className: "bd-sec-empty" }, "No versions yet. The first is kept after 10 minutes of work, or keep one now."));
});

/* -------------------------------------------------- Keyboard shortcuts */

/* Every shortcut, as this keyboard says them: the tools' own keys first,
   then the groups in SHORTCUTS. { dialogRef, open, onClose } */
var KeysDialog = memo(function KeysDialog(p) {
  var dialogProps = { className: "bd-code bd-keys", ref: p.dialogRef, "aria-labelledby": "bd-keys-title", onClose: p.onClose };
  if (!p.open) return e("dialog", dialogProps);
  var tools = Object.keys(TOOL_INFO).map(function (k) { return TOOL_INFO[k]; }).filter(function (t) { return t.key; })
    .map(function (t) { return [t.label.replace(/:.*$/, ""), t.key]; });
  var groups = [["Tools", tools]].concat(SHORTCUTS);
  return e("dialog", dialogProps,
    head("bd-keys-title", "Keyboard shortcuts", IS_MAC ? "As a Mac keyboard has them." : "On a Mac, Ctrl is ⌘ and Alt is ⌥.", [closeButton(p.dialogRef, "Close (Esc)")]),
    e("div", { className: "bd-keys-groups" }, groups.map(function (g) {
      return e("section", { key: g[0], className: "bd-keys-group", "aria-labelledby": "bd-keys-" + g[0].replace(/\W+/g, "-") },
        e("h3", { id: "bd-keys-" + g[0].replace(/\W+/g, "-") }, g[0]),
        e("dl", null, g[1].map(function (row) {
          return e(React.Fragment, { key: row[0] },
            e("dt", null, row[0]),
            e("dd", null, row[1].split(", ").map(function (k, i) { return e("kbd", { key: i }, kbd(k)); })));
        })));
    })));
});

/* ---------------------------------------------------- Create component */

/* Whether a node can become a component: the tokens it's built on, how many
   layers, and what stops it (a slot, a placed layer, a custom colour). */
function componentCheck(node) {
  var issues = [], tokens = {}, count = 0;
  (function walk(n, depth) {
    count++;
    var label = nameOf(n);
    if (n.type === "Slot") issues.push({ level: "error", text: "A slot only lives inside its component. Select the component instead." });
    Object.keys(n.style || {}).forEach(function (k) {
      var v = n.style[k];
      if (k === "x" || k === "y") {
        if (depth > 0 && k === "x") issues.push({ level: "error", id: n.id, fix: "flow", text: label + " is placed by position. A component's layers sit in its flow." });
        return;
      }
      if (k === "fill" || k === "color") { issues.push({ level: "error", id: n.id, key: k, fix: "token", text: label + " has a custom " + (k === "fill" ? "fill" : "text colour") + " (" + v + "), not a token." }); return; }
      var def = DATA.tokens[k];
      var o = def ? def.options.filter(function (x) { return x.value === v; })[0] : null;
      if (o) o.tokens.forEach(function (t) { tokens[t] = 1; });
    });
    if (n.type === "Group" && n.props.gap && n.props.gap !== "none") tokens["--dt-space-" + (n.props.direction === "row" ? "inline" : "stack") + "-" + n.props.gap] = 1;
    Object.keys(n.props || {}).forEach(function (k) {
      if (typeof n.props[k] === "string" && /^data:/.test(n.props[k])) issues.push({ level: "warn", text: label + " carries an uploaded file. It stays in this browser and isn't in share links." });
    });
    (n.children || []).forEach(function (c) { walk(c, depth + 1); });
  })(node, 0);
  var list = Object.keys(tokens);
  if (count > 300) issues.push({ level: "error", text: "It has " + count + " layers; a component takes up to 300." });
  if (!list.length) issues.push({ level: "error", text: "It isn't built on any tokens yet. Give it spacing, a fill, a radius or a gap from the system first." });
  if (count === 1 && !isContainer(node.type)) issues.push({ level: "warn", text: "It's a single " + node.type + ". As a component it saves its settings, nothing more." });
  return { issues: issues, tokens: list, count: count };
}

/* Naming the selection as a component, with what stops it and a fix for
   what can be fixed. { dialogRef, draft, setDraft, node, onClose, onSave, onFix } */
var ComponentDialog = memo(function ComponentDialog(p) {
  var check = p.node ? componentCheck(p.node) : null;
  var errors = check ? check.issues.filter(function (i) { return i.level === "error"; }) : [];
  var warns = check ? check.issues.filter(function (i) { return i.level === "warn"; }) : [];
  var fixable = errors.some(function (i) { return i.fix; });
  return e("dialog", { className: "bd-code bd-comp-dlg", ref: p.dialogRef, "aria-labelledby": "bd-comp-title", onClose: p.onClose },
    head("bd-comp-title", "Create component",
      "It goes in Assets, under Components › My components, to use again in any frame. A component is built from the system's tokens, so it follows the theme wherever it goes.",
      [closeButton(p.dialogRef)]),
    check ? e("div", { className: "bd-comp-body" },
      e("label", { className: "bd-field" }, e("span", { className: "bd-field-label" }, "Name"),
        e("input", { className: "bd-input bd-comp-name", type: "text", maxLength: 60, value: p.draft.name, onChange: function (ev) { var v = ev.target.value; p.setDraft(function (c) { return c ? Object.assign({}, c, { name: v }) : c; }); } })),
      e("div", { className: cx("bd-comp-status", errors.length ? "is-blocked" : "is-ready"), role: "status" },
        e(Icon, { name: errors.length ? "alert" : "check" }),
        errors.length ? errors.length + (errors.length === 1 ? " thing stops" : " things stop") + " it becoming a component" : "Ready: " + check.count + (check.count === 1 ? " layer" : " layers") + " on " + check.tokens.length + (check.tokens.length === 1 ? " token" : " tokens")),
      errors.length || warns.length ? e("ul", { className: "bd-comp-issues" }, errors.concat(warns).map(function (i, k) {
        return e("li", { key: k, className: "is-" + i.level }, e(Icon, { name: i.level === "error" ? "alert" : "bell" }), e("span", null, i.text));
      })) : null,
      check.tokens.length ? e("details", { className: "bd-comp-tokens" }, e("summary", null, "The tokens it's built on (" + check.tokens.length + ")"),
        e("ul", null, check.tokens.map(function (t) { return e("li", { key: t }, e("code", null, t)); }))) : null,
      e("div", { className: "bd-import-actions" },
        e("button", { type: "button", className: "bd-btn bd-btn-primary", disabled: !!errors.length, onClick: p.onSave }, e(Icon, { name: "component" }), "Create component"),
        fixable ? e("button", { type: "button", className: "bd-btn", onClick: p.onFix, title: "Takes out custom colours and positions inside it, so it uses the system's" }, "Use the system's instead") : null)) : null);
});

/* ---------------------------------------------------------------- Play */

var PLAY_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3];

/* A theater: the screen alone on a dark stage, its name and Close at the
   top, and the screen sizes in a bar along the foot where the canvas keeps
   its tools. { dialogRef, frameRef, stageRef, play, setPlay, box, frame,
   pageName, frameSrc, onClose, onBack, onLoad } */
var PlayDialog = memo(function PlayDialog(p) {
  var play = p.play, fr = p.frame;
  if (!play || !fr) return null;
  var canBack = !!(play.stack && play.stack.length);
  /* How big the screen is drawn: at first no larger than itself and small
     enough to fit; then fit to the stage, fit its width, its actual size,
     or stepped in and out. Larger than the stage, it scrolls. */
  var fitAll = p.box.w ? Math.min((p.box.w - 32) / fr.width, p.box.h / play.h) : 0.5;
  var fitW = p.box.w ? (p.box.w - 32) / fr.width : 0.5;
  var zoom = play.zoom || "auto";
  var sc = zoom === "fit" ? fitAll : zoom === "width" ? fitW : zoom === "actual" ? 1 : typeof zoom === "number" ? zoom : Math.min(1, fitAll);
  sc = Math.max(0.1, Math.min(4, sc));
  var setZoom = function (z) { p.setPlay(Object.assign({}, play, { zoom: z })); };
  var stepZoom = function (dir) {
    var next = dir > 0 ? PLAY_STEPS.filter(function (z) { return z > sc + 0.001; })[0] : PLAY_STEPS.filter(function (z) { return z < sc - 0.001; }).pop();
    if (next) setZoom(next);
  };
  var hs = playHeights(fr.width);
  return e("dialog", { className: "bd-play", ref: p.dialogRef, "aria-labelledby": "bd-play-title", onClose: p.onClose,
    onKeyDown: function (ev) {
      if (canBack && (ev.key === "Backspace" || (ev.altKey && ev.key === "ArrowLeft"))) { ev.preventDefault(); p.onBack(); return; }
      if (ev.metaKey || ev.ctrlKey || ev.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
      var to = ev.key === "-" ? -1 : ev.key === "+" || ev.key === "=" ? 1 : 0;
      if (to) { ev.preventDefault(); stepZoom(to); return; }
      var mode = ev.shiftKey && { Digit1: "fit", Digit2: "width", Digit0: "actual" }[ev.code];
      if (mode) { ev.preventDefault(); setZoom(mode); }
    } },
    e("div", { className: "bd-play-head" },
      canBack ? e("button", { type: "button", className: "bd-act bd-play-close bd-play-back", "aria-label": "Back", title: "Back (Backspace)", onClick: p.onBack }, e(Icon, { name: "left" })) : null,
      e("div", { className: "bd-play-intro" },
        e("h2", { id: "bd-play-title" }, (p.pageName ? p.pageName + " › " : "") + fr.name),
        e("p", { className: "bd-play-sub" }, fr.width + " × " + play.h + ". Scroll inside it; pinned and sticky items behave as on the device.")),
      e("button", { type: "button", className: "bd-act bd-play-close", "aria-label": "Close", title: "Close (Esc)", onClick: function () { p.dialogRef.current.close(); } }, e(Icon, { name: "close" }))),
    e("div", { className: "bd-play-stage", ref: p.stageRef },
      e("div", { className: "bd-play-device", style: { width: Math.round(fr.width * sc), height: Math.round(play.h * sc) } },
        e("iframe", { ref: p.frameRef, src: p.frameSrc, title: fr.name + ", " + fr.width + " by " + play.h, onLoad: p.onLoad,
          style: { width: fr.width, height: play.h, transform: "scale(" + sc + ")" } }))),
    e("div", { className: "bd-play-bar", role: "toolbar", "aria-label": "Screen height and zoom" },
      e(Segmented, { label: "Screen height", value: play.h, onChange: function (v) { if (v) p.setPlay(Object.assign({}, play, { h: v })); },
        options: hs.map(function (x) { return { value: x[0], label: String(x[0]), title: x[1] + ", " + x[0] + " tall" }; }) }),
      e("span", { className: "bd-play-sep", "aria-hidden": true }),
      e("div", { className: "bd-play-zoom", role: "group", "aria-label": "Zoom" },
        e("button", { type: "button", className: "bd-act bd-play-step", "aria-label": "Zoom out", title: "Zoom out (-)", disabled: sc <= PLAY_STEPS[0] + 0.001, onClick: function () { stepZoom(-1); } }, e(Icon, { name: "minus" })),
        e("output", { className: "bd-play-pct", "aria-live": "polite" }, Math.round(sc * 100) + "%"),
        e("button", { type: "button", className: "bd-act bd-play-step", "aria-label": "Zoom in", title: "Zoom in (+)", disabled: sc >= PLAY_STEPS[PLAY_STEPS.length - 1] - 0.001, onClick: function () { stepZoom(1); } }, e(Icon, { name: "plus" }))),
      e(Segmented, { label: "Fit", className: "bd-play-fit", value: typeof zoom === "string" && zoom !== "auto" ? zoom : undefined, onChange: function (v) { if (v) setZoom(v); },
        options: [{ value: "fit", label: "Fit", title: "Fit to screen (Shift+1)" }, { value: "width", label: "Width", title: "Fit width (Shift+2)" }, { value: "actual", label: "100%", title: "Actual size (Shift+0)" }] })));
});

export { CodeDialog, ComponentDialog, ImportDialog, KeysDialog, PlayDialog, VersionsDialog, componentCheck };
