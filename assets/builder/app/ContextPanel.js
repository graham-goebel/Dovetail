/* The Context panel: what the assistant reads besides the canvas. Docs
   (markdown, written here or uploaded) and skills (a SKILL.md and its
   files, uploaded as a folder or a zip, or written here), each kept for
   this file, its project, or the team. The App keeps the items and saves
   them; this draws them and edits one at a time. */

import { cx, e, useRef, useState } from "../config.js";
import { Icon } from "../ui/icons.js";
import { Segmented, Switch } from "../ui/parts.js";
import { SCOPES, contextFor, docFromMarkdown, newDoc, newSkill, readSkillMd, skillFromFiles, skillName, tokens, words } from "../model/context.js";
import { unzip } from "../model/unzip.js";

var SCOPE_WORD = { file: "This file", project: "Project", team: "Team" };
var SCOPE_NOTE = { file: "Only this file", project: "Every file in its project", team: "Everyone on the team" };
var USE_WORD = { always: "Always", attach: "When attached", off: "Off" };

function readText(file) { return file.text ? file.text() : new Response(file).text(); }
function readBytes(file) { return (file.arrayBuffer ? file.arrayBuffer() : new Response(file).arrayBuffer()).then(function (b) { return new Uint8Array(b); }); }

/* What an upload holds: markdown files become docs; a zip, or a folder of
   files, becomes a skill. Resolves to { docs, skills, errors }. */
function readUpload(files) {
  var list = Array.prototype.slice.call(files || []);
  var out = { docs: [], skills: [], errors: [] };
  var folder = list.filter(function (f) { return f.webkitRelativePath; });
  var steps = [];
  if (folder.length) {
    steps.push(Promise.all(folder.filter(function (f) { return f.size < 400000 && /\.(md|markdown|txt|json|ya?ml|css|html|js|ts|tsx|jsx|svg|csv)$/i.test(f.name); })
      .map(function (f) { return readText(f).then(function (body) { return { path: f.webkitRelativePath, body: body }; }); }))
      .then(function (got) { var s = skillFromFiles(got, folder[0].webkitRelativePath.split("/")[0]); if (s.error) out.errors.push(s.error); else out.skills.push(s); }));
  }
  list.filter(function (f) { return !f.webkitRelativePath; }).forEach(function (f) {
    if (/\.zip$/i.test(f.name)) {
      steps.push(readBytes(f).then(unzip).then(function (got) {
        var s = skillFromFiles(got, f.name.replace(/\.zip$/i, ""));
        if (s.error) out.errors.push(f.name + ": " + s.error); else out.skills.push(s);
      }, function (err) { out.errors.push(f.name + ": " + err.message); }));
    } else if (/^SKILL\.md$/i.test(f.name)) {
      steps.push(readText(f).then(function (body) { var s = skillFromFiles([{ path: "SKILL.md", body: body }], "skill"); if (s.error) out.errors.push(s.error); else out.skills.push(s); }));
    } else if (/\.(md|markdown|txt)$/i.test(f.name)) {
      if (f.size > 400000) out.errors.push(f.name + " is too large.");
      else steps.push(readText(f).then(function (body) { out.docs.push(docFromMarkdown(f.name, body)); }));
    } else out.errors.push(f.name + " isn't markdown, a zip or a folder.");
  });
  return Promise.all(steps).then(function () { return out; });
}

function scopeChips(p, it) {
  if (!it.pages.length) return null;
  var names = it.pages.map(function (id) { var pg = p.pages.filter(function (x) { return x.id === id; })[0]; return pg ? pg.name : null; }).filter(Boolean);
  return names.length ? e("div", { className: "bd-cx-chips" }, names.map(function (n) { return e("span", { key: n, className: "bd-cx-chip is-page" }, n); })) : null;
}

function itemRow(p, scope, it, open) {
  var isDoc = it.kind === "doc";
  var on = isDoc ? it.use !== "off" : it.enabled;
  var sub = isDoc ? (it.source === "uploaded" ? "Uploaded" : it.source === "generated" ? "Drafted" : "Written here") + " · " + words(it.body) + " words" + (it.use === "attach" ? " · when attached" : "")
    : (it.source === "uploaded" ? "Uploaded" : "Written here") + " · " + it.files.length + (it.files.length === 1 ? " file" : " files");
  return e("div", { key: it.id, className: cx("bd-cx-item", !on && "is-off"), "data-ctx": it.id },
    e("button", { type: "button", className: "bd-cx-open", onClick: open, "aria-label": "Open " + (isDoc ? it.title : it.name) },
      e("span", { className: cx("bd-cx-icon", !isDoc && "is-skill") }, e(Icon, { name: isDoc ? "file" : "bolt" })),
      e("span", { className: "bd-cx-main" },
        e("span", { className: "bd-cx-title" }, isDoc ? it.title : it.name),
        !isDoc && it.description ? e("span", { className: "bd-cx-when" }, it.description) : null,
        e("span", { className: "bd-cx-sub" }, sub),
        scopeChips(p, it))),
    e(Switch, { label: (on ? "Turn off " : "Turn on ") + (isDoc ? it.title : it.name), value: on,
      onChange: function (v) { p.update(scope, it.id, isDoc ? { use: v ? "always" : "off" } : { enabled: v }); } }));
}

/* One item, open to edit. */
function editor(p, scope, it, close, fileSel, setFileSel) {
  var isDoc = it.kind === "doc";
  var set = function (patch) { p.update(scope, it.id, patch); };
  var fileIdx = Math.min(fileSel, Math.max(0, (it.files || []).length - 1));
  var file = !isDoc ? it.files[fileIdx] : null;
  return e("div", { className: "bd-cx-edit" },
    e("div", { className: "bd-cx-edit-head" },
      e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to all context", onClick: close }, e(Icon, { name: "left" })),
      e("input", { className: "bd-input bd-cx-name", "aria-label": isDoc ? "Doc title" : "Skill name", value: isDoc ? it.title : it.name,
        onChange: function (ev) { set(isDoc ? { title: ev.target.value.slice(0, 120) } : { name: skillName(ev.target.value) }); } }),
      e(Switch, { label: isDoc ? "Use this doc" : "Use this skill", value: isDoc ? it.use !== "off" : it.enabled, onChange: function (v) { set(isDoc ? { use: v ? "always" : "off" } : { enabled: v }); } })),
    !isDoc ? e("label", { className: "bd-cx-field" }, e("span", { className: "bd-field-label" }, "Use when"),
      e("input", { className: "bd-input", value: it.description, placeholder: "a request fits this skill",
        onChange: function (ev) { set({ description: ev.target.value.slice(0, 1024) }); } })) : null,
    e("div", { className: "bd-cx-field" }, e("span", { className: "bd-field-label" }, "Kept for"),
      e(Segmented, { label: "Kept for", wide: true, value: scope, onChange: function (v) { if (v && v !== scope) p.move(scope, v, it.id); },
        options: SCOPES.map(function (s) { return { value: s, label: SCOPE_WORD[s], title: SCOPE_NOTE[s] + (s === "project" && !p.hasProject ? " (put this file in a project first)" : ""), disabled: s === "project" && !p.hasProject }; }).filter(function (o) { return !o.disabled; }) })),
    isDoc ? e("div", { className: "bd-cx-field" }, e("span", { className: "bd-field-label" }, "Use"),
      e(Segmented, { label: "Use", wide: true, value: it.use, onChange: function (v) { if (v) set({ use: v }); },
        options: ["always", "attach", "off"].map(function (u) { return { value: u, label: USE_WORD[u] }; }) })) : null,
    scope === "file" && p.pages.length > 1 ? e("div", { className: "bd-cx-field" }, e("span", { className: "bd-field-label" }, "Pages"),
      e("div", { className: "bd-cx-chips" },
        e("button", { type: "button", className: cx("bd-cx-chip", !it.pages.length && "is-on"), "aria-pressed": String(!it.pages.length), onClick: function () { set({ pages: [] }); } }, "All pages"),
        p.pages.map(function (pg) {
          var on = it.pages.indexOf(pg.id) >= 0;
          return e("button", { key: pg.id, type: "button", className: cx("bd-cx-chip", on && "is-on"), "aria-pressed": String(on),
            onClick: function () { set({ pages: on ? it.pages.filter(function (x) { return x !== pg.id; }) : it.pages.concat([pg.id]) }); } }, pg.name);
        }))) : null,
    !isDoc ? e("div", { className: "bd-cx-files", role: "list", "aria-label": "Skill files" },
      it.files.map(function (f, i) {
        return e("button", { key: f.path, type: "button", role: "listitem", className: cx("bd-cx-file", i === fileIdx && "is-on"), onClick: function () { setFileSel(i); } },
          e(Icon, { name: "file" }), e("span", null, f.path), e("span", { className: "bd-cx-sub" }, i === 0 ? "instructions" : "read when needed"));
      })) : null,
    e("textarea", { className: "bd-input bd-cx-body", "aria-label": isDoc ? "Doc text, in markdown" : (file ? file.path : "File"), spellCheck: true,
      value: isDoc ? it.body : file ? file.body : "",
      onChange: function (ev) {
        var v = ev.target.value.slice(0, 200000);
        if (isDoc) { set({ body: v }); return; }
        var patch = { files: it.files.map(function (f, i) { return i === fileIdx ? { path: f.path, body: v } : f; }) };
        /* SKILL.md's front matter names the skill and says when to use it. */
        if (file && file.path === "SKILL.md") {
          var meta = readSkillMd(v);
          if (meta.description) patch.description = meta.description.slice(0, 1024);
          if (meta.name) patch.name = skillName(meta.name);
        }
        set(patch);
      } }),
    e("div", { className: "bd-cx-foot" },
      e("span", { className: "bd-cx-sub" }, isDoc ? words(it.body) + " words · about " + tokens(it.body) + " tokens" : it.files.length + (it.files.length === 1 ? " file" : " files") + " · about " + tokens(it.files.map(function (f) { return f.body; }).join("")) + " tokens"),
      e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.remove(scope, it.id); close(); } }, e(Icon, { name: "trash" }), "Delete")));
}

function ContextPanel(p) {
  var filterState = useState("all");
  var filter = filterState[0], setFilter = filterState[1];
  var openState = useState(null);
  var open = openState[0], setOpen = openState[1];
  var fileSelState = useState(0);
  var upScopeState = useState("file");
  var upScope = upScopeState[0];
  var fileInput = useRef(null), folderInput = useRef(null);
  var take = function (files) {
    if (!files || !files.length) return;
    readUpload(files).then(function (got) {
      if (got.docs.length || got.skills.length) p.add(upScope, got.docs.concat(got.skills));
      var made = got.docs.length + got.skills.length;
      p.announce((made ? "Added " + (got.docs.length ? got.docs.length + (got.docs.length === 1 ? " doc" : " docs") : "") + (got.docs.length && got.skills.length ? " and " : "") + (got.skills.length ? got.skills.length + (got.skills.length === 1 ? " skill" : " skills") : "") + " to " + SCOPE_WORD[upScope].toLowerCase() + ". " : "") + got.errors.join(" "));
    });
  };
  if (open) {
    var list = p.items[open.scope] || [];
    var it = list.filter(function (x) { return x.id === open.id; })[0];
    /* Moving it keeps it open, in its new scope. */
    var follow = Object.assign({}, p, { move: function (from, to, id) { p.move(from, to, id); setOpen({ scope: to, id: id }); } });
    if (it) return e("div", { className: "bd-cx" }, editor(follow, open.scope, it, function () { setOpen(null); }, fileSelState[0], fileSelState[1]));
  }
  var ctx = contextFor(p.items, p.pageId);
  var shown = function (it) { return (filter === "all" || (filter === "docs" ? it.kind === "doc" : it.kind === "skill")) && (!p.query || (it.title || it.name || "").toLowerCase().indexOf(p.query.toLowerCase()) >= 0); };
  return e("div", { className: "bd-cx", onDragOver: function (ev) { if (ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], "Files") >= 0) ev.preventDefault(); },
    onDrop: function (ev) { if (ev.dataTransfer && ev.dataTransfer.files.length) { ev.preventDefault(); take(ev.dataTransfer.files); } } },
    e("div", { className: "bd-cx-top" },
      e(Segmented, { label: "Show", wide: true, value: filter, onChange: function (v) { if (v) setFilter(v); },
        options: [{ value: "all", label: "All" }, { value: "docs", label: "Docs" }, { value: "skills", label: "Skills" }] })),
    SCOPES.map(function (scope) {
      var items = (p.items[scope] || []).filter(shown);
      if (scope === "project" && !p.hasProject) return e("section", { key: scope, className: "bd-cx-group" },
        e("h3", { className: "bd-cx-h" }, "Project"), e("p", { className: "bd-cx-empty" }, "Put this file in a project on Home to share docs and skills across its files."));
      return e("section", { key: scope, className: "bd-cx-group", "data-scope": scope },
        e("h3", { className: "bd-cx-h" }, e("span", null, scope === "file" ? p.fileName || "This file" : scope === "project" ? p.projectName || "Project" : "Team"), e("span", { className: "bd-cx-sub" }, SCOPE_NOTE[scope])),
        items.length ? items.map(function (x) { return itemRow(p, scope, x, function () { fileSelState[1](0); setOpen({ scope: scope, id: x.id }); }); })
          : e("p", { className: "bd-cx-empty" }, filter === "skills" ? "No skills here yet." : filter === "docs" ? "No docs here yet." : "Nothing here yet."));
    }),
    e("div", { className: "bd-cx-meter", role: "status" },
      e("span", null, "On " + (p.pageName || "this page") + ": " + ctx.docs.length + (ctx.docs.length === 1 ? " doc" : " docs") + " sent, " + ctx.skills.length + (ctx.skills.length === 1 ? " skill" : " skills") + " on call · about " + (ctx.tokens >= 1000 ? (ctx.tokens / 1000).toFixed(1) + "k" : ctx.tokens) + " tokens"),
      e("span", { className: "bd-cx-bar", "aria-hidden": true }, e("i", { style: { width: Math.min(100, Math.round(ctx.tokens / 400)) + "%" } }))),
    e("div", { className: "bd-cx-actions" },
      e(Segmented, { label: "Add to", value: upScope, onChange: function (v) { if (v) upScopeState[1](v); },
        options: SCOPES.filter(function (s) { return s !== "project" || p.hasProject; }).map(function (s) { return { value: s, label: s === "file" ? "File" : SCOPE_WORD[s], title: "New docs and skills go to: " + SCOPE_NOTE[s].toLowerCase() }; }) }),
      e("div", { className: "bd-cx-buttons" },
        e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { fileInput.current && fileInput.current.click(); }, title: "Markdown becomes a doc; a zip with a SKILL.md becomes a skill" }, e(Icon, { name: "upload" }), "Upload"),
        e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { folderInput.current && folderInput.current.click(); }, title: "A skill folder: SKILL.md and the files beside it" }, e(Icon, { name: "folder" }), "Skill folder"),
        e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { var d = newDoc(); p.add(upScope, [d]); setOpen({ scope: upScope, id: d.id }); } }, e(Icon, { name: "pencil" }), "New doc"),
        e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { var s = newSkill(); fileSelState[1](0); p.add(upScope, [s]); setOpen({ scope: upScope, id: s.id }); } }, e(Icon, { name: "bolt" }), "New skill")),
      e("input", { ref: fileInput, type: "file", hidden: true, multiple: true, accept: ".md,.markdown,.txt,.zip", "aria-label": "Upload docs or a skill zip", onChange: function (ev) { take(ev.target.files); ev.target.value = ""; } }),
      e("input", { ref: folderInput, type: "file", hidden: true, webkitdirectory: "", multiple: true, "aria-label": "Upload a skill folder", onChange: function (ev) { take(ev.target.files); ev.target.value = ""; } })));
}

export { ContextPanel, readUpload };
