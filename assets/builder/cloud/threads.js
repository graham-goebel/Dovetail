/* Conversations with the assistant in the cloud (supabase/assistant.sql,
   public.assistant_threads). The database decides who sees what: a
   conversation is its starter's until they share it, and then everyone on
   the file reads it and can carry it on; only its starter shares,
   unshares or deletes it. A save names the rev it was made from, so a save
   from an older copy (someone else carried it on meanwhile) changes
   nothing and says so. Pictures are left out (model/threads.js forCloud).

   sb is a Supabase client (cloud/client.js getClient); the functions take
   it so they can be tried against a stand-in. */

import { forCloud } from "../model/threads.js";

var COLUMNS = "id, file_id, created_by, title, shared, rev, updated_by, created_at, updated_at";

function check(res) {
  if (res && res.error) throw new Error(res.error.message || "The cloud refused that.");
  return res ? res.data : null;
}

/* The file's conversations this person may see, newest first, without
   their bodies. */
function listThreads(sb, fileId) {
  return sb.from("assistant_threads").select(COLUMNS).eq("file_id", fileId).order("updated_at", { ascending: false }).then(check);
}

function loadThread(sb, id) {
  return sb.from("assistant_threads").select(COLUMNS + ", body").eq("id", id).maybeSingle().then(check);
}

/* A new conversation on a file, started by whoever is signed in. */
function startThread(sb, fileId, title, value) {
  return sb.from("assistant_threads").insert({ file_id: fileId, title: title, body: forCloud(value) }).select(COLUMNS).single().then(check);
}

/* A save made from rev; resolves the row as saved, or rejects with
   stale: true when someone saved it first. */
function saveThread(sb, id, rev, title, value) {
  return sb.from("assistant_threads").update({ title: title, body: forCloud(value) }).eq("id", id).eq("rev", rev).select(COLUMNS).then(check).then(function (rows) {
    if (rows && rows.length) return rows[0];
    var err = new Error("Someone carried this conversation on meanwhile. Open it again to see what they added.");
    err.stale = true;
    throw err;
  });
}

/* Shared with everyone on the file, or back to its starter alone. */
function shareThread(sb, id, on) {
  return sb.from("assistant_threads").update({ shared: !!on }).eq("id", id).select(COLUMNS).single().then(check);
}

function removeThread(sb, id) {
  return sb.from("assistant_threads").delete().eq("id", id).then(check);
}

export { listThreads, loadThread, removeThread, saveThread, shareThread, startThread };
