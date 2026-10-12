/* Sharing a file: who's on it and who's invited, in supabase/schema.sql's
   public.project_members and public.project_invites. Someone on a file is
   its owner, an editor or a viewer, who opens and reads it but changes
   nothing. The database decides who may do what: members see each other;
   the owner and editors invite; the owner removes people and sets their
   roles; anyone leaves; an invite turns into membership, with its role, when
   its address signs in, confirmed (accept_invites). Nothing here knows about
   the local store or React.

   sb is a Supabase client (cloud/client.js getClient); every function
   takes it so it can be tried against a stand-in. cloudId is the file's
   projects row id (meta.cloud). */

var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/* The roles someone can be given; the owner is whoever made the file. */
var ROLES = ["editor", "viewer"];

function check(res) {
  if (res && res.error) throw new Error(friendly(res.error));
  return res ? res.data : null;
}
function friendly(err) {
  var m = String((err && err.message) || "");
  if (/duplicate key|already exists/i.test(m)) return "They're already invited.";
  if (/row-level security|permission denied/i.test(m)) return "You can't do that on this file.";
  return m || "The cloud refused that.";
}

/* The people on a file and the invites waiting, each newest last. */
function listPeople(sb, cloudId) {
  return Promise.all([
    sb.from("project_members").select("user_id, role, email, added_at").eq("project_id", cloudId).order("added_at", { ascending: true }).then(check),
    sb.from("project_invites").select("email, role, created_at").eq("project_id", cloudId).order("created_at", { ascending: true }).then(check),
  ]).then(function (got) { return { members: got[0] || [], invites: got[1] || [] }; });
}

/* An invite by email, as an editor (the default) or a viewer. Resolves the
   row; rejects in words when the address isn't one, is already on the
   file, or is already invited. */
function invite(sb, cloudId, email, members, role) {
  var addr = String(email || "").trim().toLowerCase();
  if (!EMAIL.test(addr)) return Promise.reject(new Error("That isn't an email address."));
  if ((members || []).some(function (m) { return String(m.email || "").toLowerCase() === addr; })) return Promise.reject(new Error("They're already on this file."));
  var as = ROLES.indexOf(role) >= 0 ? role : "editor";
  return sb.from("project_invites").insert({ project_id: cloudId, email: addr, role: as }).select("email, role, created_at").single().then(check);
}

/* The owner makes someone an editor or a viewer. */
function setRole(sb, cloudId, userId, role) {
  if (ROLES.indexOf(role) < 0) return Promise.reject(new Error("That isn't a role."));
  return sb.from("project_members").update({ role: role }).eq("project_id", cloudId).eq("user_id", userId).select("user_id, role").then(check).then(function (rows) {
    if (!rows || !rows.length) throw new Error("Only the file's owner can change what someone can do.");
    return rows[0];
  });
}

/* The signed-in person's role on a file, or null when they aren't on it. */
function myRole(members, me) {
  var hit = (members || []).filter(function (m) { return m.user_id === me; })[0];
  return hit ? hit.role : null;
}

function withdraw(sb, cloudId, email) {
  return sb.from("project_invites").delete().eq("project_id", cloudId).eq("email", String(email || "").trim().toLowerCase()).then(check);
}

/* Takes someone off the file (the owner's call), or, with your own id,
   leaves it. */
function removeMember(sb, cloudId, userId) {
  return sb.from("project_members").delete().eq("project_id", cloudId).eq("user_id", userId).then(check);
}

export { EMAIL, ROLES, invite, listPeople, myRole, removeMember, setRole, withdraw };
