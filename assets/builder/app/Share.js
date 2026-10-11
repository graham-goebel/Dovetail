/* Share: who's on the open file, invite by email, withdraw an invite, take
   someone off (the owner) or leave (anyone else). Opened from the people
   in the top bar. The App holds the list and does the work
   (cloud/sharing.js); this draws it and asks. */

import { cx, e, useState } from "../config.js";
import { Icon } from "../ui/icons.js";
import { Avatar } from "./Bridge.js";
import { colorFor } from "./People.js";

/* { dialogRef, account, file, people: { members, invites, loading, error, busy },
     cloud (cloud/status.js's fileCloud), onInvite(email), onWithdraw(email),
     onRemove(userId), onLeave, onMoveOut, onSignIn, onAccount } */
function ShareDialog(p) {
  var emailSt = useState(""), email = emailSt[0], setEmail = emailSt[1];
  var me = p.account && p.account.status === "in" ? p.account.account : null;
  var file = p.file || {};
  var people = p.people || { members: [], invites: [] };
  var mine = me && file.cloudOwner === me.id;
  var owner = people.members.filter(function (m) { return m.role === "owner"; })[0];
  var close = function () { if (p.dialogRef.current) p.dialogRef.current.close(); };
  var submit = function (ev) {
    ev.preventDefault();
    var addr = email.trim();
    if (!addr) return;
    p.onInvite(addr, function () { setEmail(""); });
  };
  var body;
  if (!me) {
    body = e("p", { className: "bd-br-note" }, e(Icon, { name: "info" }), "Sign in first: sharing is tied to your account. ", e("button", { type: "button", className: "bd-link", onClick: p.onSignIn }, "Sign in"));
  } else if (!file.cloud) {
    /* Not up yet: why, and for the Playground, the way out. */
    var c = p.cloud || { detail: "This file is on its way to the cloud. Once it's there, you can share it." };
    body = e("div", { className: "bd-sh-local" },
      e("p", { className: "bd-br-note" }, e(Icon, { name: c.kind === "local" ? "info" : c.icon || "info" }), c.detail),
      c.kind === "local" ? e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: p.onMoveOut }, e(Icon, { name: "cloud" }), "Move out of the Playground") : null);
  } else {
    body = e(React.Fragment, null,
      e("ul", { className: "bd-br-agents", role: "list", "aria-label": "People on this file" },
        people.members.map(function (m) {
          var you = m.user_id === me.id;
          return e("li", { key: m.user_id, className: "bd-br-agent" },
            e(Avatar, { agent: { name: m.email || "?", color: colorFor(m.user_id) } }),
            e("div", { className: "bd-br-agent-t" }, e("b", null, m.email || "Someone", you ? e("span", { className: "bd-sh-you" }, " (you)") : null),
              e("span", null, m.role === "owner" ? "Owner" : "Can edit")),
            mine && !you ? e("button", { type: "button", className: "bd-btn bd-btn-sm", disabled: people.busy, onClick: function () { p.onRemove(m.user_id); } }, "Remove")
              : you && !mine ? e("button", { type: "button", className: "bd-btn bd-btn-sm", disabled: people.busy, onClick: p.onLeave }, "Leave") : null);
        }),
        people.invites.map(function (i) {
          return e("li", { key: "i:" + i.email, className: "bd-br-agent is-invited" },
            e("span", { className: "bd-av is-ghost", "aria-hidden": true }, e(Icon, { name: "user" })),
            e("div", { className: "bd-br-agent-t" }, e("b", null, i.email), e("span", null, "Invited; joins when they sign in with this address")),
            e("button", { type: "button", className: "bd-btn bd-btn-sm", disabled: people.busy, onClick: function () { p.onWithdraw(i.email); } }, "Withdraw"));
        }),
        people.loading && !people.members.length ? e("li", { className: "bd-br-agent" }, e("span", { className: "bd-av is-blank" }), e("div", { className: "bd-br-agent-t" }, e("span", null, "Loading…"))) : null),
      e("form", { className: "bd-sh-form", onSubmit: submit },
        e("label", { className: "bd-br-name bd-sh-name" }, e("span", null, "Invite by email"),
          e("input", { type: "email", className: "bd-input", required: true, value: email, placeholder: "name@example.com", disabled: people.busy, onChange: function (ev) { setEmail(ev.target.value); } })),
        e("button", { type: "submit", className: "bd-btn bd-btn-primary", disabled: people.busy || !email.trim() }, e(Icon, { name: "plus" }), "Invite")),
      e("p", { className: "bd-inspect-sub" }, "They'll find the file on their Home once they've signed in with that address. Everyone on a file can edit it" + (owner && owner.user_id !== me.id ? "; " + owner.email + " owns it." : ".")));
  }
  return e("dialog", { className: "bd-code bd-share-dlg", ref: p.dialogRef, "aria-labelledby": "bd-sh-title" },
    e("div", { className: "bd-code-head" },
      e("div", { className: "bd-code-intro" }, e("h2", { id: "bd-sh-title" }, "Share " + (file.name || "this file")),
        e("p", { className: "bd-inspect-sub" }, "Who can open and edit this file. Your own account is under ", e("button", { type: "button", className: "bd-link", onClick: p.onAccount }, "Account"), ".")),
      e("div", { className: "bd-code-actions" }, e("button", { type: "button", className: "bd-act", "aria-label": "Close", onClick: close }, e(Icon, { name: "close" })))),
    e("div", { className: "bd-br-body" },
      me && file.cloud && p.cloud ? e("p", { className: cx("bd-sh-status", "is-" + p.cloud.kind), role: "status" }, e(Icon, { name: p.cloud.icon }), e("span", null, e("b", null, p.cloud.label), " " + p.cloud.detail)) : null,
      body,
      people.error ? e("p", { className: cx("bd-acct-msg", "is-error"), role: "status" }, e(Icon, { name: "alert" }), e("span", null, people.error)) : null),
    e("div", { className: "bd-br-foot" },
      e("span", { className: "bd-edit-undo" }, e(Icon, { name: "lock" }), "Only people on the file can open it."),
      e("span", { className: "bd-edit-sp" }),
      e("button", { type: "button", className: "bd-btn", onClick: close }, "Done")));
}

export { ShareDialog };
