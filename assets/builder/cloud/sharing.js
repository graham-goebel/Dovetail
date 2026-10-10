/* Sharing a file: who's on it and who's invited, in supabase/schema.sql's
   public.project_members and public.project_invites. The database decides
   who may do what: members see each other and invite; the owner removes
   people; anyone leaves; an invite turns into membership when its address
   signs in, confirmed (accept_invites). Nothing here knows about the local
   store or React.

   sb is a Supabase client (cloud/client.js getClient); every function
   takes it so it can be tried against a stand-in. cloudId is the file's
   projects row id (meta.cloud). */

var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function check(res) {
  if (res && res.error) throw new Error(friendly(res.error));
  return res ? res.data : null;
}
function friendly(err) {
  var m = String((err && err.message) || "");
  if (/duplicate key|already exists/i.test(m)) return "They're already invited.";
  if (/row-level security|permission denied/i.test(m)) return "Only the file's owner can do that.";
  return m || "The cloud refused that.";
}

/* The people on a file and the invites waiting, each newest last. */
function listPeople(sb, cloudId) {
  return Promise.all([
    sb.from("project_members").select("user_id, role, email, added_at").eq("project_id", cloudId).order("added_at", { ascending: true }).then(check),
    sb.from("project_invites").select("email, created_at").eq("project_id", cloudId).order("created_at", { ascending: true }).then(check),
  ]).then(function (got) { return { members: got[0] || [], invites: got[1] || [] }; });
}

/* An invite by email. Resolves the row; rejects in words when the address
   isn't one, is already on the file, or is already invited. */
function invite(sb, cloudId, email, members) {
  var addr = String(email || "").trim().toLowerCase();
  if (!EMAIL.test(addr)) return Promise.reject(new Error("That isn't an email address."));
  if ((members || []).some(function (m) { return String(m.email || "").toLowerCase() === addr; })) return Promise.reject(new Error("They're already on this file."));
  return sb.from("project_invites").insert({ project_id: cloudId, email: addr }).select("email, created_at").single().then(check);
}

function withdraw(sb, cloudId, email) {
  return sb.from("project_invites").delete().eq("project_id", cloudId).eq("email", String(email || "").trim().toLowerCase()).then(check);
}

/* Takes someone off the file (the owner's call), or, with your own id,
   leaves it. */
function removeMember(sb, cloudId, userId) {
  return sb.from("project_members").delete().eq("project_id", cloudId).eq("user_id", userId).then(check);
}

export { EMAIL, invite, listPeople, removeMember, withdraw };
