# MessageBubble

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [MessageBubble.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/MessageBubble.jsx), [MessageBubble.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/MessageBubble.d.ts), [MessageBubble.md](https://graham-goebel.github.io/Dovetail/system/components/chat/MessageBubble.md).

Live page: https://graham-goebel.github.io/Dovetail/components/MessageBubble.html

## Guidelines

One message in a conversation: sent on the right in the action colours, received on the left in a quiet surface, with its time, delivery status and, in groups, its author.

### Use it when
- You show a message in a `MessageList`: a person's, a support agent's or an assistant's.

### Don't use it when
- It is a system event such as "Maya joined". Use `MessageDivider`.
- It is a comment thread or a review. Use `Card` or `List`; bubbles say "conversation", with its left and right sides.

### Example
```jsx
<MessageBubble from="them" time="9:38">Are we still on for 11?</MessageBubble>
<MessageBubble from="me" time="9:39" status="read">Yes, see you at the gate.</MessageBubble>

{/* A run from one author */}
<MessageBubble from="them" author={{ name: "Maya Chen" }} grouped="first">Draft's in the folder.</MessageBubble>
<MessageBubble from="them" author={{ name: "Maya Chen" }} grouped="last" time="14:20">Comments by Thursday.</MessageBubble>

{/* Failed */}
<MessageBubble from="me" time="14:24" status="failed" onRetry={() => resend(id)}>Running late</MessageBubble>
```

### Variants
| prop | values | what it does |
| --- | --- | --- |
| `from` | `me`, `them` | `me` sits right in `--dt-bubble-sent-*` (the action surface, so it follows the ink-or-brand choice in Configure); `them` sits left in `--dt-bubble-received-*`. |
| `grouped` | `single` (default), `first`, `middle`, `last` | Position in a run of consecutive messages from one author. The corners where two bubbles meet tighten to `--dt-bubble-radius-tight` and the gap closes to `--dt-bubble-gap`; a new run starts `--dt-bubble-run-gap` below the last. |
| `status` | `sending`, `sent`, `delivered`, `read`, `failed` | Sent messages only; ignored for `them`. A clock, one tick, two ticks, two ticks in `--dt-bubble-read-fg`, or "Not sent" in `--dt-bubble-failed-fg`. |
| `onRetry` | function | With `failed`, adds a Retry button next to "Not sent". |
| `author` | `{ name, src? }` | Received messages in a group chat. The avatar sits beside the first bubble of a run and the name above it; later bubbles keep the avatar's gutter so the run lines up. |
| `time` | string | Preformatted by your app, e.g. "9:41". Shown under the bubble. |

The bubble is at most about three quarters of the list's width. Text keeps its newlines and wraps, and a long word or URL breaks rather than pushing the bubble off the screen.

### Composition
Inside `MessageList`. `children` is the message: text, or inline content such as a `Link`. Work out `grouped` in your app from consecutive messages by one author (usually within a few minutes), and put `time` and `status` on the last bubble of a run rather than on each. Uses `Avatar` for authors.

### Tokens
Exposes (Tier 3, `tokens/component/chat.css`): `--dt-bubble-sent-bg`, `--dt-bubble-sent-fg`, `--dt-bubble-received-bg`, `--dt-bubble-received-fg`, `--dt-bubble-meta-fg`, `--dt-bubble-author-fg`, `--dt-bubble-read-fg`, `--dt-bubble-failed-fg`, `--dt-bubble-radius`, `--dt-bubble-radius-tight`, `--dt-bubble-padding`, `--dt-bubble-gap` and `--dt-bubble-run-gap`. They alias `--dt-surface-action`, `--dt-text-on-action`, `--dt-surface-sunken` (`--dt-surface-overlay` under `.dark`, where sunken is darker than the page), the text roles, `--dt-radius-container`, `--dt-radius-control` and the space roles. Colour aliases are repeated under `.dark`. The retry button reads `--dt-text-link`.

### Accessibility
- Status is never an icon alone: each icon has visually hidden text ("Sending", "Sent", "Delivered", "Read"), and a failed message says "Not sent" in visible text.
- Retry is a real `<button>`, reachable with Tab.
- In a group, the author's name is visible text above the first bubble of a run and visually hidden text before the others, so a message announced on its own by the log still says who wrote it. The avatar is hidden, since the name is already read.
- Sent and received are told apart by position and colour, and by the author name in groups. Both colour pairs are the system's contrast-checked role pairs.

### Content
- The message is whatever the person wrote. Don't truncate it.
- Times: your app's locale format, short ("9:41", "Yesterday 16:02"). The bubble never formats dates itself.

## Props

```ts
import * as React from "react";

/** Who wrote a received message, for group conversations. */
export interface MessageAuthor {
  /** Shown above the first bubble of a run, and read before the others. */
  name: string;
  /** Avatar image URL. Initials are used without it. */
  src?: string;
}

/** One message: sent on the right in the action colours, received on the left in a quiet surface (sunken, or overlay in dark). */
export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whose message it is. Sets alignment and colours. */
  from: "me" | "them";
  /** The message: text, or content such as a link. Newlines are kept and long words and URLs wrap. */
  children?: React.ReactNode;
  /** Preformatted time, e.g. "9:41". Shown under the bubble. */
  time?: string;
  /** Delivery state of a sent message; ignored when `from` is "them". An icon with a text alternative; failed shows "Not sent". */
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  /** With status "failed", shows a Retry button that calls this. */
  onRetry?: () => void;
  /** For received messages in a group: avatar beside the first bubble of a run, name above it. */
  author?: MessageAuthor;
  /** Position in a run of messages from one author. Tightens the corners and the gap where bubbles meet. @default "single" */
  grouped?: "first" | "middle" | "last" | "single";
}

export declare function MessageBubble(props: MessageBubbleProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-bubble-author-fg` | component | `var(--dt-text-secondary)` |
| `--dt-bubble-failed-fg` | component | `var(--dt-text-danger)` |
| `--dt-bubble-gap` | component | `var(--dt-space-stack-2xs)` |
| `--dt-bubble-meta-fg` | component | `var(--dt-text-tertiary)` |
| `--dt-bubble-padding` | component | `var(--dt-space-inset-xs) var(--dt-space-inset-sm)` |
| `--dt-bubble-radius` | component | `var(--dt-radius-container)` |
| `--dt-bubble-radius-tight` | component | `calc(var(--dt-radius-control) / 2)` |
| `--dt-bubble-read-fg` | component | `var(--dt-text-link)` |
| `--dt-bubble-received-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-bubble-received-fg` | component | `var(--dt-text-primary)` |
| `--dt-bubble-run-gap` | component | `var(--dt-space-stack-sm)` |
| `--dt-bubble-sent-bg` | component | `var(--dt-surface-action)` |
| `--dt-bubble-sent-fg` | component | `var(--dt-text-on-action)` |
| `--dt-size-avatar-sm` | semantic | `var(--dt-dim-6)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";
import { Avatar } from "../display/Avatar.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* One message. Sent ("me") bubbles sit on the right in the action colours,
   received ("them") on the left in the sunken surface. Consecutive messages
   from one author form a run: the corners where they meet tighten and the
   gap between them closes, the shape every messenger uses. Status, time and
   author are props; delivery itself is the app's business. */

const R = "var(--dt-bubble-radius)";
const T = "var(--dt-bubble-radius-tight)";

/* Corners, clockwise from top left, for a bubble on the right. A bubble on
   the left mirrors them. */
const CORNERS = {
  single: [R, R, R, R],
  first: [R, R, T, R],
  middle: [R, T, T, R],
  last: [R, T, R, R],
};

const ICONS = {
  sending: ["M12 7.5V12l3 2", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
  sent: ["m5 12.5 4.5 4.5L19 7.5"],
  delivered: ["m2.5 12.5 4.5 4.5 9.5-9.5", "m12 16 1 1 9.5-9.5"],
  read: ["m2.5 12.5 4.5 4.5 9.5-9.5", "m12 16 1 1 9.5-9.5"],
  failed: ["M12 8v4.5", "M12 16h.01", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
};

const STATUS_TEXT = { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Not sent" };

function StatusIcon({ status }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", display: "block", flex: "none" }}>
      {ICONS[status].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export function MessageBubble({ from, children, time, status, onRetry, author, grouped = "single", style, ...rest }) {
  const mine = from === "me";
  const shape = CORNERS[grouped] ? grouped : "single";
  const [tl, tr, br, bl] = CORNERS[shape];
  const radius = mine ? `${tl} ${tr} ${br} ${bl}` : `${tr} ${tl} ${bl} ${br}`;
  const opensRun = shape === "single" || shape === "first";
  const showStatus = mine && STATUS_TEXT[status];
  const failed = showStatus && status === "failed";
  const withAuthor = !mine && author;

  const bubble = (
    <div style={{
      maxWidth: "100%", minWidth: 0,
      padding: "var(--dt-bubble-padding)",
      borderRadius: radius,
      background: mine ? "var(--dt-bubble-sent-bg)" : "var(--dt-bubble-received-bg)",
      color: mine ? "var(--dt-bubble-sent-fg)" : "var(--dt-bubble-received-fg)",
      fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
      lineHeight: "var(--dt-text-body-sm-line)", letterSpacing: "var(--dt-text-body-sm-tracking)",
      /* Newlines from the composer survive; a long word or URL breaks rather
         than pushing the bubble past the edge. */
      whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word",
    }}>
      {withAuthor && !opensRun && <VisuallyHidden>{author.name}: </VisuallyHidden>}
      {children}
    </div>
  );

  const meta = (time || showStatus) && (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)",
      marginTop: "var(--dt-space-stack-2xs)",
      fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
      lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-bubble-meta-fg)",
      justifyContent: mine ? "flex-end" : "flex-start",
    }}>
      {time && <span>{time}</span>}
      {showStatus && !failed && (
        <span style={{ display: "inline-flex", color: status === "read" ? "var(--dt-bubble-read-fg)" : undefined }}>
          <StatusIcon status={status} />
          <VisuallyHidden>{STATUS_TEXT[status]}</VisuallyHidden>
        </span>
      )}
      {failed && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", color: "var(--dt-bubble-failed-fg)" }}>
          <StatusIcon status="failed" />
          {STATUS_TEXT.failed}
        </span>
      )}
      {failed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            appearance: "none", background: "none", border: 0, padding: 0, margin: 0, cursor: "pointer",
            fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit",
            fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-link)",
            textDecoration: "underline", textUnderlineOffset: "0.2em",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );

  const column = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start",
      /* About three quarters of the list, so a reply never spans edge to edge
         and sent and received stay easy to tell apart. A proportion, not a size. */
      maxWidth: "75%", minWidth: 0,
    }}>
      {withAuthor && opensRun && (
        <span style={{
          marginBottom: "var(--dt-space-stack-2xs)", paddingInline: "var(--dt-space-inset-sm)",
          fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
          lineHeight: "var(--dt-text-label-sm-line)", fontWeight: "var(--dt-font-weight-medium)",
          color: "var(--dt-bubble-author-fg)",
        }}>{author.name}</span>
      )}
      {bubble}
      {meta}
    </div>
  );

  return (
    <div
      style={{
        display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-start",
        gap: withAuthor ? "var(--dt-space-inline-xs)" : undefined,
        marginTop: opensRun ? "var(--dt-bubble-run-gap)" : "var(--dt-bubble-gap)",
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {withAuthor && (
        /* The gutter is kept on every bubble of the run so they line up; the
           avatar shows beside the first. Its name is already read above. */
        <span aria-hidden="true" style={{ flex: "none", width: "var(--dt-size-avatar-sm)", display: "inline-flex" }}>
          {opensRun && <Avatar name={author.name} src={author.src} size="sm" />}
        </span>
      )}
      {column}
    </div>
  );
}
```
