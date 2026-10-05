/* Where projects live: IndexedDB, which holds far more than localStorage's
   few megabytes and stores documents as they are, without turning them into
   text. Each file (a "project" record, for history's sake) is a name and a
   document (its frames), with versions kept beside it. A project, on Home,
   is a group of files: a "groups" record that a file names as its group; a
   file without one sits loose on Home. The Content library lives here too. Where IndexedDB isn't
   available (some private windows), the same calls fall back to
   localStorage, with its limits.

   Every call returns a promise. Nothing here knows about React. */

import { BACKUP_KEY, LIB_KEY, STORE_KEY, storage } from "../config.js";
import { clean, emptyDoc, uid } from "./tree.js";

var DB_NAME = "dovetail-builder";
var DB_VERSION = 2;
var STORES = ["projects", "docs", "versions", "library", "groups"];
/* How many versions a project keeps, and how far apart automatic ones are. */
var VERSIONS_MAX = 30;
var VERSION_EVERY = 10 * 60 * 1000;
var LAST_KEY = "dovetail-builder-last";
/* Set once the libraries have been kept apart (see migrate). */
var LIBS_DONE_KEY = "dovetail-builder-libs-kept-apart";
/* A project's pages, each its own canvas. The first page's document is the
   project's own (as before pages), so a project saved earlier is simply a
   project of one page. */
var MAIN = "main";
function docKey(id, page) { return !page || page === MAIN ? id : id + ":" + page; }
function pagesOf(meta) {
  return meta && Array.isArray(meta.pages) && meta.pages.length ? meta.pages : [{ id: MAIN, name: "Page 1" }];
}
/* Folders group pages: a page names its folder, and a folder's pages sit
   together in the list. A folder with no pages yet is listed after them. */
function foldersOf(meta) {
  return meta && Array.isArray(meta.folders) ? meta.folders : [];
}
function cleanFolder(f) {
  if (!f || typeof f !== "object" || typeof f.id !== "string" || !/^[\w-]{1,40}$/.test(f.id)) return null;
  var name = String(f.name || "").trim().slice(0, 60) || "Folder";
  return f.open === false ? { id: f.id, name: name, open: false } : { id: f.id, name: name };
}
/* The list as top-level items: a loose page, or a folder's run of pages. */
function itemsOf(pages) {
  var items = [];
  pages.forEach(function (p) {
    var last = items[items.length - 1];
    if (p.folder && last && last.folder === p.folder) last.pages.push(p);
    else items.push({ folder: p.folder || null, pages: [p] });
  });
  return items;
}
/* The page a project opens on: the one last open, or its first. */
function pageOf(meta) {
  var pages = pagesOf(meta);
  return pages.some(function (p) { return p.id === (meta && meta.page); }) ? meta.page : pages[0].id;
}
var FALLBACK_KEY = "dovetail-builder-store";
/* Whose Content library a file uses: its project's, shared by the
   project's files; a loose file's own; or, for files made before libraries
   were kept apart (lib "shared"), the one library they all used. */
function libScopeOf(meta) {
  if (!meta) return "shared";
  if (meta.group) return "g:" + meta.group;
  return meta.lib === "shared" ? "shared" : "f:" + meta.id;
}
/* Two libraries as one: everything in either, the first's copy kept. */
function mergeLibs(a, b) {
  a = a && typeof a === "object" ? a : {};
  b = b && typeof b === "object" ? b : {};
  var out = Object.assign({}, b, a);
  Object.keys(out).forEach(function (k) {
    if (!Array.isArray(a[k]) && !Array.isArray(b[k])) return;
    var seen = {};
    out[k] = [].concat(a[k] || [], b[k] || []).filter(function (it) {
      var id = it && it.id;
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  });
  return out;
}

/* ------------------------------------------------------------ the backend */

function idb() {
  return new Promise(function (resolve) {
    var done = false;
    var finish = function (db) { if (!done) { done = true; resolve(db); } };
    /* A browser that never answers (a locked profile) shouldn't hang the builder. */
    setTimeout(function () { finish(null); }, 4000);
    try {
      if (!window.indexedDB) { finish(null); return; }
      var req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
        if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs", { keyPath: "id" });
        if (!db.objectStoreNames.contains("versions")) db.createObjectStore("versions", { keyPath: "key", autoIncrement: true }).createIndex("project", "project");
        if (!db.objectStoreNames.contains("library")) db.createObjectStore("library", { keyPath: "id" });
        if (!db.objectStoreNames.contains("groups")) db.createObjectStore("groups", { keyPath: "id" });
      };
      req.onsuccess = function () { finish(req.result); };
      req.onerror = function () { finish(null); };
      req.onblocked = function () { finish(null); };
    } catch (err) { finish(null); }
  });
}

/* The same four operations over IndexedDB or over one localStorage entry. */
function idbBackend(db) {
  var run = function (store, mode, fn) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, mode);
      var out;
      tx.oncomplete = function () { resolve(out); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error("The save was stopped.")); };
      var req = fn(tx.objectStore(store));
      if (req) req.onsuccess = function () { out = req.result; };
    });
  };
  return {
    kind: "indexeddb",
    get: function (store, key) { return run(store, "readonly", function (s) { return s.get(key); }); },
    all: function (store) { return run(store, "readonly", function (s) { return s.getAll(); }); },
    put: function (store, value) { return run(store, "readwrite", function (s) { return s.put(value); }); },
    del: function (store, key) { return run(store, "readwrite", function (s) { return s.delete(key); }); },
    byIndex: function (store, index, key) { return run(store, "readonly", function (s) { return s.index(index).getAll(key); }); },
  };
}
function localBackend() {
  /* Every store is there, even in data saved before one was added. */
  var read = function () {
    var d = storage(function (s) { return JSON.parse(s.getItem(FALLBACK_KEY) || "null"); }) || { seq: 0 };
    STORES.forEach(function (name) { if (!d[name] || typeof d[name] !== "object") d[name] = {}; });
    return d;
  };
  var write = function (data) {
    var ok = storage(function (s) { s.setItem(FALLBACK_KEY, JSON.stringify(data)); return true; });
    return ok ? Promise.resolve() : Promise.reject(new Error("This browser is out of room."));
  };
  var keyOf = function (store, value) { return store === "versions" ? value.key : value.id; };
  return {
    kind: "localstorage",
    get: function (store, key) { var d = read(); return Promise.resolve(d[store][key]); },
    all: function (store) { var d = read(); return Promise.resolve(Object.keys(d[store]).map(function (k) { return d[store][k]; })); },
    put: function (store, value) {
      var d = read();
      var v = JSON.parse(JSON.stringify(value));
      if (store === "versions" && v.key === undefined) v.key = ++d.seq;
      d[store][keyOf(store, v)] = v;
      return write(d).then(function () { return keyOf(store, v); });
    },
    del: function (store, key) { var d = read(); delete d[store][key]; return write(d); },
    byIndex: function (store, index, key) { var d = read(); return Promise.resolve(Object.keys(d[store]).map(function (k) { return d[store][k]; }).filter(function (v) { return v[index] === key; })); },
  };
}

/* ------------------------------------------------------------ the store */

function openStore() {
  return idb().then(function (db) {
    var b = db ? idbBackend(db) : localBackend();
    var store = makeStore(b);
    return store.migrate().then(function () { return store; });
  });
}

function makeStore(b) {
  var now = function () { return Date.now(); };
  var count = function (doc) { return doc && Array.isArray(doc.frames) ? doc.frames.length : 0; };
  var lastVersionAt = {};

  var api = {
    kind: b.kind,
    listProjects: function () {
      return b.all("projects").then(function (list) { return (list || []).sort(function (x, y) { return y.updatedAt - x.updatedAt; }); });
    },
    getProject: function (id) { return b.get("projects", id); },
    loadDoc: function (id, page) {
      return b.get("docs", docKey(id, page)).then(function (rec) { return rec ? clean(rec.doc) : null; });
    },
    /* A new project, opened next; its first version is where it started.
       extra may carry its settings: the canvas colour behind its frames
       (stage) and its Configure theme. */
    createProject: function (name, doc, extra) {
      var meta = Object.assign({ id: "p" + uid(), name: (name || "Untitled").slice(0, 80), createdAt: now(), updatedAt: now(), frames: count(doc), thumb: null,
        pages: [{ id: MAIN, name: "Page 1" }], page: MAIN, pageFrames: { main: count(doc) } }, settingsOf(extra));
      if (extra && typeof extra.group === "string" && extra.group) meta.group = extra.group;
      else if (extra && extra.lib === "shared") meta.lib = "shared";
      return b.put("projects", meta)
        .then(function () { return b.put("docs", { id: meta.id, doc: doc }); })
        .then(function () { return meta; });
    },
    /* The document, and the project's edited time and frame count. Every so
       often the save is also kept as a version. */
    saveDoc: function (id, doc, page) {
      page = page || MAIN;
      return b.get("projects", id).then(function (meta) {
        if (!meta) throw new Error("That project is gone.");
        meta.updatedAt = now();
        tally(meta, page, count(doc));
        var key = docKey(id, page);
        return b.put("docs", { id: key, doc: doc }).then(function () { return b.put("projects", meta); }).then(function () {
          var last = lastVersionAt[key] || meta.createdAt;
          if (now() - last >= VERSION_EVERY) return api.addVersion(id, doc, "Autosave", page);
        }).then(function () { return meta; });
      });
    },
    /* Pages. Each returns the project as it is after. */
    addPage: function (id, name, doc, after, folder) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var pages = pagesOf(meta).slice();
        var page = { id: "pg" + uid(), name: (name || "Page " + (pages.length + 1)).slice(0, 60) };
        var at = pages.findIndex(function (p) { return p.id === after; });
        /* A page added after one in a folder goes in the folder too. */
        var fold = folder !== undefined ? folder : at >= 0 ? pages[at].folder : null;
        if (fold && foldersOf(meta).some(function (f) { return f.id === fold; })) page.folder = fold;
        pages.splice(at >= 0 ? at + 1 : pages.length, 0, page);
        meta.pages = pages;
        tally(meta, page.id, count(doc));
        return b.put("docs", { id: docKey(id, page.id), doc: doc }).then(function () { return b.put("projects", meta); })
          .then(function () { return { meta: meta, page: page }; });
      });
    },
    renamePage: function (id, pageId, name) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var named = String(name || "").trim().slice(0, 60);
        meta.pages = pagesOf(meta).map(function (p) { return p.id === pageId && named ? Object.assign({}, p, { name: named }) : p; });
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    movePage: function (id, pageId, by) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var pages = pagesOf(meta).slice();
        var at = pages.findIndex(function (p) { return p.id === pageId; }), to = at + by;
        if (at < 0 || to < 0 || to >= pages.length) return meta;
        pages.splice(to, 0, pages.splice(at, 1)[0]);
        meta.pages = pages;
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    duplicatePage: function (id, pageId) {
      return Promise.all([b.get("projects", id), api.loadDoc(id, pageId)]).then(function (got) {
        var from = pagesOf(got[0]).filter(function (p) { return p.id === pageId; })[0];
        if (!got[0] || !from || !got[1]) return null;
        return api.addPage(id, from.name + " copy", got[1], pageId);
      });
    },
    /* A page put at a place in the list, in a folder or out of one. index
       counts the list without the page itself. */
    placePage: function (id, pageId, index, folderId) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var pages = pagesOf(meta).slice();
        var at = pages.findIndex(function (p) { return p.id === pageId; });
        if (at < 0) return meta;
        var page = Object.assign({}, pages.splice(at, 1)[0]);
        if (folderId && foldersOf(meta).some(function (f) { return f.id === folderId; })) page.folder = folderId; else delete page.folder;
        var to = Math.max(0, Math.min(pages.length, Math.round(Number(index)) || 0));
        pages.splice(to, 0, page);
        meta.pages = pages;
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    addFolder: function (id, name) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var folders = foldersOf(meta).slice();
        var folder = { id: "fd" + uid(), name: String(name || "Folder " + (folders.length + 1)).trim().slice(0, 60) || "Folder" };
        folders.push(folder);
        meta.folders = folders;
        return b.put("projects", meta).then(function () { return { meta: meta, folder: folder }; });
      });
    },
    renameFolder: function (id, folderId, name) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var named = String(name || "").trim().slice(0, 60);
        meta.folders = foldersOf(meta).map(function (f) { return f.id === folderId && named ? Object.assign({}, f, { name: named }) : f; });
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* Open or closed; closed hides its pages in the list. */
    foldFolder: function (id, folderId, open) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        meta.folders = foldersOf(meta).map(function (f) { if (f.id !== folderId) return f; var n = Object.assign({}, f); if (open) delete n.open; else n.open = false; return n; });
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* A folder and the pages in it move as one past the loose page or
       folder beside them. */
    moveFolder: function (id, folderId, by) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var items = itemsOf(pagesOf(meta));
        var at = items.findIndex(function (it) { return it.folder === folderId; }), to = at + by;
        if (at < 0 || to < 0 || to >= items.length) return meta;
        items.splice(to, 0, items.splice(at, 1)[0]);
        meta.pages = [].concat.apply([], items.map(function (it) { return it.pages; }));
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* The pages stay, loose, where they were. */
    deleteFolder: function (id, folderId) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        meta.folders = foldersOf(meta).filter(function (f) { return f.id !== folderId; });
        meta.pages = pagesOf(meta).map(function (p) { if (p.folder !== folderId) return p; var n = Object.assign({}, p); delete n.folder; return n; });
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* The whole list of folders, as a copy or a file gives it. */
    setFolders: function (id, folders) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var ok = (Array.isArray(folders) ? folders : []).map(cleanFolder).filter(Boolean).slice(0, 50);
        meta.folders = ok;
        meta.pages = pagesOf(meta).map(function (p) { if (!p.folder || ok.some(function (f) { return f.id === p.folder; })) return p; var n = Object.assign({}, p); delete n.folder; return n; });
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* A project keeps at least one page. */
    deletePage: function (id, pageId) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        var pages = pagesOf(meta);
        if (pages.length < 2 || !pages.some(function (p) { return p.id === pageId; })) return meta;
        meta.pages = pages.filter(function (p) { return p.id !== pageId; });
        if (meta.pageFrames) delete meta.pageFrames[pageId];
        meta.frames = sum(meta);
        if (meta.page === pageId) meta.page = meta.pages[0].id;
        return api.listVersions(id, pageId).then(function (vs) {
          return Promise.all(vs.map(function (v) { return b.del("versions", v.key); }));
        }).then(function () { return b.del("docs", docKey(id, pageId)); }).then(function () { return b.put("projects", meta); }).then(function () { return meta; });
      });
    },
    /* The page last open, which the project opens on next time. */
    setPage: function (id, pageId) {
      return b.get("projects", id).then(function (meta) {
        if (!meta || meta.page === pageId) return meta;
        meta.page = pageId;
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    renameProject: function (id, name) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        meta.name = String(name || "").trim().slice(0, 80) || meta.name;
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* The picture on a project's card. One the person chose (byUser) stays
       until they choose again or go back to automatic (thumb null); until
       then, automatic pictures leave it alone. */
    setThumb: function (id, thumb, byUser) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        if (meta.thumbSet && !byUser && thumb) return meta;
        meta.thumb = thumb;
        meta.thumbSet = !!(byUser && thumb);
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* A project's own settings: its canvas colour and its theme. */
    setSettings: function (id, patch) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) return null;
        Object.assign(meta, settingsOf(patch));
        return b.put("projects", meta).then(function () { return meta; });
      });
    },
    /* Every page comes along, in order, with its name. */
    duplicateProject: function (id) {
      return b.get("projects", id).then(function (src) {
        if (!src) return null;
        var pages = pagesOf(src);
        return Promise.all(pages.map(function (p) { return api.loadDoc(id, p.id); })).then(function (docs) {
          if (!docs[0]) return null;
          return api.createProject(src.name + " copy", docs[0], src).then(function (meta) {
            return api.renamePage(meta.id, MAIN, pages[0].name);
          }).then(function (meta) {
            var steps = api.setFolders(meta.id, foldersOf(src)).then(function () { return pages[0].folder ? api.placePage(meta.id, MAIN, 0, pages[0].folder) : meta; });
            pages.slice(1).forEach(function (p, i) { steps = steps.then(function () { return api.addPage(meta.id, p.name, docs[i + 1] || emptyDoc(), undefined, p.folder || null); }); });
            steps = steps.then(function () { return api.mergeLibrary(libScopeOf(src), libScopeOf(meta)); });
            return steps.then(function () { return src.thumb ? api.setThumb(meta.id, src.thumb, src.thumbSet) : b.get("projects", meta.id); });
          });
        });
      });
    },
    deleteProject: function (id) {
      return b.get("projects", id).then(function (meta) {
        return api.listVersions(id).then(function (vs) {
          return Promise.all(vs.map(function (v) { return b.del("versions", v.key); }));
        }).then(function () {
          return Promise.all(pagesOf(meta).map(function (p) { return b.del("docs", docKey(id, p.id)); }));
        }).then(function () { return meta && !meta.group ? api.dropLibrary(libScopeOf(meta)) : null; }).then(function () { return b.del("projects", id); });
      });
    },
    /* Versions: newest first, at most VERSIONS_MAX a page. Without a page,
       listVersions gives every page's. */
    addVersion: function (id, doc, label, page) {
      page = page || MAIN;
      lastVersionAt[docKey(id, page)] = now();
      return b.put("versions", { project: id, page: page, at: now(), label: label || "Saved", frames: count(doc), doc: doc }).then(function () {
        return api.listVersions(id, page);
      }).then(function (vs) {
        return Promise.all(vs.slice(VERSIONS_MAX).map(function (v) { return b.del("versions", v.key); }));
      });
    },
    listVersions: function (id, page) {
      return b.byIndex("versions", "project", id).then(function (vs) {
        return (vs || []).filter(function (v) { return !page || (v.page || MAIN) === page; }).sort(function (x, y) { return y.at - x.at || y.key - x.key; });
      });
    },
    loadVersion: function (key) {
      return b.get("versions", key).then(function (v) { return v ? clean(v.doc) : null; });
    },
    /* A Content library, by scope (libScopeOf): a project's, a loose
       file's, or the one shared by files made before they were kept apart.
       Without IndexedDB they stay in localStorage, one entry each. */
    loadLibrary: function (scope) {
      scope = scope || "shared";
      if (b.kind !== "indexeddb") return Promise.resolve(storage(function (s) { return JSON.parse(s.getItem(LIB_KEY + ":" + scope) || "null"); }));
      return b.get("library", "lib:" + scope).then(function (rec) { return rec ? rec.value : null; });
    },
    saveLibrary: function (value, scope) {
      scope = scope || "shared";
      if (b.kind !== "indexeddb") {
        var ok = storage(function (s) { s.setItem(LIB_KEY + ":" + scope, JSON.stringify(value)); return true; });
        return ok ? Promise.resolve() : Promise.reject(new Error("This browser is out of room."));
      }
      return b.put("library", { id: "lib:" + scope, value: value });
    },
    dropLibrary: function (scope) {
      if (!scope || scope === "shared") return Promise.resolve();
      if (b.kind !== "indexeddb") { storage(function (s) { s.removeItem(LIB_KEY + ":" + scope); }); return Promise.resolve(); }
      return b.del("library", "lib:" + scope);
    },
    /* What one library holds, added to another (when a file moves). */
    mergeLibrary: function (from, to) {
      if (!from || !to || from === to) return Promise.resolve();
      return Promise.all([api.loadLibrary(from), api.loadLibrary(to)]).then(function (got) {
        if (!got[0]) return null;
        return api.saveLibrary(mergeLibs(got[1], got[0]), to);
      });
    },
    /* Projects: groups of files. A file names its group; the group holds a
       name, its times and a picture of its own if one was chosen. */
    listGroups: function () {
      return b.all("groups").then(function (list) { return (list || []).sort(function (x, y) { return y.updatedAt - x.updatedAt; }); });
    },
    getGroup: function (id) { return b.get("groups", id); },
    createGroup: function (name) {
      var g = { id: "g" + uid(), name: String(name || "").trim().slice(0, 80) || "Untitled project", createdAt: now(), updatedAt: now(), thumb: null };
      return b.put("groups", g).then(function () { return g; });
    },
    renameGroup: function (id, name) {
      return b.get("groups", id).then(function (g) {
        if (!g) return null;
        g.name = String(name || "").trim().slice(0, 80) || g.name;
        g.updatedAt = now();
        return b.put("groups", g).then(function () { return g; });
      });
    },
    /* A picture of the person's own for the project's card; null goes back
       to the files' own pictures. */
    setGroupThumb: function (id, thumb) {
      return b.get("groups", id).then(function (g) {
        if (!g) return null;
        g.thumb = thumb || null;
        return b.put("groups", g).then(function () { return g; });
      });
    },
    /* A file into a project, or (group null) out onto Home. */
    moveFile: function (id, group) {
      return Promise.all([b.get("projects", id), group ? b.get("groups", group) : Promise.resolve(null)]).then(function (got) {
        var meta = got[0];
        if (!meta || (group && !got[1])) return null;
        var from = libScopeOf(meta);
        if (group) meta.group = group; else delete meta.group;
        /* Its content comes with it, into the library it uses now. */
        var steps = api.mergeLibrary(from, libScopeOf(meta)).then(function () { return b.put("projects", meta); });
        if (got[1]) { got[1].updatedAt = now(); steps = steps.then(function () { return b.put("groups", got[1]); }); }
        return steps.then(function () { return meta; });
      });
    },
    filesIn: function (group) {
      return api.listProjects().then(function (list) { return list.filter(function (p) { return p.group === group; }); });
    },
    /* With its files, or (keepFiles) leaving them loose on Home. */
    deleteGroup: function (id, keepFiles) {
      return api.filesIn(id).then(function (files) {
        return files.reduce(function (steps, f) {
          return steps.then(function () { return keepFiles ? api.moveFile(f.id, null) : api.deleteProject(f.id); });
        }, Promise.resolve());
      }).then(function () { return api.dropLibrary("g:" + id); }).then(function () { return b.del("groups", id); });
    },
    /* A new project with a copy of every file in it. */
    duplicateGroup: function (id) {
      return Promise.all([b.get("groups", id), api.filesIn(id)]).then(function (got) {
        if (!got[0]) return null;
        return api.createGroup(got[0].name + " copy").then(function (g) {
          var steps = (got[0].thumb ? api.setGroupThumb(g.id, got[0].thumb) : Promise.resolve()).then(function () { return api.mergeLibrary("g:" + id, "g:" + g.id); });
          got[1].slice().reverse().forEach(function (f) {
            steps = steps.then(function () { return api.duplicateProject(f.id); }).then(function (copy) {
              if (!copy) return null;
              return api.renameProject(copy.id, f.name).then(function () { return api.moveFile(copy.id, g.id); });
            });
          });
          return steps.then(function () { return b.get("groups", g.id); });
        });
      });
    },
    lastOpened: function () { return storage(function (s) { return s.getItem(LAST_KEY); }); },
    setLastOpened: function (id) { storage(function (s) { s.setItem(LAST_KEY, id); }); },

    /* Work saved before projects: the layout and its backup become a
       project (with the backup as a version), and the Content library moves
       across. The old entries are removed once they're safely copied. */
    migrate: function () {
      var raw = storage(function (s) { return s.getItem(STORE_KEY); });
      var backup = storage(function (s) { return s.getItem(BACKUP_KEY); });
      var lib = storage(function (s) { return s.getItem(LIB_KEY); });
      var steps = Promise.resolve();
      if (raw) {
        steps = steps.then(function () {
          var doc;
          try { doc = clean(JSON.parse(raw)); } catch (err) { return null; }
          var name = doc.frames.length === 1 ? doc.frames[0].name : "My layout";
          return api.createProject(name, doc).then(function (meta) {
            var more = Promise.resolve();
            if (backup) {
              try { more = api.addVersion(meta.id, clean(JSON.parse(backup)), "Before projects"); } catch (err) { more = Promise.resolve(); }
            }
            return more.then(function () { api.setLastOpened(meta.id); });
          });
        }).then(function () {
          storage(function (s) { s.removeItem(STORE_KEY); s.removeItem(BACKUP_KEY); });
        });
      }
      /* Once: the files made before libraries were kept apart go on using
         the one library they shared (lib "shared"), which takes whatever
         that library held, from IndexedDB or from localStorage. */
      if (!storage(function (s) { return s.getItem(LIBS_DONE_KEY); })) {
        steps = steps.then(function () { return api.listProjects(); }).then(function (files) {
          return files.filter(function (f) { return !f.group && !f.lib; }).reduce(function (all, f) {
            return all.then(function () { f.lib = "shared"; return b.put("projects", f); });
          }, Promise.resolve());
        }).then(function () {
          if (b.kind === "indexeddb") return b.get("library", "library").then(function (rec) { return rec ? rec.value : null; });
          return null;
        }).then(function (old) {
          var local = null;
          try { local = lib ? JSON.parse(lib) : null; } catch (err) { local = null; }
          if (!old && !local) return null;
          return api.loadLibrary("shared").then(function (have) { return api.saveLibrary(mergeLibs(mergeLibs(have, old), local), "shared"); })
            .then(function () { return b.kind === "indexeddb" && old ? b.del("library", "library") : null; })
            .then(function () { if (local) storage(function (s) { s.removeItem(LIB_KEY); }); });
        }).then(function () { storage(function (s) { s.setItem(LIBS_DONE_KEY, "1"); }); });
      }
      return steps.catch(function () { /* the old entries stay; nothing is lost */ });
    },
  };
  return api;
}

/* Each page's frame count, and the project's across them all. A project
   saved before pages counts its one page. */
function tally(meta, page, n) {
  if (!meta.pageFrames) meta.pageFrames = { main: meta.frames || 0 };
  meta.pageFrames[page] = n;
  meta.frames = sum(meta);
}
function sum(meta) {
  var by = meta.pageFrames || {};
  return pagesOf(meta).reduce(function (t, p) { return t + (by[p.id] || 0); }, 0) || (meta.pageFrames ? 0 : meta.frames || 0);
}

/* The settings a project keeps, from anything that might carry them: a
   canvas colour as #rrggbb (or "" for the builder's own), and a theme as the
   Configure panel gives it. Anything else is left behind. */
function settingsOf(src) {
  var out = {};
  if (!src || typeof src !== "object") return out;
  if (typeof src.stage === "string" && (src.stage === "" || /^#[0-9a-f]{6}$/i.test(src.stage))) out.stage = src.stage.toLowerCase();
  if (src.theme && typeof src.theme === "object") {
    var t = src.theme;
    out.theme = {
      config: t.config && typeof t.config === "object" ? t.config : {},
      brand: t.brand && typeof t.brand === "object" ? t.brand : {},
      media: t.media && typeof t.media === "object" ? t.media : {},
      context: typeof t.context === "string" ? t.context : "",
    };
  }
  return out;
}

/* "5 minutes ago", for a project's edited time. */
function ago(t) {
  var s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "Just now";
  var m = Math.round(s / 60);
  if (m < 60) return m + (m === 1 ? " minute ago" : " minutes ago");
  var h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  var d = Math.round(h / 24);
  if (d < 14) return d + (d === 1 ? " day ago" : " days ago");
  return new Date(t).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export { libScopeOf, mergeLibs, openStore, makeStore, localBackend, ago, settingsOf, pagesOf, pageOf, foldersOf, itemsOf, MAIN, VERSIONS_MAX, VERSION_EVERY };
