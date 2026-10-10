/* Conversations shared in a file: the glue between the panel's list (kept
   in this browser, model/store.js) and the cloud's copies (cloud/threads.js).
   A conversation is its starter's until they share it; shared, it has a row
   in assistant_threads that everyone on the file reads and carries on. The
   list line remembers the row (cloud) and the save it was made from (rev).

   sb is a Supabase client (cloud/client.js getClient); the functions take
   it so they can be tried against a stand-in. */

import { listThreads, loadThread, saveThread, shareThread, startThread } from "./threads.js";

/* Lines for the shared conversations others started on a file, newest
   first; members names them ({ user_id, email }). */
function pullShared(sb, fileCloudId, members, myId) {
  var names = {};
  (members || []).forEach(function (m) { if (m && m.user_id) names[m.user_id] = m.email; });
  return listThreads(sb, fileCloudId).then(function (rows) {
    return (rows || []).filter(function (r) { return r.shared && r.created_by !== myId; }).map(function (r) { return lineOf(r, names); });
  });
}

function lineOf(r, names) {
  return { id: "c:" + r.id, cloud: r.id, rev: r.rev, title: r.title || "Conversation", updated: Date.parse(r.updated_at) || Date.now(),
    by: { id: r.created_by, name: (names || {})[r.created_by] || "Someone on this file" }, shared: true, remote: true, said: "", changes: 0 };
}

/* Shares a conversation with everyone on the file, making its row first
   when it has none. Resolves what its line learns: { cloud, rev, shared }. */
function shareOn(sb, fileCloudId, line, title, value) {
  var made = line.cloud ? Promise.resolve({ id: line.cloud, rev: line.rev }) : startThread(sb, fileCloudId, title, value);
  return made.then(function (row) {
    return shareThread(sb, row.id, true).then(function (r) { return { cloud: r.id, rev: r.rev, shared: true }; });
  });
}

/* Back to its starter alone. */
function shareOff(sb, line) {
  if (!line.cloud) return Promise.resolve({ shared: false });
  return shareThread(sb, line.cloud, false).then(function (r) { return { cloud: r.id, rev: r.rev, shared: false }; });
}

/* A save of a shared conversation, from the rev its line knows. Resolves
   { rev }; rejects with stale: true when someone saved first. */
function pushSave(sb, line, title, value) {
  return saveThread(sb, line.cloud, line.rev, title, value).then(function (r) { return { rev: r.rev }; });
}

/* The cloud's copy, to open or to take after a stale save:
   { thread, msgs, rev, title, shared, by }. */
function openShared(sb, cloudId, names) {
  return loadThread(sb, cloudId).then(function (r) {
    if (!r) return null;
    var body = r.body || {};
    return { thread: Array.isArray(body.thread) ? body.thread : [], msgs: Array.isArray(body.msgs) ? body.msgs : [], rev: r.rev, title: r.title, shared: !!r.shared,
      by: { id: r.created_by, name: (names || {})[r.created_by] || "Someone on this file" } };
  });
}

export { lineOf, openShared, pullShared, pushSave, shareOff, shareOn };
