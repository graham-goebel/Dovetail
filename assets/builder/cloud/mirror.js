/* The mirror: keeps a signed-in person's files in the cloud as well as in
   this browser. The local store (model/store.js) stays what the Builder
   reads and writes, so every file opens at once and offline; the mirror
   watches the store and sends each change on, and brings down what
   changed elsewhere.

   watchStore(store, hub) wraps the store so a save, a rename, a page or
   folder change, a move between projects or a delete tells the hub, with
   no change to the Builder's many calls. The hub does nothing until
   start() gives it a client (the person signed in); then:

   - sync() reconciles: local files the cloud lacks are uploaded, cloud
     files this browser lacks are downloaded, and a file both have is
     brought level page by page. The cloud wins a page both changed: the
     local copy is kept under Versions as "Before reloading from the
     cloud", then the cloud's copy replaces it.
   - a save is pushed a moment later with the version it was made from; a
     push that fails (offline) marks the page to push on the next sync,
     which also runs when the browser comes back online or the tab wakes.

   Groups (Home's projects) mirror to file_groups the same way. The
   Content library and the assistant's conversations stay local for now. */

import { createCloudFile, createCloudGroup, deleteCloudFile, deleteCloudGroup, deletePage, fetchPage, fetchPages, listCloud, metaFromRow, pushMeta, pushPage, renameCloudGroup } from "./files.js";
import { removeMember } from "./sharing.js";

var PUSH_DELAY = 800;
/* Store calls that change a file's record, not its pages. */
var META_CALLS = ["renameProject", "setThumb", "setSettings", "setPage", "renamePage", "movePage", "placePage", "addFolder", "renameFolder", "foldFolder", "moveFolder", "deleteFolder", "setFolders"];

function createMirrorHub() {
  var sb = null, store = null, hooks = {};
  var timers = {}, queue = Promise.resolve(), stopped = true;
  var state = { status: "off", at: null, pending: 0, error: "" };

  var say = function (patch) { Object.assign(state, patch); if (hooks.onState) hooks.onState(Object.assign({}, state)); };
  var later = function (fn) {
    var run = function () { return Promise.resolve().then(fn).catch(function (err) { say({ error: String((err && err.message) || err) }); }); };
    queue = queue.then(run, run);
    return queue;
  };
  var online = function () { return typeof navigator === "undefined" || navigator.onLine !== false; };
  var fail = function (err) { say({ status: online() ? "error" : "offline", error: String((err && err.message) || err) }); };

  /* The local group a cloud group id maps to, making one if need be. */
  var localGroupFor = function (cloudId, name) {
    if (!cloudId) return Promise.resolve(null);
    return store.listGroups().then(function (gs) {
      var hit = gs.filter(function (g) { return g.cloud === cloudId; })[0];
      if (hit) return hit.id;
      return store.createGroup(name || "Project").then(function (g) { return store.setGroupCloud(g.id, cloudId).then(function () { return g.id; }); });
    });
  };
  var cloudGroupFor = function (meta) {
    if (!meta.group) return Promise.resolve(null);
    return store.getGroup(meta.group).then(function (g) {
      if (!g) return null;
      if (g.cloud) return g.cloud;
      return createCloudGroup(sb, g.name).then(function (id) { return store.setGroupCloud(g.id, id).then(function () { return id; }); });
    });
  };
  var docsOf = function (meta) {
    var pages = (meta.pages && meta.pages.length ? meta.pages : [{ id: "main" }]);
    return Promise.all(pages.map(function (p) { return store.loadDoc(meta.id, p.id); })).then(function (docs) {
      var out = {};
      pages.forEach(function (p, i) { if (docs[i]) out[p.id] = docs[i]; });
      return out;
    });
  };

  /* The Builder holds a copy of the open file's record; it's told when the
     cloud fields on one change, so it can take the new record. */
  var changed = function (meta) { if (meta && hooks.onFileChanged) hooks.onFileChanged(meta.id, meta); return meta; };
  /* A whole local file, up. */
  var upload = function (meta) {
    return Promise.all([docsOf(meta), cloudGroupFor(meta)]).then(function (got) {
      return createCloudFile(sb, meta, got[0], got[1]);
    }).then(function (made) {
      return store.setCloud(meta.id, { cloud: made.id, cloudVersions: made.versions, cloudDirty: {}, cloudOwner: hooks.me || null });
    }).then(changed);
  };
  /* A whole cloud file, down, as a new local file. */
  var download = function (row, groups) {
    var g = groups.filter(function (x) { return x.id === row.group_id; })[0];
    return Promise.all([fetchPages(sb, row.id), localGroupFor(row.group_id, g && g.name)]).then(function (got) {
      var docs = {}, versions = {};
      got[0].forEach(function (p) { docs[p.page_id] = p.doc; versions[p.page_id] = p.version; });
      var meta = metaFromRow(row, got[1]);
      meta.cloudVersions = versions;
      return store.adopt(meta, docs);
    });
  };
  /* The cloud's copy of a page replaces the local one; what was here is
     kept as a version first, when it differs. */
  var takeCloud = function (meta, pageId, doc, version) {
    return store.loadDoc(meta.id, pageId).then(function (local) {
      var differs = local && JSON.stringify(local) !== JSON.stringify(doc);
      var keep = differs ? store.addVersion(meta.id, local, "Before reloading from the cloud", pageId) : Promise.resolve();
      return keep.then(function () { return store.saveDoc(meta.id, doc, pageId, { quiet: true }); }).then(function () {
        var versions = Object.assign({}, meta.cloudVersions || {}); versions[pageId] = version;
        var dirty = Object.assign({}, meta.cloudDirty || {}); delete dirty[pageId];
        return store.setCloud(meta.id, { cloudVersions: versions, cloudDirty: dirty });
      }).then(function (m) {
        if (differs && hooks.onPageReplaced) hooks.onPageReplaced(meta.id, pageId, doc, m);
        return m;
      });
    });
  };
  /* One page, up, from the version known here. */
  var push = function (pid, pageId) {
    return store.getProject(pid).then(function (meta) {
      if (!meta || !meta.cloud) return null;
      return store.loadDoc(pid, pageId).then(function (doc) {
        if (!doc) return null;
        var known = (meta.cloudVersions || {})[pageId];
        return pushPage(sb, meta.cloud, pageId, doc, known).then(function (res) {
          if (res.gone) return null;
          if (res.stale) return takeCloud(meta, pageId, res.doc, res.version);
          var versions = Object.assign({}, meta.cloudVersions || {}); versions[pageId] = res.version;
          var dirty = Object.assign({}, meta.cloudDirty || {}); delete dirty[pageId];
          return store.setCloud(pid, { cloudVersions: versions, cloudDirty: dirty });
        });
      });
    });
  };
  /* A file both have: each page level with the cloud. */
  var level = function (meta, row, pageRows) {
    var cloudV = {};
    pageRows.forEach(function (p) { if (p.project_id === row.id) cloudV[p.page_id] = p.version; });
    var known = meta.cloudVersions || {}, dirty = meta.cloudDirty || {};
    var steps = Promise.resolve();
    Object.keys(cloudV).forEach(function (pageId) {
      if (known[pageId] == null || cloudV[pageId] > known[pageId]) {
        steps = steps.then(function () { return fetchPage(sb, row.id, pageId); }).then(function (r) { return r ? takeCloud(meta, pageId, r.doc, r.version) : null; }).then(function (m) { if (m) meta = m; });
      } else if (dirty[pageId]) {
        steps = steps.then(function () { return push(meta.id, pageId); }).then(function (m) { if (m) meta = m; });
      }
    });
    /* Pages added here while away. */
    (meta.pages || []).forEach(function (p) {
      if (cloudV[p.id] == null) steps = steps.then(function () { return push(meta.id, p.id); }).then(function (m) { if (m) meta = m; });
    });
    /* The record itself, when it changed here (name, pages, folders). */
    if (dirty.meta) steps = steps.then(function () { return cloudGroupFor(meta); }).then(function (g) { return pushMeta(sb, meta, g); }).then(function () {
      var d = Object.assign({}, meta.cloudDirty || {}); delete d.meta;
      return store.setCloud(meta.id, { cloudDirty: d });
    });
    return steps;
  };

  var sync = function () {
    if (stopped || !sb) return Promise.resolve();
    return later(function () {
      say({ status: "syncing", error: "" });
      return Promise.all([store.listProjects(), listCloud(sb), store.listGroups()]).then(function (got) {
        var local = got[0], cloud = got[1], groups = got[2];
        /* The Playground the Builder makes for itself stays in this browser. */
        var builderMade = {};
        groups.forEach(function (g) { if (g.kind) builderMade[g.id] = true; });
        var byCloud = {};
        local.forEach(function (m) { if (m.cloud) byCloud[m.cloud] = m; });
        var steps = Promise.resolve();
        cloud.projects.forEach(function (row) {
          var meta = byCloud[row.id];
          steps = steps.then(function () { return meta ? level(meta, row, cloud.pages) : download(row, cloud.groups); });
        });
        local.forEach(function (m) {
          if (m.cloud && !cloud.projects.some(function (r) { return r.id === m.cloud; })) {
            /* Gone from the cloud (deleted elsewhere, or no longer shared): it stays here as its own file. */
            steps = steps.then(function () { return store.setCloud(m.id, { cloud: null, cloudVersions: {}, cloudDirty: {}, cloudOwner: null }); }).then(changed);
          } else if (!m.cloud && !(m.group && builderMade[m.group])) {
            steps = steps.then(function () { return upload(m); });
          }
        });
        return steps;
      }).then(function () {
        say({ status: "synced", at: Date.now(), error: "" });
        if (hooks.onFilesChanged) hooks.onFilesChanged();
      }, function (err) { fail(err); });
    });
  };

  var markDirty = function (pid, key) {
    return store.getProject(pid).then(function (meta) {
      if (!meta || !meta.cloud) return null;
      var d = Object.assign({}, meta.cloudDirty || {}); d[key] = true;
      return store.setCloud(pid, { cloudDirty: d });
    });
  };
  /* Sends waiting or under way, by key, so the Builder can say there are
     changes still to go up. A send that fails marks what it carried, so the
     next sync (back online, the tab waking) sends it again. */
  var waiting = {};
  var count = function () { say({ pending: Object.keys(waiting).length }); };
  var schedule = function (key, fn, dirty) {
    clearTimeout(timers[key]);
    if (!waiting[key]) { waiting[key] = true; count(); }
    timers[key] = setTimeout(function () {
      delete timers[key];
      later(function () {
        return fn().catch(function (err) {
          fail(err);
          return dirty ? dirty().catch(function () {}) : null;
        }).then(function () { if (!timers[key]) { delete waiting[key]; count(); } });
      });
    }, PUSH_DELAY);
  };

  var hub = {
    /* The local store, from watchStore. */
    attach: function (s) { store = s; },
    /* The person is in: client, who they are, and what to tell the Builder. */
    start: function (client, h) {
      sb = client; hooks = h || {}; stopped = false;
      say({ status: "syncing", error: "" });
      return sync();
    },
    stop: function () {
      stopped = true; sb = null; hooks = {};
      /* What was still to go is marked, to go on the next start. */
      Object.keys(timers).forEach(function (k) {
        clearTimeout(timers[k]);
        var m = /^(doc|meta):([^:]+)(?::(.+))?$/.exec(k);
        if (m && store) markDirty(m[2], m[1] === "doc" ? m[3] : "meta").catch(function () {});
      });
      timers = {}; waiting = {};
      say({ status: "off", error: "", pending: 0 });
    },
    sync: sync,
    state: function () { return Object.assign({}, state); },
    /* From the watched store. Stopped, each marks what's to go up later and
       resolves once that's written; started, each schedules the send. */
    saved: function (pid, pageId) {
      if (stopped) return markDirty(pid, pageId).catch(function () {});
      schedule("doc:" + pid + ":" + pageId, function () { return push(pid, pageId).then(function () { say({ status: "synced", at: Date.now(), error: "" }); }); },
        function () { return markDirty(pid, pageId); });
      return undefined;
    },
    metaChanged: function (pid) {
      if (stopped) return markDirty(pid, "meta").catch(function () {});
      schedule("meta:" + pid, function () {
        return store.getProject(pid).then(function (meta) {
          if (!meta || !meta.cloud) return null;
          return cloudGroupFor(meta).then(function (g) { return pushMeta(sb, meta, g); });
        });
      }, function () { return markDirty(pid, "meta"); });
      return undefined;
    },
    fileMade: function (pid) {
      if (stopped) return;
      schedule("new:" + pid, function () {
        return store.getProject(pid).then(function (meta) {
          if (!meta || meta.cloud) return null;
          var inBuilderMade = meta.group ? store.getGroup(meta.group).then(function (g) { return !!(g && g.kind); }) : Promise.resolve(false);
          return inBuilderMade.then(function (skip) { return skip ? null : upload(meta); });
        });
      });
    },
    pageRemoved: function (pid, pageId) {
      if (stopped) return markDirty(pid, "meta").catch(function () {});
      later(function () { return store.getProject(pid).then(function (meta) { return meta && meta.cloud ? deletePage(sb, meta.cloud, pageId) : null; }).catch(fail); });
      return hub.metaChanged(pid);
    },
    /* Deleting here deletes there, for a file of your own; one shared with
       you, you leave instead, and it stays for the others. */
    fileDeleted: function (meta) {
      if (stopped || !meta || !meta.cloud) return;
      var leave = meta.cloudOwner && hooks.me && meta.cloudOwner !== hooks.me;
      later(function () { return (leave ? removeMember(sb, meta.cloud, hooks.me) : deleteCloudFile(sb, meta.cloud)).catch(fail); });
    },
    groupChanged: function (gid) {
      if (stopped) return;
      schedule("group:" + gid, function () {
        return store.getGroup(gid).then(function (g) {
          if (!g) return null;
          if (g.cloud) return renameCloudGroup(sb, g.cloud, g.name);
          return createCloudGroup(sb, g.name).then(function (id) { return store.setGroupCloud(gid, id); });
        });
      });
    },
    groupDeleted: function (g) {
      if (stopped || !g || !g.cloud) return;
      later(function () { return deleteCloudGroup(sb, g.cloud).catch(fail); });
    },
  };
  return hub;
}

/* The store with the hub listening: the same calls, each telling the hub
   what changed once it's written. */
function watchStore(store, hub) {
  hub.attach(store);
  var w = Object.assign({}, store);
  /* The call's own result, once the hub has noted the change. */
  var told = function (note, out) { return Promise.resolve(note).then(function () { return out; }); };
  w.saveDoc = function (id, doc, page, opts) {
    return store.saveDoc(id, doc, page).then(function (meta) {
      return told(opts && opts.quiet ? null : hub.saved(id, page || "main"), meta);
    });
  };
  META_CALLS.forEach(function (name) {
    w[name] = function (id) {
      var args = arguments;
      return store[name].apply(store, args).then(function (out) { return told(hub.metaChanged(id), out); });
    };
  });
  w.addPage = function (id) { var a = arguments; return store.addPage.apply(store, a).then(function (meta) { var pg = meta && meta.pages && meta.pages[meta.pages.length - 1]; return told(Promise.all([hub.metaChanged(id), pg ? hub.saved(id, pg.id) : null]), meta); }); };
  w.duplicatePage = function (id) { var a = arguments; return store.duplicatePage.apply(store, a).then(function (out) { return told(Promise.all([hub.metaChanged(id)].concat((out && out.pages || []).map(function (p) { return hub.saved(id, p.id); }))), out); }); };
  w.deletePage = function (id, pageId) { return store.deletePage(id, pageId).then(function (out) { return told(hub.pageRemoved(id, pageId), out); }); };
  w.createProject = function () { var a = arguments; return store.createProject.apply(store, a).then(function (meta) { hub.fileMade(meta.id); return meta; }); };
  w.duplicateProject = function () { var a = arguments; return store.duplicateProject.apply(store, a).then(function (meta) { if (meta) hub.fileMade(meta.id); return meta; }); };
  /* Moved out of the Playground, a file goes up like a new one. */
  w.moveFile = function (id, group) { return store.moveFile(id, group).then(function (meta) { if (meta && !meta.cloud) hub.fileMade(id); return told(hub.metaChanged(id), meta); }); };
  w.deleteProject = function (id) { return store.getProject(id).then(function (meta) { return store.deleteProject(id).then(function (out) { hub.fileDeleted(meta); return out; }); }); };
  w.createGroup = function () { var a = arguments; return store.createGroup.apply(store, a).then(function (g) { if (!(g && g.kind)) hub.groupChanged(g.id); return g; }); };
  w.renameGroup = function (id) { var a = arguments; return store.renameGroup.apply(store, a).then(function (g) { hub.groupChanged(id); return g; }); };
  w.deleteGroup = function (id, keep) { return store.getGroup(id).then(function (g) { return store.deleteGroup(id, keep).then(function (out) { hub.groupDeleted(g); return out; }); }); };
  w.duplicateGroup = function (id) { return store.duplicateGroup(id).then(function (g) { if (g) { hub.groupChanged(g.id); } return g; }); };
  return w;
}

export { META_CALLS, createMirrorHub, watchStore };
