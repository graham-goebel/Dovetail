/* The Assistant panel: a conversation about the canvas. Each reply shows
   what it read (and, when it looked, the picture it saw), what it changed (old token struck through, new beside it)
   and Keep or Undo all; the box at the foot carries what goes with the next
   message as chips (the selection, the docs, the skills), each removable.
   The App runs the conversation; this draws it. */

import { cx, e, useEffect, useRef } from "../config.js";
import { Icon } from "../ui/icons.js";
import { Segmented } from "../ui/parts.js";

function changeCard(p, turn) {
  if (!turn.changes.length) return null;
  return e("div", { className: "bd-as-card" },
    e("div", { className: "bd-as-card-h" }, e("span", null, turn.changes.length + (turn.changes.length === 1 ? " change" : " changes")),
      turn.kept ? e("span", { className: "bd-as-note" }, "Kept") : turn.undone ? e("span", { className: "bd-as-note" }, "Undone") : null),
    turn.changes.map(function (c, i) {
      return e("div", { key: i, className: "bd-as-row" },
        e("span", { className: "bd-as-n" }, c.label),
        e("span", { className: "bd-as-v" }, c.value, c.on ? e("span", { className: "bd-as-on" }, " · " + c.on) : null));
    }),
    !turn.kept && !turn.undone && turn.status === "done" ? e("div", { className: "bd-as-acts" },
      e("button", { type: "button", className: "bd-btn bd-btn-sm bd-btn-primary", onClick: function () { p.keep(turn.id); } }, e(Icon, { name: "check" }), "Keep"),
      e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.undoTurn(turn.id); } }, e(Icon, { name: "undo" }), "Undo all"),
      e("button", { type: "button", className: "bd-btn bd-btn-sm bd-as-retry", onClick: function () { p.retry(turn.id); } }, "Retry")) : null);
}

function AssistantPanel(p) {
  var listRef = useRef(null);
  useEffect(function () { var el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [p.thread.length, p.thread.length && p.thread[p.thread.length - 1].text]);
  var send = function () { var t = p.draft.trim(); if (t && !p.busy) p.send(t); };
  return e("div", { className: "bd-as" },
    e("div", { className: "bd-as-head" },
      e("span", { className: "bd-as-title" }, "Assistant"),
      p.mode === "practice" ? e("span", { className: "bd-as-badge", title: "Answers come from a script in this browser; nothing is sent or charged" }, "Practice") : null,
      e("button", { type: "button", className: "bd-act bd-act-ghost", title: "New conversation", "aria-label": "New conversation", onClick: p.clear, disabled: !p.thread.length || p.busy }, e(Icon, { name: "plus" }))),
    e("div", { className: "bd-as-thread", ref: listRef, "aria-live": "polite" },
      !p.thread.length ? e("div", { className: "bd-as-empty" },
        e("p", null, "Ask for a change to what's selected, or describe a section to add. It works with the design system's tokens and components only."),
        e("div", { className: "bd-as-sugg" }, p.suggestions.map(function (s) { return e("button", { key: s, type: "button", onClick: function () { p.send(s); }, disabled: p.busy }, s); }))) : null,
      p.thread.map(function (t) {
        if (t.role === "user") return e("div", { key: t.id, className: "bd-as-me" }, t.text);
        return e("div", { key: t.id, className: cx("bd-as-bot", t.status === "error" && "is-error") },
          t.steps.map(function (s, i) {
            if (s.note) return e("p", { key: i, className: "bd-as-note-step" }, s.text);
            if (s.shot) return e("div", { key: i, className: "bd-as-look" }, e("img", { src: s.shot, alt: "" }), e("span", null, e(Icon, { name: "eye" }), s.text));
            return e("div", { key: i, className: cx("bd-as-step", !s.ok && "is-failed") }, e("span", { className: "bd-as-ok" }, e(Icon, { name: s.ok ? "check" : "close" })), s.text);
          }),
          t.text ? e("p", { className: "bd-as-text" }, t.text) : t.status === "working" ? e("p", { className: "bd-as-text bd-as-wait" }, "Working…") : null,
          t.error ? e("p", { className: "bd-as-text bd-as-err" }, t.error) : null,
          changeCard(p, t));
      })),
    e("div", { className: "bd-as-comp" },
      e("div", { className: "bd-as-chips" },
        p.target ? e("span", { className: cx("bd-as-chip is-target", !p.includeSel && "is-off") },
          e(Icon, { name: "frame" }), p.target,
          e("button", { type: "button", "aria-label": p.includeSel ? "Don't send the selection" : "Send the selection", onClick: p.toggleSel }, p.includeSel ? "×" : "+")) : null,
        p.docs.map(function (d) {
          return e("span", { key: d.id, className: "bd-as-chip" }, e(Icon, { name: "file" }), d.title,
            e("button", { type: "button", "aria-label": "Leave out " + d.title, onClick: function () { p.dropDoc(d.id); } }, "×"));
        }),
        p.skills.map(function (s) { return e("span", { key: s.id, className: "bd-as-chip is-skill", title: s.description }, e(Icon, { name: "bolt" }), s.name); })),
      e("textarea", { className: "bd-as-input", rows: 2, value: p.draft, placeholder: "Ask for a change, or describe a new section…", "aria-label": "Message the assistant",
        onChange: function (ev) { p.setDraft(ev.target.value); },
        onKeyDown: function (ev) { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); send(); } } }),
      e("div", { className: "bd-as-bar" },
        e(Segmented, { label: "What it may change", value: p.reach, onChange: function (v) { if (v) p.setReach(v); },
          options: [{ value: "selection", label: "Selection" }, { value: "page", label: "Page" }] }),
        e("span", { className: "bd-as-sp" }),
        p.busy ? e("button", { type: "button", className: "bd-as-send", "aria-label": "Stop", onClick: p.stop }, e(Icon, { name: "close" }))
          : e("button", { type: "button", className: "bd-as-send", "aria-label": "Send", disabled: !p.draft.trim(), onClick: send }, e(Icon, { name: "up" })))));
}

export { AssistantPanel };
