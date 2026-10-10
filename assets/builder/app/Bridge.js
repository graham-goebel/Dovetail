/* The live canvas bridge's screens: the dialog that starts a session and
   gives Claude its link, the pill in the top bar while one runs, and the
   Session panel listing each step (with its undo) and holding a change
   that waits to be applied. App.js owns the session; these only draw it. */

import { cx, e } from "../config.js";
import { Icon } from "../ui/icons.js";

var memo = React.memo;

function Switch(p) {
  return e("button", { type: "button", role: "switch", "aria-checked": !!p.on, className: cx("bd-br-switch", p.on && "is-on"), disabled: p.disabled, onClick: function () { p.set(!p.on); }, "aria-label": p.label },
    e("span", { className: "bd-br-knob" }));
}

/* Start a session: what Claude may do, then its link to copy.
   { dialogRef, account, bridge, options, setOptions, onStart, onEnd, onCopy, onSignIn } */
var BridgeDialog = memo(function BridgeDialog(p) {
  var b = p.bridge, o = p.options;
  var live = b && b.status === "live";
  var off = p.account.status === "off", out = p.account.status !== "in";
  var close = function () { if (p.dialogRef.current) p.dialogRef.current.close(); };
  var row = function (key, icon, title, sub, on, disabled) {
    return e("div", { className: "bd-br-opt", key: key },
      e(Icon, { name: icon }),
      e("div", null, e("b", null, title), e("span", null, sub)),
      e(Switch, { on: on, disabled: disabled, label: title, set: function (v) { var n = Object.assign({}, o); n[key] = v; if (key === "canEdit" && !v) n.askFirst = false; p.setOptions(n); } }));
  };
  return e("dialog", { className: "bd-code bd-bridge-dlg", ref: p.dialogRef, "aria-labelledby": "bd-br-title" },
    e("div", { className: "bd-code-head" },
      e("div", { className: "bd-code-intro" }, e("h2", { id: "bd-br-title" }, "Let Claude edit this file"),
        e("p", { className: "bd-inspect-sub" }, "Claude works on your open canvas with the assistant's own tools: it reads the page, makes changes, runs the checks and takes pictures. You watch each step and can undo it.")),
      e("div", { className: "bd-code-actions" }, e("button", { type: "button", className: "bd-act", "aria-label": "Close", onClick: close }, e(Icon, { name: "close" })))),
    e("div", { className: "bd-br-body" },
      off ? e("p", { className: "bd-br-note" }, e(Icon, { name: "info" }), "Sessions run through the builder's cloud, which isn't connected here yet (docs/cloud.md).")
        : out ? e("p", { className: "bd-br-note" }, e(Icon, { name: "info" }), "Sign in first: a session is tied to your account. ", e("button", { type: "button", className: "bd-link", onClick: p.onSignIn }, "Sign in")) : null,
      e("div", { className: "bd-br-step" }, e("span", { className: "bd-br-n" }, "1"),
        e("div", { className: "bd-br-st" }, e("b", null, "Choose what it can do"),
          e("div", { className: "bd-br-opts" },
            row("canSee", "eye", "See the canvas", "Read layers, take pictures, run the checks", true, true),
            row("canEdit", "sliders", "Make changes", "Add, change and remove layers in this file", o.canEdit, live),
            row("askFirst", "ask", "Ask before each change", "Each change waits for you to apply it", o.askFirst, !o.canEdit)))),
      e("div", { className: "bd-br-step" }, e("span", { className: "bd-br-n" }, "2"),
        e("div", { className: "bd-br-st" }, e("b", null, "Give Claude the link"),
          e("span", null, "Paste it into Claude (in the app, the terminal or your editor). It works while this tab stays open, and ends after an hour without a step."),
          live ? e("div", { className: "bd-br-code" }, e("code", null, b.link), e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: p.onCopy }, e(Icon, { name: "copy" }), "Copy"))
            : e("p", { className: "bd-br-wait" }, b && b.status === "starting" ? "Starting…" : b && b.error ? b.error : "Start the session to get the link.")))),
    e("div", { className: "bd-br-foot" },
      e("span", { className: "bd-edit-undo" }, e(Icon, { name: "lock" }), "Claude sees only what it asks for. Every step can be undone."),
      e("span", { className: "bd-edit-sp" }),
      live ? e("button", { type: "button", className: "bd-btn", onClick: p.onEnd }, "End session") : e("button", { type: "button", className: "bd-btn", onClick: close }, "Cancel"),
      live ? e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: close }, "Done")
        : e("button", { type: "button", className: "bd-btn bd-btn-primary", disabled: out || (b && b.status === "starting"), onClick: p.onStart }, "Start session")));
});

/* The top bar while a session runs. { bridge, frameName, onPause, onEnd, onOpen } */
function BridgePill(p) {
  var b = p.bridge;
  if (!b || b.status !== "live") return null;
  var what = b.paused ? "Paused" : b.pending ? "Claude is waiting on you in" : "Claude can edit";
  return e("span", { className: cx("bd-br-pill", b.paused && "is-paused"), role: "status" },
    e("button", { type: "button", className: "bd-br-pill-main", onClick: p.onOpen, title: "Show the session" },
      e("i", { className: "bd-br-dot", "aria-hidden": true }), e(Icon, { name: "wand" }), e("span", { className: "bd-br-pill-text" }, what, b.paused ? "" : e(React.Fragment, null, " ", e("b", null, p.frameName)))),
    e("span", { className: "bd-br-vd", "aria-hidden": true }),
    e("button", { type: "button", className: "bd-br-lk", onClick: p.onPause, "aria-label": b.paused ? "Resume" : "Pause" }, e(Icon, { name: b.paused ? "play" : "pause" }), e("span", { className: "bd-br-lk-text" }, b.paused ? "Resume" : "Pause")),
    e("button", { type: "button", className: "bd-br-lk", onClick: p.onEnd }, "End"));
}

function stepRow(s, onUndo) {
  return s.rows.map(function (r, i) {
    return e("li", { key: s.id + ":" + i, className: cx("bd-br-a", s.undone && "is-undone", !s.ok && "is-off") },
      e("span", { className: "bd-edit-ic" }, e(Icon, { name: r.icon })),
      e("div", { className: "bd-edit-t" }, e("b", null, r.title), r.detail ? e("span", null, r.detail) : null,
        s.running ? e("em", { className: "bd-br-now" }, "Making this change…") : null,
        !s.ok && s.why ? e("em", { className: "bd-br-why" }, s.why) : null,
        s.shot && i === 0 ? e("img", { className: "bd-br-thumb", src: s.shot, alt: "" }) : null),
      i === 0 && s.diff && !s.undone ? e("button", { type: "button", className: "bd-act", "aria-label": "Undo " + r.title, title: "Undo this step", onClick: function () { onUndo(s.id); } }, e(Icon, { name: "undo" })) : null);
  });
}

/* The session's steps, newest first, with a change waiting on top when it
   asks first. { bridge, onUndo(id), onUndoAll, onAnswer(apply, note), onClose, onPause, onEnd } */
var SessionPanel = memo(function SessionPanel(p) {
  var b = p.bridge;
  var noteState = React.useState(""), note = noteState[0], setNote = noteState[1];
  if (!b || b.status !== "live" || !b.open) return null;
  var undoable = b.steps.filter(function (s) { return s.diff && !s.undone; }).length;
  return e("section", { className: "bd-br-panel", "aria-label": "Claude's session" },
    e("div", { className: "bd-br-sh" }, e(Icon, { name: "wand" }), e("b", null, "Session"), e("span", { className: "bd-edit-sp" }),
      e("span", { className: "bd-edit-n" }, b.askFirst ? "Asks first" : b.steps.length + (b.steps.length === 1 ? " step" : " steps")),
      e("button", { type: "button", className: "bd-act", "aria-label": "Hide the session", onClick: p.onClose }, e(Icon, { name: "close" }))),
    e("div", { className: "bd-br-scroll" },
      b.pending ? e("div", { className: "bd-br-card", role: "group", "aria-label": "A change waiting for you" },
        e("div", { className: "bd-br-ch" }, e(Icon, { name: "wand" }), e("b", null, "Claude wants to make " + b.pending.rows.length + (b.pending.rows.length === 1 ? " change" : " changes"))),
        e("ul", { className: "bd-br-list", role: "list" }, b.pending.rows.map(function (r, i) {
          return e("li", { key: i, className: "bd-br-a" }, e("span", { className: "bd-edit-ic" }, e(Icon, { name: r.icon })), e("div", { className: "bd-edit-t" }, e("b", null, r.title), r.detail ? e("span", null, r.detail) : null));
        })),
        e("label", { className: "visually-hidden", htmlFor: "bd-br-note" }, "Tell Claude something instead"),
        e("input", { id: "bd-br-note", className: "bd-br-tell", placeholder: "Tell Claude something instead…", value: note, onChange: function (ev) { setNote(ev.target.value); },
          onKeyDown: function (ev) { if (ev.key === "Enter" && note.trim()) { p.onAnswer(false, note.trim()); setNote(""); } } }),
        e("div", { className: "bd-br-cf" },
          e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.onAnswer(false, note.trim()); setNote(""); } }, note.trim() ? "Send instead" : "Not now"),
          e("span", { className: "bd-edit-sp" }),
          e("button", { type: "button", className: "bd-btn bd-btn-sm bd-btn-primary", onClick: function () { p.onAnswer(true); setNote(""); } }, "Apply " + b.pending.rows.length + (b.pending.rows.length === 1 ? " change" : " changes")))) : null,
      b.steps.length ? e("ul", { className: "bd-br-list", role: "list" }, b.steps.map(function (s) { return stepRow(s, p.onUndo); }))
        : !b.pending ? e("p", { className: "bd-sec-empty" }, "Waiting for Claude. Paste the link into Claude and ask for what you want; each step shows here as it happens.") : null),
    e("div", { className: "bd-br-sf" },
      e("button", { type: "button", className: "bd-btn bd-btn-sm", disabled: !undoable, onClick: p.onUndoAll }, e(Icon, { name: "undo" }), undoable ? "Undo all " + undoable : "Undo all"),
      e("span", { className: "bd-edit-sp" }),
      e("span", { className: "bd-edit-n" }, "Each step is one undo")));
});

export { BridgeDialog, BridgePill, SessionPanel };
