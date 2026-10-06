/* The Pages panel: the project's pages and folders as rows, with New folder
   and Add a page, a filter, each row's menu, and dragging a page to a new
   place or into a folder. The drag is the panel's own; the App keeps the
   pages and does the work. Memoized. */

import { cx, e, useRef, useState } from "../config.js";
import { foldersOf, itemsOf, pagesOf } from "../model/store.js";
import { Icon } from "../ui/icons.js";
import { Dropdown, Renamable } from "../ui/parts.js";

/* The rows as the list shows them: loose pages, then each folder with its
   pages when open. */
function pageRows(project) {
  var byId = {};
  foldersOf(project).forEach(function (f) { byId[f.id] = f; });
  var rows = [], seen = {};
  itemsOf(pagesOf(project)).forEach(function (it) {
    var f = it.folder ? byId[it.folder] : null;
    if (!f) { it.pages.forEach(function (p) { rows.push({ kind: "page", page: p, folder: null }); }); return; }
    var open = f.open !== false;
    if (!seen[f.id]) { rows.push({ kind: "folder", folder: f, open: open, count: it.pages.length }); seen[f.id] = true; }
    if (open) it.pages.forEach(function (p) { rows.push({ kind: "page", page: p, folder: f.id }); });
  });
  foldersOf(project).forEach(function (f) { if (!seen[f.id]) rows.push({ kind: "folder", folder: f, open: f.open !== false, count: 0 }); });
  return rows;
}
/* The search keeps the pages whose name, or whose folder's name, matches,
   with their folders open around them. */
function pageMatches(project, q) {
  var byId = {};
  foldersOf(project).forEach(function (f) { byId[f.id] = f; });
  var has = function (text) { return String(text || "").toLowerCase().indexOf(q) >= 0; };
  var rows = [];
  itemsOf(pagesOf(project)).forEach(function (it) {
    var f = it.folder ? byId[it.folder] : null;
    var hits = it.pages.filter(function (p) { return has(p.name) || (f && has(f.name)); });
    if (!hits.length) return;
    if (f) rows.push({ kind: "folder", folder: f, open: true, count: hits.length, found: true });
    hits.forEach(function (p) { rows.push({ kind: "page", page: p, folder: f ? f.id : null }); });
  });
  return rows;
}
/* The place after a folder's last page, in the list without `except`. */
function endOfFolder(project, fid, except) {
  var pages = pagesOf(project).filter(function (p) { return p.id !== except; });
  var last = -1;
  pages.forEach(function (p, i) { if (p.folder === fid) last = i; });
  return last >= 0 ? last + 1 : pages.length;
}

/* { project, pageId, query, renamingPage, renamingFolder, confirmPage,
     setRenamingPage, setRenamingFolder, setConfirmPage, foldFolder(fid, open),
     renameFolder(fid, name), moveFolder(fid, dir), deleteFolder(fid),
     renamePage(id, name), openPage(id), deletePage(id), duplicatePage(id),
     movePage(id, dir), placePage(id, index, folder) (a promise), addFolder,
     addPage, announce(text) } */
var Pages = React.memo(function Pages(p) {
  var project = p.project;
  var projectRef = useRef(project); projectRef.current = project;
  var dragState = useState(null);
  var pageDrag = dragState[0], setPageDrag = dragState[1];
  var pageDragRef = useRef(null), pageDragEnded = useRef(false), pagesListRef = useRef(null);

  /* Where a page on the move would land, from the pointer: a slot between
     rows, or a folder itself. The slot gives a place in the list and the
     folder it joins; after a folder's last page, a pointer tucked in means
     the folder, out at the edge means after it. */
  var pageDropAt = function (x, y) {
    var list = pagesListRef.current;
    var dr = pageDragRef.current;
    if (!list || !dr) return null;
    var rows = dr.rows;
    var els = Array.prototype.slice.call(list.querySelectorAll("[data-row]"));
    var pages = pagesOf(projectRef.current).filter(function (q) { return q.id !== dr.id; });
    var at = function (pid) { var i = pages.findIndex(function (q) { return q.id === pid; }); return i < 0 ? pages.length : i; };
    var listBox = list.getBoundingClientRect();
    var firstOf = function (fid) { var q = pages.filter(function (x) { return x.folder === fid; })[0]; return q ? at(q.id) : pages.length; };
    var slot = els.length, into = null;
    for (var i = 0; i < els.length; i++) {
      var b = els[i].getBoundingClientRect();
      var row = rows[i];
      if (row.kind === "folder" && y >= b.top + b.height * 0.25 && y <= b.bottom - b.height * 0.25) { into = row.folder.id; slot = i; break; }
      if (y < b.top + b.height / 2) { slot = i; break; }
    }
    if (into) return { into: into, index: endOfFolder(projectRef.current, into, dr.id), folder: into, line: null };
    var before = rows[slot], prev = rows[slot - 1];
    var tucked = x > listBox.left + 28;
    var folder = null, index;
    if (before && before.kind === "page" && before.folder && prev && (prev.kind === "page" ? prev.folder === before.folder : prev.folder.id === before.folder)) {
      folder = before.folder; index = at(before.page.id);
    } else if (prev && ((prev.kind === "page" && prev.folder) || (prev.kind === "folder" && !prev.open && prev.count)) && tucked) {
      folder = prev.kind === "page" ? prev.folder : prev.folder.id; index = endOfFolder(projectRef.current, folder, dr.id);
    } else if (prev && prev.kind === "page" && prev.folder) {
      folder = null; index = endOfFolder(projectRef.current, prev.folder, dr.id);
    } else if (before && before.kind === "page") {
      folder = null; index = at(before.page.id);
    } else if (before && before.kind === "folder") {
      folder = null; index = before.count ? firstOf(before.folder.id) : pages.length;
    } else {
      folder = null; index = pages.length;
    }
    var edge = slot < els.length ? els[slot].getBoundingClientRect().top : els.length ? els[els.length - 1].getBoundingClientRect().bottom : listBox.top;
    return { into: null, index: index, folder: folder, line: { top: edge - listBox.top + list.scrollTop, depth: folder ? 1 : 0 } };
  };
  /* Dragging the row moves the page: a few pixels on, the page follows the
     pointer and a line shows where it would land. A finger holds the row a
     moment first, so a swipe still scrolls the list. A drag that moved
     doesn't also open the page. */
  var rowDown = function (pg) {
    return function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      if (p.renamingPage === pg.id || pageDragRef.current || p.query.trim()) return;
      var touch = ev.pointerType === "touch";
      var dr = { id: pg.id, name: pg.name, pointer: ev.pointerId, x0: ev.clientX, y0: ev.clientY, live: false, armed: !touch, timer: 0, rows: pageRows(projectRef.current), drop: null };
      pageDragRef.current = dr;
      var holdScroll = function (tm) { if (dr.armed && tm.cancelable) tm.preventDefault(); };
      if (touch) {
        dr.timer = setTimeout(function () {
          dr.armed = true;
          window.addEventListener("touchmove", holdScroll, { passive: false });
          setPageDrag({ id: dr.id, name: dr.name, x: dr.x0, y: dr.y0, drop: null });
        }, 350);
      }
      var stop = function () {
        clearTimeout(dr.timer);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("touchmove", holdScroll);
        if (pageDragRef.current === dr) pageDragRef.current = null;
        setPageDrag(null);
      };
      var move = function (mv) {
        if (mv.pointerId !== dr.pointer) return;
        var far = Math.abs(mv.clientX - dr.x0) + Math.abs(mv.clientY - dr.y0) >= 4;
        if (!dr.armed) { if (far) stop(); return; }
        if (!dr.live) { if (!far) return; dr.live = true; }
        dr.drop = pageDropAt(mv.clientX, mv.clientY);
        setPageDrag({ id: dr.id, name: dr.name, x: mv.clientX, y: mv.clientY, drop: dr.drop });
      };
      var end = function (up) {
        if (up && up.pointerId !== dr.pointer) return;
        stop();
        if (!dr.live) return;
        pageDragEnded.current = true;
        setTimeout(function () { pageDragEnded.current = false; }, 0);
        if (dr.drop) {
          var fname = dr.drop.folder ? (foldersOf(projectRef.current).filter(function (f) { return f.id === dr.drop.folder; })[0] || {}).name : null;
          p.placePage(dr.id, dr.drop.index, dr.drop.folder).then(function () { p.announce("Moved " + dr.name + (fname ? " into " + fname : "")); });
        }
      };
      var cancel = function (c) { if (!c || c.pointerId === dr.pointer) stop(); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", cancel);
    };
  };

  var q = p.query.trim().toLowerCase();
  var rows = q ? pageMatches(project, q) : pageRows(project);
  var folders = foldersOf(project);
  var items = itemsOf(pagesOf(project));
  var drop = pageDrag && pageDrag.drop;
  var folderRow = function (r, i) {
    var f = r.folder;
    var itemAt = items.findIndex(function (it) { return it.folder === f.id; });
    return e("li", { key: "f" + f.id, className: cx("bd-folder", !r.open && "is-closed", drop && drop.into === f.id && "is-drop"), "data-row": i, "data-folder": f.id },
      e("button", { type: "button", className: "bd-folder-twisty", "aria-expanded": String(r.open), "aria-label": (r.open ? "Close " : "Open ") + f.name, disabled: r.found || undefined, onClick: function () { p.foldFolder(f.id, !r.open); } }, e(Icon, { name: r.open ? "down" : "right" })),
      p.renamingFolder === f.id
        ? e(Renamable, { className: "bd-folder-name", value: f.name, label: "Folder name", startEditing: true, onChange: function (v) { p.renameFolder(f.id, v); } })
        : e("button", { type: "button", className: "bd-folder-open", title: "Double-click to rename", onClick: function () { p.foldFolder(f.id, !r.open); }, onDoubleClick: function () { p.setRenamingFolder(f.id); } },
          e(Icon, { name: "folder" }), e("span", { className: "bd-folder-name" }, f.name), e("span", { className: "bd-folder-count" }, r.count || "")),
      e(Dropdown, { menu: true, label: "Actions for " + f.name, placeholder: "Folder", icon: "more", iconOnly: true, compact: true, narrow: true, className: "bd-dd-icon bd-page-menu",
        options: [{ value: "rename", label: "Rename", icon: "pencil" }]
          .concat(itemAt > 0 ? [{ value: "up", label: "Move up", icon: "up" }] : [])
          .concat(itemAt >= 0 && itemAt < items.length - 1 ? [{ value: "down", label: "Move down", icon: "down" }] : [])
          .concat([{ value: "delete", label: "Delete folder (the pages stay)", icon: "trash" }]),
        onChange: function (v) {
          if (v === "rename") p.setRenamingFolder(f.id);
          else if (v === "up") p.moveFolder(f.id, -1);
          else if (v === "down") p.moveFolder(f.id, 1);
          else if (v === "delete") p.deleteFolder(f.id);
        } }));
  };
  var pageRow = function (r, i) {
    var pg = r.page, on = pg.id === p.pageId;
    var list = pagesOf(project), idx = list.findIndex(function (x) { return x.id === pg.id; });
    return e("li", { key: pg.id, className: cx("bd-page", on && "is-current", r.folder && "is-nested", pageDrag && pageDrag.id === pg.id && "is-moving"), "data-row": i },
      p.renamingPage === pg.id
        ? e(Renamable, { className: "bd-page-name", value: pg.name, label: "Page name", startEditing: true, onChange: function (v) { p.renamePage(pg.id, v); } })
        : e("button", { type: "button", className: "bd-page-open", "aria-current": on ? "page" : undefined, title: "Drag to move, double-click to rename",
          onPointerDown: rowDown(pg), onClick: function () { if (!pageDragEnded.current) p.openPage(pg.id); }, onDoubleClick: function () { p.setRenamingPage(pg.id); } },
          e(Icon, { name: "file" }), e("span", { className: "bd-page-name" }, pg.name)),
      p.confirmPage === pg.id
        ? e("span", { className: "bd-page-confirm", role: "group", "aria-label": "Delete " + pg.name },
          e("button", { type: "button", className: "bd-btn bd-btn-sm bd-btn-danger", onClick: function () { p.deletePage(pg.id); } }, "Delete"),
          e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.setConfirmPage(null); } }, "Keep"))
        : e(Dropdown, { menu: true, label: "Actions for " + pg.name, placeholder: "Page", icon: "more", iconOnly: true, compact: true, narrow: true, className: "bd-dd-icon bd-page-menu",
          options: [
            { value: "rename", label: "Rename", icon: "pencil" },
            { value: "duplicate", label: "Duplicate", icon: "copy" },
          ].concat(idx > 0 ? [{ value: "up", label: "Move up", icon: "up" }] : [])
            .concat(idx < list.length - 1 ? [{ value: "down", label: "Move down", icon: "down" }] : [])
            .concat(folders.filter(function (f) { return f.id !== r.folder; }).map(function (f) { return { value: "into:" + f.id, label: "Move to " + f.name, icon: "folder" }; }))
            .concat(r.folder ? [{ value: "out", label: "Out of the folder", icon: "detach" }] : [])
            .concat(list.length > 1 ? [{ value: "delete", label: "Delete", icon: "trash" }] : []),
          onChange: function (v) {
            if (v === "rename") p.setRenamingPage(pg.id);
            else if (v === "duplicate") p.duplicatePage(pg.id);
            else if (v === "up") p.movePage(pg.id, -1);
            else if (v === "down") p.movePage(pg.id, 1);
            else if (v === "out") p.placePage(pg.id, endOfFolder(project, r.folder, pg.id), null);
            else if (v.indexOf("into:") === 0) p.placePage(pg.id, endOfFolder(project, v.slice(5), pg.id), v.slice(5));
            else if (v === "delete") p.setConfirmPage(pg.id);
          } }));
  };
  return e("div", { className: "bd-pages-panel" },
    e("div", { className: "bd-panel-head" },
      e("h2", { className: "bd-panel-title" }, "Pages"),
      e("span", { className: "bd-panel-acts" },
        e("button", { type: "button", className: "bd-act", "aria-label": "New folder", title: "New folder", onClick: p.addFolder }, e(Icon, { name: "folder" })),
        e("button", { type: "button", className: "bd-act", "aria-label": "Add a page", title: "Add a page", onClick: p.addPage }, e(Icon, { name: "plus" })))),
    q && !rows.length ? e("p", { className: "bd-empty-note" }, "No pages match.") : null,
    e("ul", { className: cx("bd-pages", pageDrag && "is-dragging"), role: "list", ref: pagesListRef },
      rows.map(function (r, i) { return r.kind === "folder" ? folderRow(r, i) : pageRow(r, i); }),
      drop && drop.line ? e("li", { className: cx("bd-page-drop", drop.line.depth && "is-nested"), "aria-hidden": true, style: { top: drop.line.top + "px" } }) : null),
    pageDrag ? e("div", { className: "bd-ghost", style: { left: pageDrag.x + "px", top: pageDrag.y + "px" }, "aria-hidden": true }, pageDrag.name) : null);
});

export { Pages, endOfFolder, pageRows };
