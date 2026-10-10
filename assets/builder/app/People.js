/* Who's on this file, in the top bar: you, from your account, and the
   others as they join, once live editing is on (cloud files, still to
   come). Signed out, the spot offers to sign in, so it's always there and
   says what it's for. The agents' avatars live in the bridge pill, on the
   other side of the bar. */

import { e } from "../config.js";
import { Icon } from "../ui/icons.js";
import { Avatar } from "./Bridge.js";

var COLORS = ["var(--dt-color-amber-500)", "var(--dt-color-cyan-500)", "var(--dt-color-green-500)", "var(--dt-color-violet-500)", "var(--dt-color-red-500)", "var(--dt-color-primary-500)"];
var SHOWN = 4;

/* A colour a person keeps, from their id. */
function colorFor(id) {
  var h = 0, s = String(id || "");
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

/* p: { account (useAccount's state), others: [{ id, name, color?, mark? }], onOpen }. */
function People(p) {
  var me = p.account && p.account.status === "in" ? p.account.account : null;
  if (!me) {
    return e("button", { type: "button", className: "bd-people-in", onClick: p.onOpen, "aria-label": "Sign in", title: "Sign in to keep files in the cloud and work with others" },
      e("span", { className: "bd-av is-ghost", "aria-hidden": true }, e(Icon, { name: "user" })));
  }
  var others = p.others || [];
  var names = others.map(function (o) { return o.name; }).join(", ");
  return e("button", { type: "button", className: "bd-people", onClick: p.onOpen,
    "aria-label": "Account, " + me.email + (others.length ? ", with " + others.length + (others.length === 1 ? " other person" : " other people") : ""),
    title: me.email + " (you)" + (names ? ", with " + names : "") },
    others.slice(0, SHOWN).map(function (o) { return e(Avatar, { key: o.id, agent: { name: o.name, color: o.color || colorFor(o.id), mark: o.mark } }); }),
    others.length > SHOWN ? e("span", { className: "bd-av is-more", "aria-hidden": true }, "+" + (others.length - SHOWN)) : null,
    e(Avatar, { agent: { name: me.email, color: colorFor(me.id) } }));
}

export { People, colorFor };
