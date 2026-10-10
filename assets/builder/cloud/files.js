/* Files in the cloud: the rows a file and its pages become in
   supabase/schema.sql (public.projects, public.pages) and a project group
   in public.file_groups, and the reads and writes on them. Nothing here
   knows about the local store or React: cloud/mirror.js drives it with a
   file's local record (meta) and its page documents.

   A page row counts its saves in version (schema.sql's touch_page), so a
   write names the version it was made from and changes nothing when
   someone saved first: the caller then takes the cloud's copy. The local
   record keeps the cloud id as meta.cloud and the versions it last saw as
   meta.cloudVersions.

   sb is a Supabase client (cloud/client.js getClient); every function
   takes it so it can be tried against a stand-in. */

/* The card picture rides in settings only while it's small; the column
   holds a megabyte, and a page document five. */
var THUMB_MAX = 250000;
var SETTINGS_MAX = 900000;
var DOC_MAX = 4900000;
var PROJECT_COLUMNS = "id, name, settings, group_id, owner, updated_at";

function check(res) {
  if (res && res.error) throw new Error(res.error.message || "The cloud refused that.");
  return res ? res.data : null;
}

/* What a file keeps beside its pages, as the cloud row's settings. */
function settingsFor(meta) {
  var s = {
    pages: meta.pages, folders: meta.folders, page: meta.page, pageFrames: meta.pageFrames, frames: meta.frames,
    stage: meta.stage, theme: meta.theme, lib: meta.lib, createdAt: meta.createdAt,
  };
  if (meta.thumb && meta.thumb.length <= THUMB_MAX) { s.thumb = meta.thumb; s.thumbSet = !!meta.thumbSet; }
  if (JSON.stringify(s).length > SETTINGS_MAX) { delete s.thumb; delete s.thumbSet; }
  return s;
}

/* The local record a cloud row becomes, less what the store gives it (its
   local id and times). localGroup is the group's local id, if any. */
function metaFromRow(row, localGroup) {
  var s = row.settings && typeof row.settings === "object" ? row.settings : {};
  var meta = { name: row.name, cloud: row.id, cloudOwner: row.owner };
  ["pages", "folders", "page", "pageFrames", "frames", "stage", "theme", "lib", "thumb", "thumbSet"].forEach(function (k) { if (s[k] !== undefined) meta[k] = s[k]; });
  if (typeof s.createdAt === "number") meta.createdAt = s.createdAt;
  if (localGroup) meta.group = localGroup;
  return meta;
}

function tooBig(doc) {
  return JSON.stringify(doc).length > DOC_MAX;
}

/* Everything this person can see: files, each page's version, and groups. */
function listCloud(sb) {
  return Promise.all([
    sb.from("projects").select(PROJECT_COLUMNS).order("updated_at", { ascending: false }).then(check),
    sb.from("pages").select("project_id, page_id, version, updated_at").then(check),
    sb.from("file_groups").select("id, name, owner, updated_at").then(check),
  ]).then(function (got) {
    return { projects: got[0] || [], pages: got[1] || [], groups: got[2] || [] };
  });
}

/* A new file in the cloud from a local one: its row, then its pages.
   docs is { pageId: doc }. Resolves { id, versions: { pageId: version } }. */
function createCloudFile(sb, meta, docs, groupCloud) {
  var big = Object.keys(docs).filter(function (p) { return tooBig(docs[p]); });
  if (big.length) return Promise.reject(new Error(meta.name + " has a page too large for the cloud; it stays in this browser."));
  return sb.from("projects").insert({ name: meta.name, settings: settingsFor(meta), group_id: groupCloud || null }).select("id").single().then(check).then(function (row) {
    var rows = Object.keys(docs).map(function (p) { return { project_id: row.id, page_id: p, doc: docs[p] }; });
    return sb.from("pages").insert(rows).select("page_id, version").then(check).then(function (made) {
      var versions = {};
      (made || []).forEach(function (r) { versions[r.page_id] = r.version; });
      return { id: row.id, versions: versions };
    });
  });
}

/* One page's document, as a save made from the version known here.
   Resolves { version } when it landed, or { stale: true, doc, version }
   with the cloud's copy when someone saved first (or the page is new to
   this browser). known is undefined for a page the cloud hasn't got. */
function pushPage(sb, cloudId, pageId, doc, known) {
  if (tooBig(doc)) return Promise.reject(new Error("This page is too large for the cloud; it's kept in this browser."));
  var current = function () {
    return fetchPage(sb, cloudId, pageId).then(function (row) {
      if (!row) return { gone: true };
      return { stale: true, doc: row.doc, version: row.version };
    });
  };
  if (known == null) {
    return sb.from("pages").insert({ project_id: cloudId, page_id: pageId, doc: doc }).select("version").then(function (res) {
      if (res && res.error) return current();
      var rows = res ? res.data : null;
      return { version: rows && rows[0] ? rows[0].version : 1 };
    });
  }
  return sb.from("pages").update({ doc: doc }).eq("project_id", cloudId).eq("page_id", pageId).eq("version", known).select("version").then(check).then(function (rows) {
    if (rows && rows.length) return { version: rows[0].version };
    return current();
  });
}

function fetchPage(sb, cloudId, pageId) {
  return sb.from("pages").select("doc, version, updated_at").eq("project_id", cloudId).eq("page_id", pageId).maybeSingle().then(check);
}

/* Every page of a file, with its document. */
function fetchPages(sb, cloudId) {
  return sb.from("pages").select("page_id, doc, version").eq("project_id", cloudId).then(check).then(function (rows) { return rows || []; });
}

/* The file's name, settings and group, after a change here. */
function pushMeta(sb, meta, groupCloud) {
  return sb.from("projects").update({ name: meta.name, settings: settingsFor(meta), group_id: groupCloud || null }).eq("id", meta.cloud).then(check);
}

function deletePage(sb, cloudId, pageId) {
  return sb.from("pages").delete().eq("project_id", cloudId).eq("page_id", pageId).then(check);
}

/* Its pages go with it (on delete cascade). Only the owner may. */
function deleteCloudFile(sb, cloudId) {
  return sb.from("projects").delete().eq("id", cloudId).then(check);
}

function createCloudGroup(sb, name) {
  return sb.from("file_groups").insert({ name: name }).select("id").single().then(check).then(function (row) { return row.id; });
}

function renameCloudGroup(sb, cloudId, name) {
  return sb.from("file_groups").update({ name: name }).eq("id", cloudId).then(check);
}

/* Its files are set loose (group_id on delete set null), not deleted. */
function deleteCloudGroup(sb, cloudId) {
  return sb.from("file_groups").delete().eq("id", cloudId).then(check);
}

export { DOC_MAX, THUMB_MAX, createCloudFile, createCloudGroup, deleteCloudFile, deleteCloudGroup, deletePage, fetchPage, fetchPages, listCloud, metaFromRow, pushMeta, pushPage, renameCloudGroup, settingsFor };
