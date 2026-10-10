/* The Assistant panel: a conversation about the canvas. Each reply shows
   what it read (and, when it looked, the picture it saw), what it changed,
   the checks that ran after it (each with a Fix when it wants one), and
   Keep or Undo all; the box at the foot carries what goes with the next
   message as chips (the selection, the docs, the skills), each removable.
   The App runs the conversation; this draws it. */

import { cx, e, useEffect, useRef, useState } from "../config.js";
import { Icon } from "../ui/icons.js";
import { Segmented, Switch } from "../ui/parts.js";
import { senderOf } from "../model/threads.js";

function changeCard(p, turn) {
  if (!turn.changes.length) return null;
  return e("div", { className: "bd-as-card" },
    e("div", { className: "bd-as-card-h" }, e("span", null, turn.changes.length + (turn.changes.length === 1 ? " change" : " changes")),
      turn.kept ? e("span", { className: "bd-as-note" }, "Kept") : turn.undone ? e("span", { className: "bd-as-note" }, "Undone") : null),
    turn.changes.map(function (c, i) {
      var can = turn.status === "done" && !turn.kept && !turn.undone && !c.undone && !p.busy;
      return e("div", { key: i, className: cx("bd-as-row", c.undone && "is-undone") },
        e("span", { className: "bd-as-n" }, c.label),
        e("span", { className: "bd-as-v" }, c.value, c.on ? e("span", { className: "bd-as-on" }, " · " + c.on) : null),
        can ? e("button", { type: "button", className: "bd-act bd-act-ghost bd-as-row-undo", title: "Undo this and the changes after it", "aria-label": "Undo " + c.label + " and the changes after it", onClick: function () { p.undoFrom(turn.id, i); } }, e(Icon, { name: "undo" })) : null);
    }),
    turn.undone ? null : turn.checking ? e("div", { className: "bd-as-checks" }, e("div", { className: "bd-as-checks-h" }, e("span", null, "Checks"), e("span", { className: "bd-as-note" }, "Checking…")))
      : turn.checks ? e("div", { className: "bd-as-checks" },
        e("div", { className: "bd-as-checks-h" }, e("span", null, "Checks"), e("span", { className: "bd-as-note" }, "ran after the last step")),
        turn.checks.map(function (r) {
          var icon = r.status === "pass" ? "check" : r.status === "skip" ? "minus" : "alert";
          return e("div", { key: r.id, className: cx("bd-as-check", "is-" + r.status) },
            e("span", { className: "bd-as-check-i", "aria-hidden": "true" }, e(Icon, { name: icon })),
            e("span", { className: "bd-as-check-t", title: r.detail || undefined },
              r.ids.length ? e("button", { type: "button", className: "bd-as-check-link", onClick: function () { p.show(r.ids); } }, r.title) : r.title,
              r.status === "skip" && r.detail ? e("span", { className: "bd-as-check-d" }, r.detail) : null),
            (r.status === "fail" || r.status === "warn") && !p.busy ? e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.fix(turn.id, r); } }, "Fix") : null);
        })) : null,
    !turn.kept && !turn.undone && turn.status === "done" ? e("div", { className: "bd-as-acts" },
      e("button", { type: "button", className: "bd-btn bd-btn-sm bd-btn-primary", onClick: function () { p.keep(turn.id); } }, e(Icon, { name: "check" }), "Keep"),
      e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.undoTurn(turn.id); } }, e(Icon, { name: "undo" }), "Undo all"),
      e("button", { type: "button", className: "bd-btn bd-btn-sm bd-as-retry", onClick: function () { p.retry(turn.id); } }, "Retry")) : null);
}

/* A plan the assistant wants approved before a big change. */
function planCard(p, turn) {
  var pl = turn.plan;
  if (!pl) return null;
  return e("div", { className: "bd-as-card bd-as-plan" },
    e("div", { className: "bd-as-card-h" },
      e("span", null, e(Icon, { name: "frame" }), pl.title),
      pl.status === "approved" ? e("span", { className: "bd-as-note" }, "Approved") : pl.status === "changing" ? e("span", { className: "bd-as-note" }, "Changing") : pl.frame ? e("span", { className: "bd-as-note" }, [pl.frame.preset, pl.frame.mode].filter(Boolean).join(" · ")) : null),
    e("ol", { className: "bd-as-plan-steps" }, pl.steps.map(function (st, i) {
      return e("li", { key: i }, e("b", null, st.title), st.detail ? e("span", null, st.detail) : null);
    })),
    pl.notes && pl.notes.length ? e("div", { className: "bd-as-plan-notes" }, pl.notes.map(function (n, i) { return e("p", { key: i }, e(Icon, { name: "alert" }), e("span", null, n)); })) : null,
    pl.status === "pending" ? e("div", { className: "bd-as-acts" },
      e("button", { type: "button", className: "bd-btn bd-btn-sm bd-btn-primary", onClick: function () { p.approvePlan(turn.id); } }, e(Icon, { name: "play" }), "Build it"),
      e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.changePlan(turn.id); } }, e(Icon, { name: "pencil" }), "Change plan")) : null,
    pl.status === "pending" ? e("label", { className: "bd-as-plan-skip" },
      e("input", { type: "checkbox", checked: !p.plans, onChange: function (ev) { p.setPlans(!ev.target.checked); } }),
      "Don't ask before big changes") : null);
}

/* A question with a few ways to go: a click picks one, and anything typed
   next answers it instead. */
function askCard(p, turn) {
  var q = turn.ask;
  if (!q) return null;
  var open = q.status === "pending" && p.busy;
  return e("div", { className: "bd-as-card bd-as-ask", role: "group", "aria-label": q.question },
    e("div", { className: "bd-as-card-h" }, e("span", null, q.question),
      e("span", { className: "bd-as-note" }, q.status === "answered" ? "Answered" : q.status === "skipped" || !open ? "Set aside" : "Pick one")),
    q.options.map(function (o, i) {
      var chosen = q.choice === i;
      return e("button", { key: i, type: "button", className: cx("bd-as-opt", chosen && "is-chosen"), disabled: !open, "aria-pressed": chosen,
        onClick: function () { p.answerAsk(turn.id, i); } },
        e("span", { className: "bd-as-opt-k", "aria-hidden": "true" }, chosen ? e(Icon, { name: "check" }) : String.fromCharCode(65 + i)),
        e("span", { className: "bd-as-opt-t" }, e("b", null, o.label), o.detail ? e("span", null, o.detail) : null));
    }),
    q.answer ? e("p", { className: "bd-as-ask-said" }, e(Icon, { name: "chat" }), e("span", null, q.answer))
      : open ? e("div", { className: "bd-as-acts" },
        e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.answerAskAll(turn.id); }, title: "One copy of the frame per option, side by side" }, e(Icon, { name: "layers2" }), "Try them all")) : null,
    !q.answer && open ? e("button", { type: "button", className: "bd-as-opt bd-as-opt-other", onClick: p.otherAsk }, e("span", { className: "bd-as-opt-k", "aria-hidden": "true" }, e(Icon, { name: "pencil" })), e("span", { className: "bd-as-opt-t" }, e("span", null, "Something else? Type it below."))) : null);
}

/* Copies of a frame, one per direction: each can be shown on the canvas,
   and keeping one puts it in the original's place. */
function variantsCard(p, turn) {
  var vs = turn.variants;
  if (!vs) return null;
  var done = vs.kept != null;
  var can = turn.status === "done" && !done && !turn.undone && !p.busy;
  return e("div", { className: "bd-as-card bd-as-variants" },
    e("div", { className: "bd-as-card-h" }, e("span", null, e(Icon, { name: "layers2" }), vs.items.length + " variants of " + vs.sourceName),
      e("span", { className: "bd-as-note" }, done ? (vs.kept >= 0 ? "Kept " + vs.items[vs.kept].label : "Kept the original") : "Side by side")),
    vs.items.map(function (v, i) {
      return e("div", { key: v.frame, className: cx("bd-as-row", done && vs.kept === i && "is-kept") },
        e("span", { className: "bd-as-n bd-as-vk" }, String.fromCharCode(65 + i)),
        e("span", { className: "bd-as-v" }, v.label),
        !done ? e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.showVariant(v.frame); }, "aria-label": "Show " + v.label }, "Show") : null);
    }),
    can ? e("div", { className: "bd-as-acts bd-as-keeps" },
      vs.items.map(function (v, i) { return e("button", { key: v.frame, type: "button", className: cx("bd-btn bd-btn-sm", i === 0 && "bd-btn-primary"), onClick: function () { p.keepVariant(turn.id, i); }, "aria-label": "Keep " + v.label }, "Keep " + String.fromCharCode(65 + i)); }),
      e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.keepVariant(turn.id, -1); } }, "Keep the original")) : null,
    can ? e("p", { className: "bd-as-variants-n" }, "Keeping one puts it where " + vs.sourceName + " is and removes the rest. Undo brings them back.") : null);
}

/* What the person changed since the last reply: in the thread once sent,
   and above the message box until then. */
function editLines(lines, count, max) {
  var shown = lines.slice(0, max);
  return e("ul", { className: "bd-as-edits-l" }, shown.map(function (l, i) { return e("li", { key: i }, l); }),
    count > shown.length ? e("li", { className: "bd-as-edits-more" }, "and " + (count - shown.length) + " more") : null);
}

/* The panel's menu: its settings and the thread's actions. */
function AsMenu(p) {
  var openState = useState(false), open = openState[0], setOpen = openState[1];
  var ref = useRef(null);
  useEffect(function () {
    if (!open) return undefined;
    var away = function (ev) { if (ref.current && !ref.current.contains(ev.target)) setOpen(false); };
    var key = function (ev) { if (ev.key === "Escape") { setOpen(false); var b = ref.current && ref.current.querySelector(".bd-as-menu-btn"); if (b) b.focus(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return function () { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open]);
  var row = function (id, title, help, value, onChange) {
    return e("div", { className: "bd-as-mrow" },
      e("span", { className: "bd-as-mrow-t" }, e("b", { id: id }, title), e("span", null, help)),
      e(Switch, { value: value, onChange: onChange, labelledBy: id }));
  };
  return e("div", { className: "bd-as-menu", ref: ref },
    e("button", { type: "button", className: "bd-act bd-act-ghost bd-as-menu-btn", "aria-label": "Assistant settings", "aria-expanded": open, "aria-haspopup": "true", onClick: function () { setOpen(!open); } }, e(Icon, { name: "more" })),
    open ? e("div", { className: "bd-as-pop", role: "group", "aria-label": "Assistant settings" },
      /* Live or practice: live sends requests to the model through the cloud
         and needs a signed-in person; practice answers from a script here. */
      e("div", { className: cx("bd-as-mrow", !p.canLive && "is-off") },
        e("span", { className: "bd-as-mrow-t" }, e("b", { id: "bd-as-m-live" }, "Live assistant"),
          e("span", null, p.canLive ? "Each request goes to the model through the cloud, on the account's usage. Off, a script in this browser answers, free." : p.cloudOn ? "Sign in to send requests to the model. Until then a script in this browser answers." : "Needs the cloud connected. A script in this browser answers.")),
        p.cloudOn && !p.canLive ? e("button", { type: "button", className: "bd-as-mbtn bd-as-msign", onClick: function () { setOpen(false); p.signIn(); } }, e(Icon, { name: "user" }), "Sign in")
          : e(Switch, { value: p.mode === "live", onChange: function (v) { p.setMode(v ? "live" : "practice"); }, labelledBy: "bd-as-m-live", disabled: !p.canLive })),
      e("hr"),
      row("bd-as-m-plan", "Plan before big changes", "New pages, or more than about 10 layers. Small edits just happen.", p.plans, p.setPlans),
      row("bd-as-m-look", "Look at the canvas", "Sends a picture of what it built so it can check and fix it. Off keeps this file's canvas private.", p.look, p.setLook),
      e("p", { className: "bd-as-mnote" }, "Checks run after every change."),
      e("hr"),
      e("div", { className: "bd-as-mrow is-off" },
        e("span", { className: "bd-as-mrow-t" }, e("b", { id: "bd-as-m-share" }, "Share in this file"), e("span", null, p.cloudFile ? "Everyone on this file can read it and carry it on." : "Sharing needs this file in the cloud, which isn't built yet. Conversations stay in this browser for now.")),
        e(Switch, { value: false, onChange: function () {}, labelledBy: "bd-as-m-share", disabled: !p.cloudFile })),
      e("hr"),
      e("button", { type: "button", className: "bd-as-mbtn", disabled: !p.thread.length, onClick: function () { setOpen(false); p.exportThread(); } }, e(Icon, { name: "download" }), "Export as .md"),
      e("button", { type: "button", className: "bd-as-mbtn", disabled: !p.thread.length || p.busy, onClick: function () { setOpen(false); p.clear(); } }, e(Icon, { name: "trash" }), "Delete this conversation")) : null);
}

/* When a conversation was last carried on, in a few words. */
function ago(t) {
  var s = Math.max(0, (Date.now() - (t || 0)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min";
  if (s < 86400) return Math.round(s / 3600) + " h";
  var d = new Date(t);
  return s < 7 * 86400 ? d.toLocaleDateString(undefined, { weekday: "short" }) : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* The file's conversations: the open one first marked, each with what was
   said last and the changes still standing. */
function ThreadList(p) {
  var mine = p.list.filter(function (x) { return !x.by || !p.me || x.by.id === p.me.id; });
  var others = p.list.filter(function (x) { return mine.indexOf(x) < 0; });
  var row = function (x) {
    return e("div", { key: x.id, className: cx("bd-as-tr", x.id === p.currentId && "is-open") },
      e("button", { type: "button", className: "bd-as-tr-open", onClick: function () { p.openThread(x.id); }, disabled: p.busy, "aria-current": x.id === p.currentId ? "true" : undefined },
        e("span", { className: "bd-as-tr-h" }, e("b", null, x.title), e("span", { className: "bd-as-note" }, ago(x.updated))),
        x.said ? e("span", { className: "bd-as-tr-said" }, x.said) : null,
        e("span", { className: "bd-as-tr-m" },
          x.changes ? e("span", null, e(Icon, { name: "pencil" }), x.changes + (x.changes === 1 ? " change" : " changes")) : null,
          x.shared ? e("span", null, e(Icon, { name: "user" }), "Shared") : null,
          x.by && p.me && x.by.id !== p.me.id ? e("span", null, x.by.name) : null)),
      e("button", { type: "button", className: "bd-act bd-act-ghost bd-as-tr-del", "aria-label": "Delete " + x.title, title: "Delete", onClick: function () { p.removeThread(x.id); }, disabled: p.busy }, e(Icon, { name: "trash" })));
  };
  return e("div", { className: "bd-as-list" },
    !p.list.length ? e("p", { className: "bd-as-empty-l" }, "No conversations on this file yet. Start one and it's kept here.") : null,
    mine.length ? e("div", { className: "bd-as-grp" }, e("span", null, "This file"), e("span", { className: "bd-as-note" }, String(mine.length))) : null,
    mine.map(row),
    others.length ? e("div", { className: "bd-as-grp" }, e("span", null, "Shared with you"), e("span", { className: "bd-as-note" }, String(others.length))) : null,
    others.map(row),
    e("p", { className: "bd-as-list-n" }, p.cloudFile ? "Kept in the cloud. Shared ones show to everyone on the file." : "Kept in this browser."));
}

function AssistantPanel(p) {
  var listRef = useRef(null);
  /* The thread follows what's new at its foot: text, steps, the change card, its checks. */
  var last = p.thread[p.thread.length - 1];
  var tail = last ? [p.thread.length, last.text, (last.steps || []).length, (last.changes || []).length, last.checking ? 1 : 0, last.checks ? last.checks.length : 0, last.status].join("|") : "";
  useEffect(function () { var el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [tail]);
  var send = function () { var t = p.draft.trim(); if (!t) return; if (p.busy) p.note(t); else p.send(t); };
  return e("div", { className: "bd-as" },
    e("div", { className: "bd-as-head" },
      e("span", { className: "bd-as-title" }, "Assistant"),
      p.mode === "practice" ? e("span", { className: "bd-as-badge", title: "Answers come from a script in this browser; nothing is sent or charged" }, "Practice")
        : e("span", { className: "bd-as-badge is-live", title: "Requests go to the model through the cloud, on the account's usage" }, "Live"),
      e("button", { type: "button", className: cx("bd-act bd-act-ghost", p.view === "list" && "is-on"), title: p.view === "list" ? "Back to the conversation" : "Conversations", "aria-label": "Conversations", "aria-pressed": p.view === "list", onClick: function () { p.showList(p.view !== "list"); } }, e(Icon, { name: "list" })),
      e("button", { type: "button", className: "bd-act bd-act-ghost", title: "New conversation", "aria-label": "New conversation", onClick: p.fresh, disabled: (!p.thread.length && p.view !== "list") || p.busy }, e(Icon, { name: "plus" })),
      e(AsMenu, p)),
    p.view === "list" ? e(ThreadList, p) : e("div", { className: "bd-as-thread", ref: listRef, "aria-live": "polite" },
      !p.thread.length ? e("div", { className: "bd-as-empty" },
        e("p", null, "Ask for a change to what's selected, or describe a section to add. It works with the design system's tokens and components only."),
        e("div", { className: "bd-as-sugg" }, p.suggestions.map(function (s) { return e("button", { key: s, type: "button", onClick: function () { p.send(s); }, disabled: p.busy }, s); }))) : null,
      p.thread.map(function (t) {
        if (t.role === "edits") return e("div", { key: t.id, className: "bd-as-edits" },
          e("div", { className: "bd-as-edits-h" }, e(Icon, { name: "cursor" }), e("b", null, "You changed " + t.count + (t.count === 1 ? " thing" : " things"))),
          editLines(t.lines, t.count, 6));
        if (t.role === "divider") return e("p", { key: t.id, className: "bd-as-divider" }, t.text);
        if (t.role === "user") return t.queued ? e("div", { key: t.id, className: "bd-as-me-wrap" }, e("div", { className: "bd-as-me is-queued" }, t.text), e("span", { className: "bd-as-queued" }, e(Icon, { name: "chat" }), "Lands after this step"))
          : senderOf(t, p.me) ? e("div", { key: t.id, className: "bd-as-me-wrap" }, e("span", { className: "bd-as-from" }, senderOf(t, p.me)), e("div", { className: "bd-as-me" }, t.text))
          : e("div", { key: t.id, className: "bd-as-me" }, t.text);
        return e("div", { key: t.id, className: cx("bd-as-bot", t.status === "error" && "is-error") },
          t.steps.map(function (s, i) {
            if (s.note) return e("p", { key: i, className: "bd-as-note-step" }, s.text);
            if (s.shot) return e("div", { key: i, className: "bd-as-look" }, e("img", { src: s.shot, alt: "" }), e("span", null, e(Icon, { name: "eye" }), s.text));
            return e("div", { key: i, className: cx("bd-as-step", !s.ok && "is-failed") }, e("span", { className: "bd-as-ok" }, e(Icon, { name: s.ok ? "check" : "close" })), s.text);
          }),
          t.text ? e("p", { className: "bd-as-text" }, t.text) : t.status === "working" ? e("p", { className: "bd-as-text bd-as-wait" }, "Working…") : null,
          planCard(p, t),
          askCard(p, t),
          variantsCard(p, t),
          t.error ? e("p", { className: "bd-as-text bd-as-err" }, t.error) : null,
          changeCard(p, t));
      })),
    p.edits && p.view !== "list" ? e("div", { className: "bd-as-edits is-pending" },
      e("div", { className: "bd-as-edits-h" }, e(Icon, { name: "cursor" }), e("b", null, "You changed " + p.edits.count + (p.edits.count === 1 ? " thing" : " things") + " since its last reply"),
        e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Don't send these changes", title: "Don't send these changes", onClick: p.dropEdits }, e(Icon, { name: "close" }))),
      editLines(p.edits.lines, p.edits.count, 3),
      e("p", { className: "bd-as-edits-n" }, "Sent with your next message, so it builds on them.")) : null,
    p.view === "list" ? null : e("div", { className: "bd-as-comp" },
      e("div", { className: "bd-as-chips" },
        p.target ? e("span", { className: cx("bd-as-chip is-target", !p.includeSel && "is-off") },
          e(Icon, { name: "frame" }), p.target,
          e("button", { type: "button", "aria-label": p.includeSel ? "Don't send the selection" : "Send the selection", onClick: p.toggleSel }, p.includeSel ? "×" : "+")) : null,
        p.docs.map(function (d) {
          return e("span", { key: d.id, className: "bd-as-chip" }, e(Icon, { name: "file" }), d.title,
            e("button", { type: "button", "aria-label": "Leave out " + d.title, onClick: function () { p.dropDoc(d.id); } }, "×"));
        }),
        p.skills.map(function (s) { return e("span", { key: s.id, className: "bd-as-chip is-skill", title: s.description }, e(Icon, { name: "bolt" }), s.name); })),
      e("textarea", { className: "bd-as-input", rows: 2, value: p.draft, placeholder: p.waiting ? "Answer the question, or pick an option…" : p.busy ? "Add a note while it works…" : "Ask for a change, or describe a new page…", "aria-label": p.busy ? "Add a note for the assistant" : "Message the assistant",
        onChange: function (ev) { p.setDraft(ev.target.value); },
        onKeyDown: function (ev) { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); send(); } } }),
      e("div", { className: "bd-as-bar" },
        e(Segmented, { label: "What it may change", value: p.reach, onChange: function (v) { if (v) p.setReach(v); },
          options: [{ value: "selection", label: "Selection" }, { value: "page", label: "Page" }] }),
        e(Segmented, { label: "How hard it thinks", value: p.effort, onChange: function (v) { if (v) p.setEffort(v); },
          options: [{ value: "low", label: "Quick", title: "Quicker, for small edits" }, { value: "high", label: "Careful", title: "Thinks it through, for pages and redesigns" }] }),
        e("span", { className: "bd-as-sp" }),
        p.busy && p.draft.trim() ? e("button", { type: "button", className: "bd-as-send", "aria-label": "Add the note", onClick: send }, e(Icon, { name: "up" }))
          : p.busy ? e("button", { type: "button", className: "bd-as-send", "aria-label": "Stop", onClick: p.stop }, e(Icon, { name: "close" }))
          : e("button", { type: "button", className: "bd-as-send", "aria-label": "Send", disabled: !p.draft.trim(), onClick: send }, e(Icon, { name: "up" })))));
}

export { AssistantPanel };
