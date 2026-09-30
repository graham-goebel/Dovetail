# MessageDivider

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [MessageList.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/MessageList.jsx), [MessageList.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/MessageList.d.ts), [MessageList.md](https://graham-goebel.github.io/Dovetail/system/components/chat/MessageList.md).

Live page: https://graham-goebel.github.io/Dovetail/components/MessageDivider.html

## Guidelines

The scrolling log of a conversation, kept pinned to the newest message unless the reader has scrolled up to read history. `MessageDivider`, exported from the same file, labels days and events across it.

### Use it when
- You show a conversation: bubbles, dividers, a typing indicator, quick replies.
- New messages arrive while the conversation is open and the view should follow them.

### Don't use it when
- It is a feed of records or notifications. Use `List`; a log announces every addition.
- It is a single message or a quote. Use `MessageBubble` on its own, or `Quote`.

### Example
```jsx
<div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
  <ChatHeader title="Maya Chen" presence="online" avatar={{ name: "Maya Chen" }} />
  <MessageList label="Conversation with Maya Chen" style={{ flex: 1 }}>
    <MessageDivider>Today</MessageDivider>
    {messages.map((m) => (
      <MessageBubble key={m.id} from={m.mine ? "me" : "them"} time={m.time} status={m.status} grouped={m.grouped}>
        {m.text}
      </MessageBubble>
    ))}
    {typing && <TypingIndicator name="Maya" />}
  </MessageList>
  <Composer label="Message Maya Chen" value={draft} onChange={setDraft} onSend={send} />
</div>
```

### Behaviour
- **Pinned.** On mount, and whenever children change or the content changes size (an image loads, a bubble grows), the list scrolls to the bottom, as long as the reader is already there.
- **Scrolled up.** If the reader has scrolled away from the bottom, new content leaves them where they are and a "New messages" button (a `Button`) appears at the bottom. It scrolls down (smoothly, unless reduced motion is set), and focus moves to the log so it is not lost when the button goes.
- **Short conversations** sit at the bottom of the list, next to the composer, not at the top.
- It never fetches, pages or reorders. Pass the conversation oldest first; load older history in your app and prepend it.

### MessageDivider
A centred label with a rule on each side: `<MessageDivider>Today</MessageDivider>`, `<MessageDivider>Conversation assigned to Maya</MessageDivider>`. Use it for days and for events that change the conversation (assigned, transferred, ended), not for every timestamp. `children` is the label; when it is not a plain string, pass `label` as its accessible name. Long labels wrap.

### Composition
The `flex: 1` middle of a column with `ChatHeader` above and `Composer` below, or any box with a bounded height. A list with no height bound never scrolls, so it has nothing to pin. Children are `MessageBubble`, `MessageDivider`, `TypingIndicator` and `QuickReplies`, which carry their own spacing: a run gap before each run and around dividers, a small gap inside a run.

### Tokens
Reads `--dt-chat-border` and `--dt-chat-divider-fg` for the divider, `--dt-bubble-run-gap` for the divider's margin, and `--dt-space-inset-sm` for the list's padding. The jump button is a `Button` and reads `--dt-button-*` and `--dt-elevation-2`. Exposes nothing of its own beyond the shared `--dt-chat-*` tokens.

### Accessibility
- The root is `role="log"` with `aria-live="polite"`, named by the required `label`. Screen readers announce messages as they are added, without interrupting. Don't wrap it in another live region.
- The log is focusable (`tabIndex={0}`), so keyboard users can scroll it with the arrow keys and Page Up and Page Down.
- The "New messages" button is a real button, reachable with Tab while it shows. Activating it moves focus to the log.
- `MessageDivider` is `role="separator"` named by its text, because a separator's content is not read on its own.
- The jump scrolls instantly under `prefers-reduced-motion: reduce`.

### Content
- `label`: who the conversation is with: "Conversation with Maya Chen", "Support chat".
- Divider labels: sentence case, no full stop. Days as "Today", "Yesterday", then a date; events in the past tense or as a state: "Conversation assigned to Maya", "Chat ended".

## Props

```ts
import * as React from "react";

/** The scrolling log of a conversation. Pinned to the newest message unless the reader has scrolled up, when it offers a "New messages" jump instead. */
export interface MessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible name of the log, e.g. "Conversation with Maya". Required. */
  label: string;
  /** The conversation, oldest first: MessageBubble, MessageDivider, TypingIndicator and QuickReplies. */
  children?: React.ReactNode;
}

/** A centred label across the log: a day, or an event such as a hand-off. */
export interface MessageDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The label, e.g. "Today" or "Conversation assigned to Maya". */
  children: React.ReactNode;
  /** Accessible name of the separator. Defaults to `children` when it is a string; set it when it is not. */
  label?: string;
}

export declare function MessageList(props: MessageListProps): React.JSX.Element;
export declare function MessageDivider(props: MessageDividerProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-bubble-run-gap` | component | `var(--dt-space-stack-sm)` |
| `--dt-chat-border` | component | `var(--dt-border-subtle)` |
| `--dt-chat-divider-fg` | component | `var(--dt-text-tertiary)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-2` | semantic | `var(--dt-shadow-raw-2)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";
import { Button } from "../actions/Button.jsx";

/* The scrolling log of a conversation. It stays pinned to the newest message
   as children arrive, unless the reader has scrolled up to read history; then
   it leaves them where they are and offers a jump back down. It never fetches
   or invents messages: the children are the conversation.

   Every DOM read happens in an effect, never during render, so the list
   server-renders as a plain log. */

/* How close to the bottom, in CSS pixels, still counts as at the bottom: a
   rounding allowance for fractional scroll positions, not a visual size. */
const SLACK = 8;

/* A layout effect in the browser, so a new message never paints one frame
   off the bottom; a plain effect on the server, where layout effects warn. */
const useIsoLayoutEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const DOWN = ["M12 4.5v15", "m6 13.5 6 6 6-6"];

export function MessageList({ label, children, style, ...rest }) {
  const scroller = React.useRef(null);
  const content = React.useRef(null);
  const pinned = React.useRef(true);
  const lastHeight = React.useRef(0);
  const [unseen, setUnseen] = React.useState(false);

  const toBottom = React.useCallback((smooth) => {
    const el = scroller.current;
    if (!el) return;
    const top = el.scrollHeight - el.clientHeight;
    if (smooth && el.scrollTo && !prefersReducedMotion()) el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
  }, []);

  /* Called whenever the content may have changed size: new children, an image
     that loaded, a bubble that grew. Pinned, follow it; scrolled up, say that
     something new is below. */
  const sync = React.useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const height = el.scrollHeight;
    const grew = height > lastHeight.current;
    lastHeight.current = height;
    if (pinned.current) toBottom(false);
    else if (grew) setUnseen(true);
  }, [toBottom]);

  useIsoLayoutEffect(() => {
    sync();
  }, [children, sync]);

  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !content.current) return undefined;
    const ro = new ResizeObserver(() => sync());
    ro.observe(content.current);
    return () => ro.disconnect();
  }, [sync]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SLACK;
    pinned.current = atBottom;
    if (atBottom && unseen) setUnseen(false);
    if (rest.onScroll) rest.onScroll(e);
  };

  const jump = () => {
    pinned.current = true;
    setUnseen(false);
    toBottom(true);
    /* The button is about to unmount; keep focus on the log rather than
       letting it fall back to the page. */
    if (scroller.current) scroller.current.focus({ preventScroll: true });
  };

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label={label}
      tabIndex={0}
      {...rest}
      ref={scroller}
      onScroll={onScroll}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        minHeight: 0, overflowY: "auto", overflowX: "hidden",
        overscrollBehavior: "contain",
        padding: "var(--dt-space-inset-sm)",
        ...style,
      }}
    >
      {/* margin-top: auto keeps a short conversation at the bottom, next to
          the composer, the way every messenger does. */}
      <div ref={content} style={{ display: "flex", flexDirection: "column", marginTop: "auto", minWidth: 0 }}>
        {children}
      </div>
      {unseen && (
        <div aria-live="off" style={{
          position: "sticky", bottom: "var(--dt-space-inset-xs)", height: 0, flex: "none",
          display: "flex", justifyContent: "center", alignItems: "flex-end", overflow: "visible",
        }}>
          <Button
            type="button"
            size="sm"
            onClick={jump}
            iconStart={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
                style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", display: "block" }}>
                {DOWN.map((d) => <path key={d} d={d} />)}
              </svg>
            }
            style={{ boxShadow: "var(--dt-elevation-2)", flex: "none" }}
          >
            New messages
          </Button>
        </div>
      )}
    </div>
  );
}

/* A centred label across the log: a day, or an event such as a hand-off.
   A separator's content is presentational, so the text is also its name. */
export function MessageDivider({ children, label, style, ...rest }) {
  const name = label || (typeof children === "string" ? children : undefined);
  const rule = { flex: "1 1 0", minWidth: 0, borderTop: "var(--dt-border-width-default) solid var(--dt-chat-border)" };
  return (
    <div
      role="separator"
      aria-label={name}
      style={{
        display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
        margin: "var(--dt-bubble-run-gap) 0",
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
        lineHeight: "var(--dt-text-label-sm-line)", fontWeight: "var(--dt-font-weight-medium)",
        color: "var(--dt-chat-divider-fg)",
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={rule} />
      <span style={{ flex: "0 1 auto", minWidth: 0, textAlign: "center", overflowWrap: "anywhere" }}>{children}</span>
      <span aria-hidden="true" style={rule} />
    </div>
  );
}
```
