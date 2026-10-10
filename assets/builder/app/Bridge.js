/* Agents on the canvas: the dialog that adds an agent (each with its own
   link) and lists those working, the pill in the top bar while any are,
   the Session panel listing every step (by agent, with undo) and holding a
   change that waits to be applied, and the avatar each agent shows on its
   cursor. App.js owns the sessions; these only draw them. */

import { cx, e } from "../config.js";
import { Icon } from "../ui/icons.js";

var memo = React.memo;

/* An agent's mark: the small picture it sent with hello, or its initial on
   its colour. { agent: { name, mark, color }, size } */
function Avatar(p) {
  var a = p.agent || {};
  return e("span", { className: cx("bd-av", p.size && "is-" + p.size), style: { "--bd-agent": a.color }, "aria-hidden": true },
    a.mark ? e("img", { src: a.mark, alt: "" }) : String(a.name || "?").trim().charAt(0).toUpperCase());
}

function Switch(p) {
  return e("button", { type: "button", role: "switch", "aria-checked": !!p.on, className: cx("bd-br-switch", p.on && "is-on"), disabled: p.disabled, onClick: function () { p.set(!p.on); }, "aria-label": p.label },
    e("span", { className: "bd-br-knob" }));
}

function what(a) {
  return a.canEdit ? "Can make changes" + (a.askFirst ? " · asks first" : " · live") : "Can only look";
}

/* The agents working on this file, and a form to add one.
   { dialogRef, account, bridge, options, setOptions, onAdd, onEnd(key), onEndAll, onCopy(key), onSignIn } */
var BridgeDialog = memo(function BridgeDialog(p) {
  var o = p.options, list = p.bridge ? p.bridge.sessions : [];
  var off = p.account.status === "off", out = p.account.status !== "in";
  var starting = list.some(function (a) { return a.status === "starting"; });
  var close = function () { if (p.dialogRef.current) p.dialogRef.current.close(); };
  var set = function (k, v) { var n = Object.assign({}, o); n[k] = v; if (k === "canEdit" && !v) n.askFirst = false; p.setOptions(n); };
  var row = function (key, icon, title, sub, on, disabled) {
    return e("div", { className: "bd-br-opt", key: key },
      e(Icon, { name: icon }),
      e("div", null, e("b", null, title), e("span", null, sub)),
      e(Switch, { on: on, disabled: disabled, label: title, set: function (v) { set(key, v); } }));
  };
  return e("dialog", { className: "bd-code bd-bridge-dlg", ref: p.dialogRef, "aria-labelledby": "bd-br-title" },
    e("div", { className: "bd-code-head" },
      e("div", { className: "bd-code-intro" }, e("h2", { id: "bd-br-title" }, "Let agents edit this file"),
        e("p", { className: "bd-inspect-sub" }, "An agent works on your open canvas with the assistant's own tools: it reads the page, makes changes, runs the checks and takes pictures. Each gets its own link, so you see who did what, and can end one without the others.")),
      e("div", { className: "bd-code-actions" }, e("button", { type: "button", className: "bd-act", "aria-label": "Close", onClick: close }, e(Icon, { name: "close" })))),
    e("div", { className: "bd-br-body" },
      off ? e("p", { className: "bd-br-note" }, e(Icon, { name: "info" }), "Sessions run through the builder's cloud, which isn't connected here yet (docs/cloud.md).")
        : out ? e("p", { className: "bd-br-note" }, e(Icon, { name: "info" }), "Sign in first: a session is tied to your account. ", e("button", { type: "button", className: "bd-link", onClick: p.onSignIn }, "Sign in")) : null,
      list.length ? e("ul", { className: "bd-br-agents", role: "list", "aria-label": "Agents on this file" }, list.map(function (a) {
        return e("li", { key: a.key, className: "bd-br-agent" },
          e(Avatar, { agent: a }),
          e("div", { className: "bd-br-agent-t" }, e("b", null, a.name), e("span", null, a.status === "starting" ? "Starting…" : a.status === "error" ? a.error : what(a)),
            a.link ? e("code", { className: "bd-br-link" }, a.link) : null),
          a.link ? e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.onCopy(a.key); } }, e(Icon, { name: "copy" }), "Copy link") : null,
          e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.onEnd(a.key); } }, a.status === "error" ? "Remove" : "End"));
      })) : null,
      e("div", { className: "bd-br-add" },
        e("div", { className: "bd-br-st" }, e("b", null, list.length ? "Add another agent" : "Add an agent"),
          e("span", null, "Name it, choose what it can do, then give it the link. It can send its own name and mark when it starts. The link works while this tab stays open, and ends after an hour without a step."),
          e("label", { className: "bd-br-name" }, e("span", null, "Name"),
            e("input", { type: "text", maxLength: 40, value: o.name || "", placeholder: list.length ? "Agent " + (list.length + 1) : "Claude", onChange: function (ev) { set("name", ev.target.value); } })),
          e("div", { className: "bd-br-opts" },
            row("canSee", "eye", "See the canvas", "Read layers, take pictures, run the checks", true, true),
            row("canEdit", "sliders", "Make changes", "Add, change and remove layers in this file", o.canEdit, false),
            row("askFirst", "ask", "Ask before each change", "Each change waits for you to apply it", o.askFirst, !o.canEdit))))),
    e("div", { className: "bd-br-foot" },
      e("span", { className: "bd-edit-undo" }, e(Icon, { name: "lock" }), "Agents see only what they ask for. Every step can be undone."),
      e("span", { className: "bd-edit-sp" }),
      list.length > 1 ? e("button", { type: "button", className: "bd-btn", onClick: p.onEndAll }, "End all") : null,
      e("button", { type: "button", className: "bd-btn", onClick: close }, list.length ? "Done" : "Cancel"),
      e("button", { type: "button", className: "bd-btn bd-btn-primary", disabled: out || starting, onClick: p.onAdd }, e(Icon, { name: "plus" }), list.length ? "Add agent" : "Start session")));
});

/* The top bar while agents work. { bridge, frameName, onPause, onEnd, onOpen, onManage } */
function BridgePill(p) {
  var b = p.bridge;
  var live = b ? b.sessions.filter(function (a) { return a.status === "live"; }) : [];
  if (!live.length) return null;
  var text = b.paused ? "Paused" : b.pending ? "Waiting on you in" : live.length === 1 ? live[0].name + " can edit" : live.length + " agents on";
  return e("span", { className: cx("bd-br-pill", b.paused && "is-paused"), role: "status" },
    e("button", { type: "button", className: "bd-br-pill-main", onClick: p.onOpen, title: "Show the session" },
      e("span", { className: "bd-br-stack" }, live.slice(0, 3).map(function (a) { return e(Avatar, { key: a.key, agent: a, size: "sm" }); })),
      e("span", { className: "bd-br-pill-text" }, text, b.paused ? "" : e(React.Fragment, null, " ", e("b", null, p.frameName)))),
    e("span", { className: "bd-br-vd", "aria-hidden": true }),
    e("button", { type: "button", className: "bd-br-lk", onClick: p.onManage, "aria-label": "Agents on this file", title: "Agents on this file" }, e(Icon, { name: "plus" })),
    e("button", { type: "button", className: "bd-br-lk", onClick: p.onPause, "aria-label": b.paused ? "Resume" : "Pause" }, e(Icon, { name: b.paused ? "play" : "pause" }), e("span", { className: "bd-br-lk-text" }, b.paused ? "Resume" : live.length > 1 ? "Pause all" : "Pause")),
    e("button", { type: "button", className: "bd-br-lk", onClick: p.onEnd }, live.length > 1 ? "End all" : "End"));
}

function stepRow(s, agent, onUndo) {
  return s.rows.map(function (r, i) {
    return e("li", { key: s.id + ":" + i, className: cx("bd-br-a", s.undone && "is-undone", !s.ok && "is-off") },
      i === 0 ? e(Avatar, { agent: agent, size: "sm" }) : e("span", { className: "bd-av is-sm is-blank", "aria-hidden": true }),
      e("div", { className: "bd-edit-t" }, e("b", null, r.title), r.detail ? e("span", null, r.detail) : null,
        s.running ? e("em", { className: "bd-br-now" }, "Making this change…") : null,
        !s.ok && s.why ? e("em", { className: "bd-br-why" }, s.why) : null,
        s.shot && i === 0 ? e("img", { className: "bd-br-thumb", src: s.shot, alt: "" }) : null),
      e("span", { className: "bd-br-kind" }, e(Icon, { name: r.icon })),
      i === 0 && s.diff && !s.undone ? e("button", { type: "button", className: "bd-act", "aria-label": "Undo " + r.title, title: "Undo this step", onClick: function () { onUndo(s.id); } }, e(Icon, { name: "undo" })) : null);
  });
}

/* Every agent's steps, newest first, filtered to one agent if asked, with a
   change waiting on top when one asks first.
   { bridge, onUndo(id), onUndoAll(key), onAnswer(apply, note), onClose, onFilter(key) } */
var SessionPanel = memo(function SessionPanel(p) {
  var b = p.bridge;
  var noteState = React.useState(""), note = noteState[0], setNote = noteState[1];
  if (!b || !b.open || !b.sessions.length) return null;
  var byKey = {};
  b.sessions.forEach(function (a) { byKey[a.key] = a; });
  var gone = { name: "Ended", color: "var(--dt-text-secondary)" };
  var steps = b.steps.filter(function (s) { return !b.filter || s.key === b.filter; });
  var undoable = steps.filter(function (s) { return s.diff && !s.undone; }).length;
  var who = b.filter ? byKey[b.filter] : null;
  var asker = b.pending ? byKey[b.pending.key] || gone : null;
  return e("section", { className: "bd-br-panel", "aria-label": "Agents' session" },
    e("div", { className: "bd-br-sh" }, e("b", null, "Session"), e("span", { className: "bd-edit-sp" }),
      b.sessions.length > 1 ? e("div", { className: "bd-br-filter", role: "group", "aria-label": "Show steps from" },
        e("button", { type: "button", "aria-pressed": !b.filter, className: cx(!b.filter && "is-on"), onClick: function () { p.onFilter(""); } }, "All"),
        b.sessions.map(function (a) { return e("button", { key: a.key, type: "button", "aria-pressed": b.filter === a.key, "aria-label": a.name, title: a.name, className: cx(b.filter === a.key && "is-on"), onClick: function () { p.onFilter(a.key); } }, e(Avatar, { agent: a, size: "xs" })); }))
        : e("span", { className: "bd-edit-n" }, steps.length + (steps.length === 1 ? " step" : " steps")),
      e("button", { type: "button", className: "bd-act", "aria-label": "Hide the session", onClick: p.onClose }, e(Icon, { name: "close" }))),
    e("div", { className: "bd-br-scroll" },
      b.pending ? e("div", { className: "bd-br-card", role: "group", "aria-label": "A change waiting for you" },
        e("div", { className: "bd-br-ch" }, e(Avatar, { agent: asker, size: "sm" }), e("b", null, asker.name + " wants to make " + b.pending.rows.length + (b.pending.rows.length === 1 ? " change" : " changes"))),
        e("ul", { className: "bd-br-list", role: "list" }, b.pending.rows.map(function (r, i) {
          return e("li", { key: i, className: "bd-br-a" }, e("span", { className: "bd-edit-ic" }, e(Icon, { name: r.icon })), e("div", { className: "bd-edit-t" }, e("b", null, r.title), r.detail ? e("span", null, r.detail) : null));
        })),
        e("label", { className: "visually-hidden", htmlFor: "bd-br-note" }, "Tell the agent something instead"),
        e("input", { id: "bd-br-note", className: "bd-br-tell", placeholder: "Tell " + asker.name + " something instead…", value: note, onChange: function (ev) { setNote(ev.target.value); },
          onKeyDown: function (ev) { if (ev.key === "Enter" && note.trim()) { p.onAnswer(false, note.trim()); setNote(""); } } }),
        e("div", { className: "bd-br-cf" },
          e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.onAnswer(false, note.trim()); setNote(""); } }, note.trim() ? "Send instead" : "Not now"),
          e("span", { className: "bd-edit-sp" }),
          e("button", { type: "button", className: "bd-btn bd-btn-sm bd-btn-primary", onClick: function () { p.onAnswer(true); setNote(""); } }, "Apply " + b.pending.rows.length + (b.pending.rows.length === 1 ? " change" : " changes")))) : null,
      steps.length ? e("ul", { className: "bd-br-list", role: "list" }, steps.map(function (s) { return stepRow(s, byKey[s.key] || gone, p.onUndo); }))
        : !b.pending ? e("p", { className: "bd-sec-empty" }, "Waiting for " + (who ? who.name : b.sessions.length > 1 ? "the agents" : b.sessions[0].name) + ". Give it the link and ask for what you want; each step shows here as it happens.") : null),
    e("div", { className: "bd-br-sf" },
      e("button", { type: "button", className: "bd-btn bd-btn-sm", disabled: !undoable, onClick: function () { p.onUndoAll(b.filter || ""); } }, e(Icon, { name: "undo" }), undoable ? (who ? "Undo " + who.name + "'s " + undoable : "Undo all " + undoable) : "Undo all"),
      e("span", { className: "bd-edit-sp" }),
      e("span", { className: "bd-edit-n" }, "Each step is one undo")));
});

export { Avatar, BridgeDialog, BridgePill, SessionPanel };
