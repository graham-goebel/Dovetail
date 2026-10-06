/* Home: every project and file in this browser, as cards, with New, search,
   a sort, and each card's menu. The App keeps the lists and does the work
   (opening, renaming, moving, deleting); Home draws them and asks. It is
   memoized, and returns nothing while a file is open. */

import { cx, e, useRef } from "../config.js";
import { ago, pagesOf } from "../model/store.js";
import { STARTERS } from "../model/starters.js";
import { Icon } from "../ui/icons.js";
import { Dropdown, Renamable, SearchField, Segmented, Switch } from "../ui/parts.js";

var HOME_SORTS = [{ value: "recent", label: "Recent" }, { value: "alpha", label: "A–Z", title: "Alphabetical" }, { value: "created", label: "Date created" }];

/* When a card was last touched: a project, by the newest of its files. */
function sortWhen(sort, x, files) {
  if (sort === "created") return x.createdAt || 0;
  return files ? files.reduce(function (t, f) { return Math.max(t, f.updatedAt || 0); }, x.updatedAt || 0) : x.updatedAt || 0;
}
function sortList(sort, currentId, list, filesOf) {
  return list.slice().sort(function (a, b) {
    if (sort === "alpha") return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
    /* Recent: the file on screen first, then by last edit. */
    if (sort === "recent" && !filesOf) { var cur = (b.id === currentId) - (a.id === currentId); if (cur) return cur; }
    return sortWhen(sort, b, filesOf ? filesOf(b) : null) - sortWhen(sort, a, filesOf ? filesOf(a) : null);
  });
}
function confirmRow(label, text, actions) {
  return e("div", { className: "bd-proj-confirm", role: "group", "aria-label": label }, e("span", null, text), actions);
}
function skeleton() {
  return e("ul", { className: "bd-projects-grid is-loading", role: "list", "aria-busy": "true", "aria-label": "Loading" }, [0, 1, 2, 3].map(function (i) {
    /* Not a .bd-proj: a card stand-in, never mistaken for a card. */
    return e("li", { key: i, className: "bd-proj-skel", "aria-hidden": "true" }, e("span", { className: "bd-skel bd-skel-thumb" }), e("span", { className: "bd-skel bd-skel-line" }), e("span", { className: "bd-skel bd-skel-line is-short" }));
  }));
}

/* The Dark mode switch, on Home's head. */
function ModeSwitch(p) {
  return e("span", { className: cx("bd-mode", p.className) },
    e("span", { id: "bd-mode-label", className: "bd-mode-text" }, e(Icon, { name: p.dark ? "moon" : "sun" }), e("span", { className: "bd-mode-word" }, "Dark mode")),
    e(Switch, { value: p.dark, labelledBy: "bd-mode-label", onChange: p.setDark }));
}

/* A file's card: its picture, name, when, and a menu of what to do with it. */
function fileCard(p, file, showGroup, groupById, choosePicture) {
  var current = file.id === p.currentId, isOpening = p.opening === file.id;
  var g = showGroup && file.group ? groupById(file.group) : null;
  var when = p.sort === "created" ? "Made " + ago(file.createdAt).toLowerCase() : ago(file.updatedAt);
  var pages = pagesOf(file).length;
  return e("li", { key: file.id, className: cx("bd-proj", current && "is-current", isOpening && "is-opening"), "data-project": file.id },
    e("button", { type: "button", className: "bd-proj-open", onClick: function () { p.openProject(file); }, "aria-label": "Open " + file.name + (current ? ", open now" : ""), "aria-busy": isOpening ? "true" : undefined },
      e("span", { className: "bd-proj-thumb", "aria-hidden": "true" },
        file.thumb ? e("img", { src: file.thumb, alt: "" }) : e(Icon, { name: "frame" }),
        isOpening ? e("span", { className: "bd-proj-loading" }, e("span", { className: "bd-spinner" })) : null)),
    e("div", { className: "bd-proj-row" },
      e("div", { className: "bd-proj-info" },
        p.renamingProj === file.id
          ? e(Renamable, { className: "bd-proj-name", value: file.name, label: "File name", startEditing: true, onChange: function (v) { p.renameProject(file.id, v); } })
          : e("span", { className: "bd-proj-name" }, file.name),
        e("span", { className: "bd-proj-meta" }, (current ? "Open now · " : "") + when + (pages > 1 ? " · " + pages + " pages" : "") + " · " + file.frames + (file.frames === 1 ? " frame" : " frames") + (g ? " · in " + g.name : ""))),
      e(Dropdown, { menu: true, label: "Actions for " + file.name, placeholder: "File", icon: "more", iconOnly: true, compact: true, narrow: true, alignEnd: true, className: "bd-dd-icon bd-proj-menu",
        options: [
          { value: "open", label: "Open", icon: "exportOut" },
          { value: "rename", label: "Rename", icon: "pencil" },
          { value: "picture", label: "Choose a picture", icon: "image" },
          { value: "duplicate", label: "Duplicate", icon: "copy" },
          { value: "download", label: "Download as a file", icon: "upload" },
          { value: "delete", label: "Delete", icon: "trash", danger: true },
        ].concat((p.groups || []).filter(function (x) { return x.id !== file.group; }).map(function (x) { return { value: "into:" + x.id, label: "Move to " + x.name, icon: "folder", group: "Move" }; }))
          .concat(file.group ? [{ value: "out", label: "Move out to Home", icon: "home", group: "Move" }] : []),
        onChange: function (v) {
          if (v === "open") p.openProject(file);
          else if (v === "rename") p.setRenamingProj(file.id);
          else if (v === "picture") choosePicture(file.id);
          else if (v === "duplicate") p.duplicateProject(file.id);
          else if (v === "out") p.moveFile(file.id, null);
          else if (v === "download") p.exportProject(file.id);
          else if (v === "delete") p.setConfirmDel(file.id);
          else if (String(v).indexOf("into:") === 0) p.moveFile(file.id, v.slice(5));
        } })),
    p.confirmDel === file.id ? confirmRow("Delete " + file.name, "Delete for good?", [
      e("button", { key: "d", type: "button", className: "bd-btn bd-btn-danger", onClick: function () { p.deleteProject(file.id); } }, "Delete"),
      e("button", { key: "k", type: "button", className: "bd-btn", onClick: function () { p.setConfirmDel(null); } }, "Keep")]) : null);
}

/* A project's card: a mosaic of its files' pictures, how many, and its menu. */
function groupCard(p, g, files, choosePicture) {
  var key = "g:" + g.id;
  var pics = files.filter(function (f) { return f.thumb; }).slice(0, 4);
  var n = files.length;
  var when = p.sort === "created" ? "Made " + ago(g.createdAt).toLowerCase() : ago(sortWhen(p.sort, g, files));
  return e("li", { key: key, className: "bd-proj is-group", "data-group": g.id },
    e("button", { type: "button", className: "bd-proj-open", onClick: function () { p.goView(g.id); }, "aria-label": "Open " + g.name + ", " + n + (n === 1 ? " file" : " files") },
      e("span", { className: cx("bd-proj-thumb", !g.thumb && pics.length > 1 && "is-mosaic"), "aria-hidden": "true" },
        g.thumb ? e("img", { src: g.thumb, alt: "" })
          : pics.length > 1 ? pics.map(function (f) { return e("img", { key: f.id, src: f.thumb, alt: "" }); })
          : pics.length ? e("img", { src: pics[0].thumb, alt: "" }) : e(Icon, { name: "folder" }),
        e("span", { className: "bd-proj-badge" }, e(Icon, { name: "folder" }), n + (n === 1 ? " file" : " files")))),
    e("div", { className: "bd-proj-row" },
      e("div", { className: "bd-proj-info" },
        p.renamingGroup === g.id
          ? e(Renamable, { className: "bd-proj-name", value: g.name, label: "Project name", startEditing: true, onChange: function (v) { p.renameGroup(g.id, v); } })
          : e("span", { className: "bd-proj-name" }, g.name),
        e("span", { className: "bd-proj-meta" }, when)),
      e(Dropdown, { menu: true, label: "Actions for " + g.name, placeholder: "Project", icon: "more", iconOnly: true, compact: true, narrow: true, alignEnd: true, className: "bd-dd-icon bd-proj-menu",
        options: [
          { value: "open", label: "Open", icon: "folder" },
          { value: "rename", label: "Rename", icon: "pencil" },
          { value: "picture", label: "Choose a picture", icon: "image" },
        ].concat(g.thumb ? [{ value: "auto", label: "Picture from its files", icon: "rotate" }] : []).concat([
          { value: "duplicate", label: "Duplicate", icon: "copy" },
          { value: "download", label: "Download as a file", icon: "upload" },
          { value: "delete", label: "Delete", icon: "trash", danger: true },
        ]),
        onChange: function (v) {
          if (v === "open") p.goView(g.id);
          else if (v === "rename") p.setRenamingGroup(g.id);
          else if (v === "picture") choosePicture(key);
          else if (v === "auto") p.autoGroupPicture(g.id);
          else if (v === "duplicate") p.duplicateGroup(g.id);
          else if (v === "download") p.exportGroup(g.id);
          else if (v === "delete") p.setConfirmDel(key);
        } })),
    p.confirmDel === key ? confirmRow("Delete " + g.name, n ? "Delete the project and its " + (n === 1 ? "file" : n + " files") + "?" : "Delete this empty project?", n ? [
      e("button", { key: "d", type: "button", className: "bd-btn bd-btn-danger", onClick: function () { p.deleteGroup(g.id, false); } }, "Delete all"),
      e("button", { key: "k", type: "button", className: "bd-btn", onClick: function () { p.deleteGroup(g.id, true); }, title: "Delete the project and keep its files on Home" }, "Keep files"),
      e("button", { key: "c", type: "button", className: "bd-btn bd-btn-ghost", onClick: function () { p.setConfirmDel(null); } }, "Cancel")] : [
      e("button", { key: "d", type: "button", className: "bd-btn bd-btn-danger", onClick: function () { p.deleteGroup(g.id, false); } }, "Delete"),
      e("button", { key: "c", type: "button", className: "bd-btn", onClick: function () { p.setConfirmDel(null); } }, "Keep")]) : null);
}

/* { open, projects, groups, currentId, opening, query, view, sort, renamingProj,
     renamingGroup, confirmDel, dark, account, toolbar (on a phone, where the
     bar lives in the canvas pane under this page),
     setQuery, setSort, setRenamingProj, setRenamingGroup, setConfirmDel, goView,
     setDark, openProject, renameProject, duplicateProject, deleteProject,
     moveFile, exportProject, onPicture(who, file), importProject(file),
     renameGroup, duplicateGroup, exportGroup, deleteGroup(id, keepFiles),
     autoGroupPicture, newGroup, newProject(template), newPlayground, openAccount } */
var Home = React.memo(function Home(p) {
  /* The hidden file inputs: a picture for the card asked for, a .dovetail file. */
  var pictureRef = useRef(null), pictureFor = useRef(null), importFileRef = useRef(null);
  var choosePicture = function (key) {
    pictureFor.current = key;
    if (pictureRef.current) pictureRef.current.click();
  };
  if (!p.open) return null;
  var q = p.query.trim().toLowerCase();
  var files = p.projects || [], groups = p.groups || [];
  var groupById = function (id) { return groups.filter(function (g) { return g.id === id; })[0] || null; };
  var inGroup = p.view ? groupById(p.view) : null;
  var filesOf = function (g) { return files.filter(function (f) { return f.group === g.id; }); };
  var match = function (x) { return !q || x.name.toLowerCase().indexOf(q) >= 0; };
  /* On Home: projects and loose files; searching finds files in projects too. */
  var shownGroups = inGroup ? [] : sortList(p.sort, p.currentId, groups.filter(match), filesOf);
  var shownFiles = sortList(p.sort, p.currentId, files.filter(function (f) { return inGroup ? f.group === inGroup.id && match(f) : q ? match(f) : !f.group; }));
  var count = shownGroups.length + shownFiles.length;
  var section = function (title, list) {
    return e("section", { className: "bd-home-sec", "aria-label": title },
      inGroup ? null : e("h2", { className: "bd-home-sec-title" }, title),
      e("ul", { className: "bd-projects-grid", role: "list" }, list));
  };
  var empty = !p.projects ? null
    : q ? (inGroup ? "No file in " + inGroup.name + " is called that." : "Nothing is called that.")
    : inGroup ? "No files in this project yet. Make one with New, or move one here from Home with its ⋯ menu."
    : "Nothing here yet. Make a file or a project with New.";
  var account = p.account;
  return e("main", { className: "bd-home bd-projects", "aria-labelledby": "bd-projects-title" },
    p.toolbar,
    e("input", { ref: pictureRef, type: "file", className: "visually-hidden", accept: "image/*", tabIndex: -1, "aria-hidden": "true",
      onChange: function (ev) {
        var f = ev.target.files && ev.target.files[0]; ev.target.value = "";
        var who = pictureFor.current; pictureFor.current = null;
        if (!who || !f) return;
        p.onPicture(who, f);
      } }),
    e("input", { ref: importFileRef, type: "file", className: "visually-hidden", accept: ".dovetail,application/json", tabIndex: -1, "aria-hidden": "true",
      onChange: function (ev) { var f = ev.target.files && ev.target.files[0]; ev.target.value = ""; p.importProject(f); } }),
    e("div", { className: "bd-home-inner", key: p.view || "home" },
      e("div", { className: "bd-home-head" },
        e("div", { className: "bd-home-heading" },
          inGroup ? e("nav", { className: "bd-crumbs bd-home-crumbs", "aria-label": "Where you are" },
            e("button", { type: "button", className: "bd-crumb", onClick: function () { p.goView(null); } }, "Home"),
            e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›"),
            e("span", { className: "bd-crumb", "aria-current": "page" }, inGroup.name)) : null,
          inGroup && p.renamingGroup === inGroup.id
            ? e(Renamable, { className: "bd-home-title", value: inGroup.name, label: "Project name", startEditing: true, onChange: function (v) { p.renameGroup(inGroup.id, v); } })
            : e("h1", { id: "bd-projects-title", className: "bd-home-title", onDoubleClick: inGroup ? function () { p.setRenamingGroup(inGroup.id); } : undefined, title: inGroup ? "Double-click to rename" : undefined }, inGroup ? inGroup.name : "Home")),
        e("div", { className: "bd-code-actions bd-home-actions" },
          e(ModeSwitch, { className: "bd-home-mode", dark: p.dark, setDark: p.setDark }),
          e("button", { type: "button", className: "bd-btn bd-home-account", "aria-haspopup": "dialog", onClick: p.openAccount, title: account.status === "in" ? "Signed in as " + account.account.email : account.status === "off" ? "The cloud isn't connected yet" : "Sign in or create an account" },
            e(Icon, { name: "user" }), account.status === "in" ? "Account" : "Sign in"),
          e(Dropdown, { menu: true, label: "New", placeholder: "New", icon: "plus", compact: true, alignEnd: true, className: "bd-home-new",
            options: (inGroup ? [] : [{ value: "project", label: "New project", icon: "folder", hint: "A group of files" }]).concat([
              { value: "file", label: inGroup ? "New file in " + inGroup.name : "New file", icon: "file", hint: "A blank canvas" },
            ]).concat(STARTERS.filter(function (st) { return st[0] !== "blank"; }).map(function (st) { return { value: "tpl:" + st[0], label: st[1], icon: "layout", group: "File from a template" }; }))
              .concat(inGroup ? [] : [{ value: "playground", label: "Playground", icon: "star", hint: "Getting started and live examples", group: "Learn" }])
              .concat([{ value: "open", label: "Open a file…", icon: "upload", hint: "A .dovetail file from this computer", group: "From your computer" }]),
            onChange: function (v) {
              if (v === "project") p.newGroup();
              else if (v === "file") p.newProject(null);
              else if (v === "open") { if (importFileRef.current) importFileRef.current.click(); }
              else if (v === "playground") p.newPlayground();
              else if (String(v).indexOf("tpl:") === 0) p.newProject(v.slice(4));
            } }))),
      e("div", { className: "bd-home-tools" },
        e(SearchField, { className: "bd-projects-search bd-home-search", label: inGroup ? "Search " + inGroup.name : "Search projects and files", placeholder: inGroup ? "Search " + inGroup.name : "Search projects and files", value: p.query, onChange: p.setQuery }),
        e("div", { className: "bd-home-bar" },
          e(Segmented, { label: "Sort by", className: "bd-home-sort", value: p.sort, onChange: function (v) { if (v) p.setSort(v); }, options: HOME_SORTS }),
          p.projects ? e("span", { className: "bd-home-count", role: "status" }, count + (count === 1 ? " item" : " items")) : null)),
      !p.projects ? skeleton()
        : !count ? e("p", { className: "bd-sec-empty bd-projects-empty" }, empty)
        : e("div", { className: "bd-home-lists" },
          shownGroups.length ? section("Projects", shownGroups.map(function (g) { return groupCard(p, g, filesOf(g), choosePicture); })) : null,
          shownFiles.length ? section("Files", shownFiles.map(function (f) { return fileCard(p, f, !inGroup, groupById, choosePicture); })) : null)));
});

export { HOME_SORTS, Home };
