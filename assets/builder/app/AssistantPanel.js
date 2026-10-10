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
import { mdBlocks, mdInline } from "../model/markdown.js";
import { shortCount, threadUsage, totalOf, usageDetail, usageLabel } from "../model/tokens.js";

/* What a reply used, in tokens: an estimate of what's being sent while it
   works, the counts the model reported once it's done. */
function turnTokens(t) {
  if (!t.usage && !t.live) return null;
  var working = t.status === "working";
  return e("p", { className: "bd-as-tok", title: usageDetail(t.usage) || "An estimate of what's being sent" },
    e(Icon, { name: "bolt" }), usageLabel(t.usage, working ? t.live : 0) + (working ? " so far" : ""));
}
/* The conversation's total, at the foot of the thread. */
function threadTokens(thread) {
  var u = threadUsage(thread);
  if (!u) return null;
  return e("p", { className: "bd-as-total", title: usageDetail(u) },
    "This conversation: " + (u.estimated ? "≈ " : "") + shortCount(totalOf(u)) + " tokens over " + u.replies + (u.replies === 1 ? " reply" : " replies") + (u.cacheRead ? ", " + Math.round((u.cacheRead / Math.max(1, totalOf(u))) * 100) + "% from the cache" : ""));
}

/* A reply's words, drawn from Markdown as React elements: nothing in a
   reply becomes markup. */
function inline(text) {
  return mdInline(text).map(function (r, i) {
    if (r.t === "b") return e("strong", { key: i }, r.text);
    if (r.t === "i") return e("em", { key: i }, r.text);
    if (r.t === "code") return e("code", { key: i }, r.text);
    if (r.t === "a") return e("a", { key: i, href: r.href, target: "_blank", rel: "noopener noreferrer" }, r.text);
    if (r.t === "br") return e("br", { key: i });
    return r.text;
  });
}
function Markdown(p) {
  return e("div", { className: cx("bd-md", p.className) }, mdBlocks(p.text).map(function (b, i) {
    if (b.type === "h") return e("p", { key: i, className: "bd-md-h is-h" + b.level, role: "heading", "aria-level": b.level + 2 }, inline(b.text));
    if (b.type === "ul") return e("ul", { key: i }, b.items.map(function (it, k) { return e("li", { key: k }, inline(it)); }));
    if (b.type === "ol") return e("ol", { key: i, start: b.start }, b.items.map(function (it, k) { return e("li", { key: k }, inline(it)); }));
    if (b.type === "quote") return e("blockquote", { key: i }, inline(b.text));
    if (b.type === "code") return e("pre", { key: i }, e("code", null, b.lines.join("\n")));
    return e("p", { key: i }, inline(b.text));
  }));
}

/* What a reply did, folded into one row that says what it's doing now (or
   how many steps it took), and opens to every step. */
function Activity(p) {
  var steps = p.steps;
  if (!steps.length) return null;
  var acts = steps.filter(function (s) { return !s.note; });
  var failed = acts.filter(function (s) { return !s.ok && !s.running; }).length;
  var running = steps.some(function (s) { return s.running; }) || p.working;
  var latest = steps[steps.length - 1];
  var shot = steps.filter(function (s) { return s.shot; }).slice(-1)[0];
  var head = running ? latest.text : acts.length + (acts.length === 1 ? " step" : " steps") + (failed ? ", " + failed + " didn't work" : "");
  var icon = running ? null : failed ? "alert" : "check";
  return e("div", { className: cx("bd-as-act", p.open && "is-open", running && "is-running", failed && !running && "has-failed") },
    e("button", { type: "button", className: "bd-as-act-h", "aria-expanded": !!p.open, onClick: p.onToggle, title: p.open ? "Hide the steps" : "Show every step" },
      e("span", { className: "bd-as-act-i", "aria-hidden": "true" }, icon ? e(Icon, { name: icon }) : e("span", { className: "bd-as-spin" })),
      e("span", { className: cx("bd-as-act-t", running && latest.note && "is-note") }, head),
      shot && !p.open ? e("img", { className: "bd-as-act-shot", src: shot.shot, alt: "" }) : null,
      running && acts.length > 1 ? e("span", { className: "bd-as-act-n" }, acts.length) : null,
      e("span", { className: "bd-as-act-chev", "aria-hidden": "true" }, e(Icon, { name: "down" }))),
    p.open ? e("ol", { className: "bd-as-act-list" }, steps.map(function (s, i) {
      if (s.note) return e("li", { key: s.id || i, className: "bd-as-note-step" }, s.text);
      return e("li", { key: s.id || i, className: cx("bd-as-step", !s.ok && !s.running && "is-failed", s.running && "is-running") },
        e("span", { className: "bd-as-ok", "aria-hidden": "true" }, s.running ? e("span", { className: "bd-as-spin" }) : e(Icon, { name: !s.ok ? "close" : s.icon || "check" })),
        e("span", { className: "bd-as-step-t" }, s.text),
        s.shot ? e("img", { className: "bd-as-step-shot", src: s.shot, alt: "" }) : null);
    })) : null);
}

function changeCard(p, turn) {
  if (!turn.changes.length) return null;
  /* Folded once there are more than a few, so the thread stays short; the
     checks that need something stay in view either way. */
  var open = p.isOpen(turn.id + ":changes", turn.changes.length <= 3);
  var bad = (turn.checks || []).filter(function (r) { return r.status === "fail" || r.status === "warn"; });
  var passed = (turn.checks || []).filter(function (r) { return r.status === "pass"; }).length;
  var shownChecks = open ? turn.checks : bad;
  return e("div", { className: cx("bd-as-card bd-as-changes", open && "is-open") },
    e("button", { type: "button", className: "bd-as-card-h bd-as-fold", "aria-expanded": open, onClick: function () { p.toggle(turn.id + ":changes", !open); }, title: open ? "Fold the changes" : "Show each change and check" },
      e("span", null, turn.changes.length + (turn.changes.length === 1 ? " change" : " changes")),
      e("span", { className: "bd-as-fold-r" },
        turn.kept ? e("span", { className: "bd-as-note" }, "Kept") : turn.undone ? e("span", { className: "bd-as-note" }, "Undone")
          : turn.checking ? e("span", { className: "bd-as-note" }, "Checking…")
          : turn.checks && !open ? e("span", { className: cx("bd-as-note", bad.length && "is-warn") }, bad.length ? bad.length + " to look at" : passed + " checks pass") : null,
        e("span", { className: "bd-as-act-chev", "aria-hidden": "true" }, e(Icon, { name: "down" })))),
    (open ? turn.changes : []).map(function (c, i) {
      var can = turn.status === "done" && !turn.kept && !turn.undone && !c.undone && !p.busy;
      return e("div", { key: i, className: cx("bd-as-row", c.undone && "is-undone") },
        e("span", { className: "bd-as-n" }, c.label),
        e("span", { className: "bd-as-v" }, c.value, c.on ? e("span", { className: "bd-as-on" }, " · " + c.on) : null),
        can ? e("button", { type: "button", className: "bd-act bd-act-ghost bd-as-row-undo", title: "Undo this and the changes after it", "aria-label": "Undo " + c.label + " and the changes after it", onClick: function () { p.undoFrom(turn.id, i); } }, e(Icon, { name: "undo" })) : null);
    }),
    turn.undone ? null : turn.checking ? (open ? e("div", { className: "bd-as-checks" }, e("div", { className: "bd-as-checks-h" }, e("span", null, "Checks"), e("span", { className: "bd-as-note" }, "Checking…"))) : null)
      : turn.checks && shownChecks.length ? e("div", { className: "bd-as-checks" },
        open ? e("div", { className: "bd-as-checks-h" }, e("span", null, "Checks"), e("span", { className: "bd-as-note" }, "ran after the last step")) : null,
        shownChecks.map(function (r) {
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
  /* Once answered it folds to its title; it opens again to reread. */
  var settled = pl.status !== "pending";
  var open = !settled || p.isOpen(turn.id + ":plan", false);
  var note = pl.status === "approved" ? e("span", { className: "bd-as-note" }, "Approved") : pl.status === "changing" ? e("span", { className: "bd-as-note" }, "Changing") : pl.frame ? e("span", { className: "bd-as-note" }, [pl.frame.preset, pl.frame.mode].filter(Boolean).join(" · ")) : null;
  var title = e("span", null, e(Icon, { name: "frame" }), pl.title);
  return e("div", { className: cx("bd-as-card bd-as-plan", open && "is-open") },
    settled ? e("button", { type: "button", className: "bd-as-card-h bd-as-fold", "aria-expanded": open, onClick: function () { p.toggle(turn.id + ":plan", !open); }, title: open ? "Fold the plan" : "Show the plan" },
      title, e("span", { className: "bd-as-fold-r" }, note, e("span", { className: "bd-as-act-chev", "aria-hidden": "true" }, e(Icon, { name: "down" }))))
      : e("div", { className: "bd-as-card-h" }, title, note),
    open ? e("ol", { className: "bd-as-plan-steps" }, pl.steps.map(function (st, i) {
      return e("li", { key: i }, e("b", null, st.title), st.detail ? e("span", null, st.detail) : null);
    })) : null,
    open && pl.notes && pl.notes.length ? e("div", { className: "bd-as-plan-notes" }, pl.notes.map(function (n, i) { return e("p", { key: i }, e(Icon, { name: "alert" }), e("span", null, n)); })) : null,
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
  var line = p.shareLine, byOther = line && line.by && p.me && line.by.id !== p.me.id;
  var canShare = !!(p.cloudFile && line && !byOther && !p.busy);
  var shareHelp = !p.cloudFile ? (p.cloudOn ? "Sign in, and this file goes to the cloud; then a conversation can be shared with everyone on it." : "Sharing needs the cloud connected. Conversations stay in this browser.")
    : !line ? "Say something first; then it can be shared with everyone on this file."
    : byOther ? "Shared by " + (line.by.name || "someone else") + "; only they can change that."
    : line.shared ? "Everyone on this file can read it and carry it on." : "Off, it's yours alone. On, everyone on this file can read it and carry it on.";
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
          e("span", null, p.canLive ? "On once you're signed in: each request goes to the model through the cloud, on the account's usage. Off, a script in this browser answers, free." : p.cloudOn ? "Sign in to send requests to the model. Until then a script in this browser answers." : "Needs the cloud connected. A script in this browser answers.")),
        p.cloudOn && !p.canLive ? e("button", { type: "button", className: "bd-as-mbtn bd-as-msign", onClick: function () { setOpen(false); p.signIn(); } }, e(Icon, { name: "user" }), "Sign in")
          : e(Switch, { value: p.mode === "live", onChange: function (v) { p.setMode(v ? "live" : "practice"); }, labelledBy: "bd-as-m-live", disabled: !p.canLive })),
      e("hr"),
      row("bd-as-m-plan", "Plan before big changes", "New pages, or more than about 10 layers. Small edits just happen.", p.plans, p.setPlans),
      row("bd-as-m-look", "Look at the canvas", "Sends a picture of what it built so it can check and fix it. Off keeps this file's canvas private.", p.look, p.setLook),
      e("p", { className: "bd-as-mnote" }, "Checks run after every change."),
      e("hr"),
      /* Sharing: the starter of a saved conversation on a cloud file. */
      e("div", { className: cx("bd-as-mrow", !canShare && "is-off") },
        e("span", { className: "bd-as-mrow-t" }, e("b", { id: "bd-as-m-share" }, "Share in this file"), e("span", null, shareHelp)),
        e(Switch, { value: !!(line && line.shared), onChange: function (v) { p.setShared(v); }, labelledBy: "bd-as-m-share", disabled: !canShare })),
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
      x.by && p.me && x.by.id !== p.me.id ? null
        : e("button", { type: "button", className: "bd-act bd-act-ghost bd-as-tr-del", "aria-label": "Delete " + x.title, title: "Delete", onClick: function () { p.removeThread(x.id); }, disabled: p.busy }, e(Icon, { name: "trash" })));
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
  /* What's unfolded in the thread: a reply's steps, its changes. */
  var foldState = useState({});
  var folds = foldState[0];
  var isOpen = function (key, dflt) { return Object.prototype.hasOwnProperty.call(folds, key) ? folds[key] : dflt; };
  var toggle = function (key, v) { foldState[1](function (f) { var n = Object.assign({}, f); n[key] = v; return n; }); };
  var cp = Object.assign({}, p, { isOpen: isOpen, toggle: toggle });
  /* The thread follows what's new at its foot: text, steps, the change card, its checks. */
  var last = p.thread[p.thread.length - 1];
  var tail = last ? [p.thread.length, last.text, (last.steps || []).length, (last.changes || []).length, last.checking ? 1 : 0, last.checks ? last.checks.length : 0, last.status].join("|") : "";
  useEffect(function () { var el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [tail]);
  var send = function () { var t = p.draft.trim(); var pics = (p.pics || []).length; if (!t && !pics) return; if (p.busy) { if (t) p.note(t); } else p.send(t); };
  var fileRef = useRef(null);
  var dropState = useState(false), dragOver = dropState[0], setDragOver = dropState[1];
  var hasFiles = function (ev) { var ty = ev.dataTransfer && ev.dataTransfer.types; return !!ty && Array.prototype.indexOf.call(ty, "Files") >= 0; };
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
        var picsOf = function (t) {
          if (t.pics && t.pics.length) return e("div", { className: "bd-as-me-pics" }, t.pics.map(function (src, i) { return e("img", { key: i, src: src, alt: "Picture " + (i + 1) + " sent with this message" }); }));
          if (t.picCount) return e("span", { className: "bd-as-me-picnote" }, e(Icon, { name: "image" }), t.picCount === 1 ? "A picture was sent here" : t.picCount + " pictures were sent here");
          return null;
        };
        if (t.role === "user" && (t.pics || t.picCount) && !t.queued) return e("div", { key: t.id, className: "bd-as-me-wrap" }, senderOf(t, p.me) ? e("span", { className: "bd-as-from" }, senderOf(t, p.me)) : null, picsOf(t), e("div", { className: "bd-as-me" }, t.text));
        if (t.role === "user") return t.queued ? e("div", { key: t.id, className: "bd-as-me-wrap" }, e("div", { className: "bd-as-me is-queued" }, t.text), e("span", { className: "bd-as-queued" }, e(Icon, { name: "chat" }), "Lands after this step"))
          : senderOf(t, p.me) ? e("div", { key: t.id, className: "bd-as-me-wrap" }, e("span", { className: "bd-as-from" }, senderOf(t, p.me)), e("div", { className: "bd-as-me" }, t.text))
          : e("div", { key: t.id, className: "bd-as-me" }, t.text);
        return e("div", { key: t.id, className: cx("bd-as-bot", t.status === "error" && "is-error") },
          e(Activity, { steps: t.steps || [], working: t.status === "working" && !t.text, open: isOpen(t.id + ":steps", false), onToggle: function () { toggle(t.id + ":steps", !isOpen(t.id + ":steps", false)); } }),
          t.text ? e(Markdown, { className: "bd-as-text", text: t.text }) : t.status === "working" && !(t.steps || []).length ? e("p", { className: "bd-as-text bd-as-wait" }, "Working…") : null,
          planCard(cp, t),
          askCard(p, t),
          variantsCard(p, t),
          t.error ? e("p", { className: "bd-as-text bd-as-err" }, t.error) : null,
          changeCard(cp, t),
          turnTokens(t));
      }),
      threadTokens(p.thread)),
    p.edits && p.view !== "list" ? e("div", { className: "bd-as-edits is-pending" },
      e("div", { className: "bd-as-edits-h" }, e(Icon, { name: "cursor" }), e("b", null, "You changed " + p.edits.count + (p.edits.count === 1 ? " thing" : " things") + " since its last reply"),
        e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Don't send these changes", title: "Don't send these changes", onClick: p.dropEdits }, e(Icon, { name: "close" }))),
      editLines(p.edits.lines, p.edits.count, 3),
      e("p", { className: "bd-as-edits-n" }, "Sent with your next message, so it builds on them.")) : null,
    p.view === "list" ? null : e("div", { className: cx("bd-as-comp", dragOver && "is-drop"),
      onDragOver: function (ev) { if (hasFiles(ev)) { ev.preventDefault(); if (!dragOver) setDragOver(true); } },
      onDragLeave: function (ev) { if (!ev.currentTarget.contains(ev.relatedTarget)) setDragOver(false); },
      onDrop: function (ev) { if (!hasFiles(ev)) return; ev.preventDefault(); setDragOver(false); p.addPictures(ev.dataTransfer.files); } },
      (p.pics || []).length ? e("div", { className: "bd-as-pics", role: "list", "aria-label": "Pictures to send" }, p.pics.map(function (pc) {
        return e("span", { key: pc.id, className: "bd-as-pic", role: "listitem" },
          e("img", { src: pc.thumb, alt: pc.name }),
          e("button", { type: "button", className: "bd-as-pic-x", "aria-label": "Leave out " + pc.name, title: "Leave out " + pc.name, onClick: function () { p.dropPicture(pc.id); } }, e(Icon, { name: "close" })));
      })) : null,
      e("div", { className: "bd-as-chips" },
        p.target ? e("span", { className: cx("bd-as-chip is-target", !p.includeSel && "is-off") },
          e(Icon, { name: "frame" }), p.target,
          e("button", { type: "button", "aria-label": p.includeSel ? "Don't send the selection" : "Send the selection", onClick: p.toggleSel }, p.includeSel ? "×" : "+")) : null,
        p.docs.map(function (d) {
          return e("span", { key: d.id, className: "bd-as-chip" }, e(Icon, { name: "file" }), d.title,
            e("button", { type: "button", "aria-label": "Leave out " + d.title, onClick: function () { p.dropDoc(d.id); } }, "×"));
        }),
        p.skills.map(function (s) { return e("span", { key: s.id, className: "bd-as-chip is-skill", title: s.description }, e(Icon, { name: "bolt" }), s.name); })),
      e("textarea", { className: "bd-as-input", rows: 2, value: p.draft, placeholder: p.waiting ? "Answer the question, or pick an option…" : p.busy ? "Add a note while it works…" : (p.pics || []).length ? "Say what to build from the picture, or send it as it is…" : "Ask for a change, describe a new page, or paste a picture…", "aria-label": p.busy ? "Add a note for the assistant" : "Message the assistant",
        onChange: function (ev) { p.setDraft(ev.target.value); },
        onKeyDown: function (ev) { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); send(); } },
        onPaste: function (ev) { var cd = ev.clipboardData; if (cd && cd.files && cd.files.length && p.addPictures(cd.files)) ev.preventDefault(); } }),
      e("input", { ref: fileRef, type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", multiple: true, hidden: true, tabIndex: -1, "aria-hidden": "true",
        onChange: function (ev) { p.addPictures(ev.target.files); ev.target.value = ""; } }),
      e("div", { className: "bd-as-bar" },
        e(Segmented, { label: "What it may change", value: p.reach, onChange: function (v) { if (v) p.setReach(v); },
          options: [{ value: "selection", label: "Selection" }, { value: "page", label: "Page" }] }),
        e(Segmented, { label: "How hard it thinks", value: p.effort, onChange: function (v) { if (v) p.setEffort(v); },
          options: [{ value: "low", label: "Quick", title: "Quicker, for small edits" }, { value: "high", label: "Careful", title: "Thinks it through, for pages and redesigns" }] }),
        e("span", { className: "bd-as-sp" }),
        e("button", { type: "button", className: "bd-act bd-act-ghost bd-as-attach", "aria-label": "Attach a picture", title: "Attach a picture to build from (or paste or drop one)", disabled: (p.pics || []).length >= 3, onClick: function () { if (fileRef.current) fileRef.current.click(); } }, e(Icon, { name: "image" })),
        p.busy && p.draft.trim() ? e("button", { type: "button", className: "bd-as-send", "aria-label": "Add the note", onClick: send }, e(Icon, { name: "up" }))
          : p.busy ? e("button", { type: "button", className: "bd-as-send", "aria-label": "Stop", onClick: p.stop }, e(Icon, { name: "close" }))
          : e("button", { type: "button", className: "bd-as-send", "aria-label": "Send", disabled: !p.draft.trim() && !(p.pics || []).length, onClick: send }, e(Icon, { name: "up" })))));
}

export { AssistantPanel };
