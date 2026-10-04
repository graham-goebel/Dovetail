/* Where projects live: IndexedDB, which holds far more than localStorage's
   few megabytes and stores documents as they are, without turning them into
   text. Each project is a name and a document (its frames), with versions
   kept beside it. The Content library lives here too. Where IndexedDB isn't
   available (some private windows), the same calls fall back to
   localStorage, with its limits.

   Every call returns a promise. Nothing here knows about React. */

import { BACKUP_KEY, LIB_KEY, STORE_KEY, storage } from "../config.js";
import { clean, uid } from "./tree.js";

var DB_NAME = "dovetail-builder";
var DB_VERSION = 1;
var STORES = ["projects", "docs", "versions", "library"];
/* How many versions a project keeps, and how far apart automatic ones are. */
var VERSIONS_MAX = 30;
var VERSION_EVERY = 10 * 60 * 1000;
var LAST_KEY = "dovetail-builder-last";
var FALLBACK_KEY = "dovetail-builder-store";

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
  var read = function () { return storage(function (s) { return JSON.parse(s.getItem(FALLBACK_KEY) || "null"); }) || { projects: {}, docs: {}, versions: {}, library: {}, seq: 0 }; };
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
    loadDoc: function (id) {
      return b.get("docs", id).then(function (rec) { return rec ? clean(rec.doc) : null; });
    },
    /* A new project, opened next; its first version is where it started.
       extra may carry its settings: the canvas colour behind its frames
       (stage) and its Configure theme. */
    createProject: function (name, doc, extra) {
      var meta = Object.assign({ id: "p" + uid(), name: (name || "Untitled").slice(0, 80), createdAt: now(), updatedAt: now(), frames: count(doc), thumb: null }, settingsOf(extra));
      return b.put("projects", meta)
        .then(function () { return b.put("docs", { id: meta.id, doc: doc }); })
        .then(function () { return meta; });
    },
    /* The document, and the project's edited time and frame count. Every so
       often the save is also kept as a version. */
    saveDoc: function (id, doc) {
      return b.get("projects", id).then(function (meta) {
        if (!meta) throw new Error("That project is gone.");
        meta.updatedAt = now();
        meta.frames = count(doc);
        return b.put("docs", { id: id, doc: doc }).then(function () { return b.put("projects", meta); }).then(function () {
          var last = lastVersionAt[id] || meta.createdAt;
          if (now() - last >= VERSION_EVERY) return api.addVersion(id, doc, "Autosave");
        }).then(function () { return meta; });
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
    duplicateProject: function (id) {
      return Promise.all([b.get("projects", id), api.loadDoc(id)]).then(function (got) {
        if (!got[0] || !got[1]) return null;
        return api.createProject(got[0].name + " copy", got[1], got[0]).then(function (meta) {
          return got[0].thumb ? api.setThumb(meta.id, got[0].thumb, got[0].thumbSet) : meta;
        });
      });
    },
    deleteProject: function (id) {
      return api.listVersions(id).then(function (vs) {
        return Promise.all(vs.map(function (v) { return b.del("versions", v.key); }));
      }).then(function () { return b.del("docs", id); }).then(function () { return b.del("projects", id); });
    },
    /* Versions: newest first, at most VERSIONS_MAX a project. */
    addVersion: function (id, doc, label) {
      lastVersionAt[id] = now();
      return b.put("versions", { project: id, at: now(), label: label || "Saved", frames: count(doc), doc: doc }).then(function () {
        return api.listVersions(id);
      }).then(function (vs) {
        return Promise.all(vs.slice(VERSIONS_MAX).map(function (v) { return b.del("versions", v.key); }));
      });
    },
    listVersions: function (id) {
      return b.byIndex("versions", "project", id).then(function (vs) {
        return (vs || []).sort(function (x, y) { return y.at - x.at || y.key - x.key; });
      });
    },
    loadVersion: function (key) {
      return b.get("versions", key).then(function (v) { return v ? clean(v.doc) : null; });
    },
    /* The Content library. Without IndexedDB it stays where it always was. */
    loadLibrary: function () {
      if (b.kind !== "indexeddb") return Promise.resolve(storage(function (s) { return JSON.parse(s.getItem(LIB_KEY) || "null"); }));
      return b.get("library", "library").then(function (rec) { return rec ? rec.value : null; });
    },
    saveLibrary: function (value) {
      if (b.kind !== "indexeddb") {
        var ok = storage(function (s) { s.setItem(LIB_KEY, JSON.stringify(value)); return true; });
        return ok ? Promise.resolve() : Promise.reject(new Error("This browser is out of room."));
      }
      return b.put("library", { id: "library", value: value });
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
      if (lib && b.kind === "indexeddb") {
        steps = steps.then(function () {
          var value;
          try { value = JSON.parse(lib); } catch (err) { return null; }
          return api.saveLibrary(value).then(function () { storage(function (s) { s.removeItem(LIB_KEY); }); });
        });
      }
      return steps.catch(function () { /* the old entries stay; nothing is lost */ });
    },
  };
  return api;
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

export { openStore, makeStore, localBackend, ago, settingsOf, VERSIONS_MAX, VERSION_EVERY };
