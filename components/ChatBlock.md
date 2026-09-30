# ChatBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [ChatBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/ChatBlock.jsx), [ChatBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/ChatBlock.d.ts), [ChatBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/ChatBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ChatBlock.html

## Guidelines

A whole conversation from data. Pass the messages as an array and the block draws the header, a scrolling log with day dividers, events and runs worked out for you, typing, quick replies and the composer, in one fixed-height panel.

### Use it when
- A screen or a panel is one conversation: customer support, a team thread, an in-app assistant.
- You have the conversation as data and don't want to work out runs, dividers and group names by hand.

### Don't use it when
- You need something the block doesn't draw, such as reactions or a thread per message. Compose `ChatHeader`, `MessageList`, `MessageBubble` and `Composer` yourself.
- It is one message or a quote on a marketing page. Use `MessageBubble` or `Quote`.
- It is a feed of notifications. Use `List`.

### Example
```jsx
const [messages, setMessages] = useState(initial);
const [draft, setDraft] = useState("");

<ChatBlock
  title="Maya Chen"
  subtitle="Customer support"
  avatar={{ name: "Maya Chen" }}
  presence="online"
  messages={[
    { id: "d1", from: "them", day: "Yesterday", text: "Hi, how can I help?", time: "16:02" },
    { id: "e1", kind: "event", text: "Maya joined the conversation" },
    { id: "m2", from: "me", day: "Today", text: "Where is my order?", time: "9:40", status: "read" },
    { id: "m3", from: "them", content: <OrderStatus label="Order 4821 progress" current="shipped" steps={steps} />, time: "9:41" },
  ]}
  typing="Maya"
  quickReplies={{ options: [{ id: "track", label: "Track my order" }], onSelect: pick }}
  composer={{ value: draft, onChange: setDraft, onSend: send, placeholder: "Write a message" }}
  onRetry={resend}
/>
```

### What it works out
- **Runs.** Consecutive messages from the same side (and, for `them`, the same `author`) form a run and get `grouped` first, middle and last, so the corners tighten where they meet. A day divider or an event ends a run. The value is also on each bubble as `data-grouped`.
- **Days.** `day` on an item inserts a `MessageDivider` before it when it differs from the last `day` given. Set it on every message or only on the first of each day; the result is one divider per change.
- **Events.** An item `{ id, kind: "event", text }` in `messages` is a divider across the log ("Maya joined the conversation"). Events live in the same array as messages so their order is never in doubt.
- **Group chats.** When more than one `author` answers on the `them` side, names and avatars show on each run. With one, they don't: the header already says who it is.
- **Times and statuses** show on every bubble that has them, as given. Put `time` (and `status`) on the last message of a run rather than on each, the way messengers do; the block doesn't hide or format them.
- **Failed messages.** A sent message with `status: "failed"` shows "Not sent" and, with `onRetry`, a Retry button that calls `onRetry(id)`. Retrying, resending and moving the status on are the app's job.
- **Rich content.** `content` puts any node in the bubble, under `text` if there is some: a `ProductCard` (horizontal suits the width), an `OrderStatus`, a `CartLine` with `readOnly`.

### Variants
| `variant` | for | differences |
| --- | --- | --- |
| `support` (default) | a person or team | Presence on the header avatar; `typing` shows a `TypingIndicator`, with a string as the typist's name. |
| `assistant` | an in-app AI assistant | No presence; `typing` shows an inline `Thinking` indicator where the reply will appear, with a string as its label ("Checking your order"). The composer is named "Ask {title}". |

### Layout
- A column of fixed `height`: `ChatHeader` at the top, `MessageList` filling the middle and scrolling, `Composer` at the bottom. The default is `min(calc(var(--dt-size-container-narrow) * 0.8), 80dvh)`, tall enough for a real exchange and never most of a phone screen. Pass a number (pixels) or any CSS length, such as `100dvh` for a full-screen chat on a phone.
- The log stays pinned to the newest message unless the reader has scrolled up (`MessageList` behaviour). Streaming a reply by appending to a message's `text` keeps it pinned too.
- **No Section of its own.** A chat is usually a panel in a page or a side sheet, not a band. To place it on a page, put it inside a `Section`; inside `<Section dark>` its colours follow the band, because the `--dt-chat-*` and `--dt-bubble-*` colour aliases are repeated under `.dark`.
- Works at 390px: bubbles keep to three quarters of the log, quick replies wrap, and the header truncates.

### Composition
Renders `ChatHeader`, `MessageList` with `MessageDivider`, `MessageBubble`, `TypingIndicator` or `Thinking`, `QuickReplies` and `Composer`. Remove `quickReplies` once one is chosen or the person types. Keep delivery (sending, sent, delivered, read), timers and replies in your app; the block only draws the state it is given.

### Tokens
Adds none. The panel reads `--dt-chat-surface`, `--dt-chat-border`, `--dt-border-width-default` and `--dt-radius-container`, the spacing reads `--dt-bubble-run-gap` and `--dt-space-stack-xs`, and the default height reads `--dt-size-container-narrow`. Everything inside reads its own component's tokens.

### Accessibility
- The log is `role="log"`, polite, named by `label` (default "Conversation with {title}"). Messages are announced as they are added.
- The header's title is a real heading (`headingLevel`, default 2). The root is a `<section>` without a name, so it adds no extra landmark.
- The composer is named by `composer.label` (default "Message {title}", or "Ask {title}" for the assistant).
- Status is never an icon alone, and a failed message says "Not sent" in text. Retry, quick replies, attach and send are real buttons.
- Typing and thinking announce themselves once. Motion in the dots and the Thinking figure stops under `prefers-reduced-motion`.

### Content
- `title`: the name as the person would recognise it: "Maya Chen", "Northwind support", "Assistant".
- Days: "Today", "Yesterday", then a date. Events: sentence case, no full stop, past tense or a state.
- Replies and suggestions: sentence case, in the person's voice ("Track my order").

## Props

```ts
import * as React from "react";
import type { ChatHeaderProps } from "../chat/ChatHeader.js";
import type { MessageAuthor, MessageBubbleProps } from "../chat/MessageBubble.js";
import type { QuickRepliesProps, QuickReplyOption } from "../chat/QuickReplies.js";
import type { ComposerProps } from "../chat/Composer.js";

/** One message in a ChatBlock conversation. */
export interface ChatBlockMessage {
  /** Unique and stable: the React key, and what onRetry is called with. */
  id: string;
  /** Always a message; only events set kind. */
  kind?: "message";
  /** Whose message it is: the person using the app ("me") or the other side ("them"). */
  from: "me" | "them";
  /** Who wrote a received message. Names and avatars show on each run once more than one author answers (a group chat). */
  author?: MessageAuthor;
  /** The message text. Newlines are kept. */
  text?: string;
  /** Rich content shown in the bubble, under the text if there is some: a ProductCard, an OrderStatus, a CartLine. */
  content?: React.ReactNode;
  /** Preformatted time, e.g. "9:41". Shown under the bubble. */
  time?: string;
  /** Delivery state of a sent message; ignored for "them". "failed" shows Retry when onRetry is set. */
  status?: MessageBubbleProps["status"];
  /** The day this message belongs to, e.g. "Today". A divider is inserted before it when it differs from the last day given. */
  day?: string;
}

/** A system event shown across the log as a divider, e.g. "Maya joined the conversation". It ends a run of bubbles. */
export interface ChatBlockEvent {
  /** Unique and stable: the React key. */
  id: string;
  /** Marks the item as an event rather than a message. */
  kind: "event";
  /** The event, sentence case, past tense or a state: "Maya joined the conversation". */
  text: string;
  /** The day the event happened. Like a message's day, it inserts a divider when it changes. */
  day?: string;
}

/** An item of ChatBlock's messages: a message or an event. */
export type ChatBlockItem = ChatBlockMessage | ChatBlockEvent;

/** Suggested replies shown under the last message. */
export interface ChatBlockQuickReplies {
  /** The suggestions, in reading and Tab order. */
  options: QuickReplyOption[];
  /** Called with the chosen option's id. Usually sends its label and clears the suggestions. */
  onSelect: (id: string) => void;
  /** Accessible name of the group. @default "Suggested replies" */
  label?: string;
  /** Which side the chips gather on. @default "end" */
  align?: QuickRepliesProps["align"];
}

/** The composer under the conversation. Controlled: the app owns the draft. */
export interface ChatBlockComposer {
  /** The draft. */
  value: string;
  /** Called with the new draft on every edit. */
  onChange: (next: string) => void;
  /** Called with the trimmed text on Enter or Send. Append the message and clear value here. */
  onSend: (text: string) => void;
  /** Hint shown while the field is empty, e.g. "Write a message". */
  placeholder?: string;
  /** Shows an attach button. */
  onAttach?: () => void;
  /** Accessible name of the field. @default `Message ${title}`, or `Ask ${title}` for the assistant */
  label?: string;
  /** Disables the field and its buttons; say why in the placeholder. */
  disabled?: ComposerProps["disabled"];
}

/**
 * A whole conversation from data: header, a scrolling log with computed runs,
 * day dividers and events, typing, quick replies and a composer, in one
 * fixed-height panel.
 */
export interface ChatBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Who the conversation is with. The header's heading, and the default names of the log and the composer. */
  title: string;
  /** The header's second line, e.g. "Typically replies in 5 min". */
  subtitle?: ChatHeaderProps["subtitle"];
  /** The header's avatar. */
  avatar?: ChatHeaderProps["avatar"];
  /** The dot on the header's avatar, with the state in text. Not shown for the assistant variant. */
  presence?: ChatHeaderProps["presence"];
  /** Shows a back button in the header. */
  onBack?: ChatHeaderProps["onBack"];
  /** The header's right-hand slot: a few IconButtons. */
  actions?: ChatHeaderProps["actions"];
  /** Level of the header's heading element. @default 2 */
  headingLevel?: ChatHeaderProps["headingLevel"];
  /** The conversation, oldest first: messages, and events as `{ id, kind: "event", text }`. Runs, dividers and group names are computed from it. */
  messages: ChatBlockItem[];
  /** The other side is replying. support: a TypingIndicator, with the string as the typist's name. assistant: a Thinking indicator, with the string as its label. @default false */
  typing?: string | boolean;
  /** Suggested replies under the last message. Omit, or pass no options, to hide them. */
  quickReplies?: ChatBlockQuickReplies;
  /** The composer at the bottom. */
  composer: ChatBlockComposer;
  /** Called with a failed message's id when its Retry is pressed. */
  onRetry?: (id: string) => void;
  /** support: a person or team, with presence and typing dots. assistant: an AI assistant, with no presence and a Thinking indicator while it works. @default "support" */
  variant?: "support" | "assistant";
  /** The panel's height; the log fills what the header and composer leave, and scrolls. A number is pixels. @default "min(calc(var(--dt-size-container-narrow) * 0.8), 80dvh)" */
  height?: number | string;
  /** Accessible name of the log. @default `Conversation with ${title}` */
  label?: string;
}

export declare function ChatBlock(props: ChatBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-bubble-run-gap` | component | `var(--dt-space-stack-sm)` |
| `--dt-chat-border` | component | `var(--dt-border-subtle)` |
| `--dt-chat-surface` | component | `var(--dt-surface-base)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-size-container-narrow` | semantic | `var(--dt-dim-container-md)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |

## Source

```jsx
import React from "react";
import { ChatHeader } from "../chat/ChatHeader.jsx";
import { MessageList, MessageDivider } from "../chat/MessageList.jsx";
import { MessageBubble } from "../chat/MessageBubble.jsx";
import { Composer } from "../chat/Composer.jsx";
import { TypingIndicator } from "../chat/TypingIndicator.jsx";
import { QuickReplies } from "../chat/QuickReplies.jsx";
import { Thinking } from "../feedback/Thinking.jsx";

/* A whole conversation from data. The app passes the messages as an array,
   oldest first, and the block works out what every messenger shows: a day
   divider where the day changes, runs of consecutive messages from one
   author with their corners tightened, names and avatars when several
   people answer, and a Retry on a message that failed. Sending, timers and
   replies stay in the app; the block only draws what it is given.

   It is a panel, not a page band: a fixed-height column with the header at
   the top, the log filling the middle and scrolling, and the composer at
   the bottom. Put it inside a Section (dark or not) to place it on a page. */

/* Tall enough for a real exchange on a desktop, never taller than most of
   the screen on a phone. A proportion of the narrow container, not a size. */
const DEFAULT_HEIGHT = "min(calc(var(--dt-size-container-narrow) * 0.8), 80dvh)";

/* Turns the messages into rows: dividers where the day changes, events as
   dividers, and every message with its place in a run. */
function layout(messages) {
  const rows = [];
  let day;
  let run = [];
  const close = () => {
    run.forEach((row, i) => {
      row.grouped = run.length === 1 ? "single" : i === 0 ? "first" : i === run.length - 1 ? "last" : "middle";
    });
    run = [];
  };
  for (const m of messages || []) {
    if (!m) continue;
    if (m.day && m.day !== day) {
      close();
      day = m.day;
      rows.push({ kind: "day", key: `day-${m.id}`, text: m.day });
    }
    if (m.kind === "event") {
      close();
      rows.push({ kind: "event", key: `event-${m.id}`, text: m.text });
      continue;
    }
    const who = m.from === "me" ? "me" : `them:${m.author ? m.author.name : ""}`;
    if (run.length && run[run.length - 1].who !== who) close();
    const row = { kind: "message", key: m.id, message: m, who, grouped: "single" };
    run.push(row);
    rows.push(row);
  }
  close();
  return rows;
}

export function ChatBlock({
  title,
  subtitle,
  avatar,
  presence,
  onBack,
  actions,
  headingLevel,
  messages = [],
  typing,
  quickReplies,
  composer,
  onRetry,
  variant = "support",
  height = DEFAULT_HEIGHT,
  label,
  style,
  ...rest
}) {
  const assistant = variant === "assistant";
  const rows = React.useMemo(() => layout(messages), [messages]);

  /* Names and avatars only earn their space when more than one person
     answers; with one, the header already says who it is. */
  const group = React.useMemo(() => {
    const names = new Set();
    for (const m of messages || []) if (m && m.kind !== "event" && m.from !== "me" && m.author) names.add(m.author.name);
    return names.size > 1;
  }, [messages]);

  const logLabel = label || `Conversation with ${title}`;
  const typingText = typeof typing === "string" ? typing : undefined;

  return (
    <section
      {...rest}
      style={{
        display: "flex", flexDirection: "column",
        height, minHeight: 0, minWidth: 0, overflow: "hidden",
        background: "var(--dt-chat-surface)", color: "var(--dt-text-primary)",
        border: "var(--dt-border-width-default) solid var(--dt-chat-border)",
        borderRadius: "var(--dt-radius-container)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={avatar}
        presence={assistant ? undefined : presence}
        onBack={onBack}
        actions={actions}
        headingLevel={headingLevel}
        style={{ flex: "none" }}
      />
      <MessageList label={logLabel} style={{ flex: "1 1 auto" }}>
        {rows.map((row) => {
          if (row.kind !== "message") return <MessageDivider key={row.key} data-divider={row.kind}>{row.text}</MessageDivider>;
          const m = row.message;
          const mine = m.from === "me";
          return (
            <MessageBubble
              key={row.key}
              from={mine ? "me" : "them"}
              time={m.time}
              status={mine ? m.status : undefined}
              onRetry={mine && m.status === "failed" && onRetry ? () => onRetry(m.id) : undefined}
              author={!mine && group ? m.author : undefined}
              grouped={row.grouped}
              data-grouped={row.grouped}
              data-message-id={m.id}
            >
              {m.text}
              {m.content != null && (
                <div style={{ marginTop: m.text ? "var(--dt-space-stack-xs)" : undefined, whiteSpace: "normal", minWidth: 0 }}>
                  {m.content}
                </div>
              )}
            </MessageBubble>
          );
        })}
        {typing && !assistant && <TypingIndicator name={typingText} />}
        {typing && assistant && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "var(--dt-bubble-run-gap)", minWidth: 0 }}>
            <Thinking state="thinking" size="sm" label={typingText || "Thinking"} />
          </div>
        )}
        {quickReplies && quickReplies.options && quickReplies.options.length > 0 && (
          <QuickReplies
            label={quickReplies.label || "Suggested replies"}
            options={quickReplies.options}
            onSelect={quickReplies.onSelect}
            align={quickReplies.align}
          />
        )}
      </MessageList>
      {composer && (
        <Composer
          label={composer.label || (assistant ? `Ask ${title}` : `Message ${title}`)}
          placeholder={composer.placeholder}
          value={composer.value}
          onChange={composer.onChange}
          onSend={composer.onSend}
          onAttach={composer.onAttach}
          disabled={composer.disabled}
          style={{ flex: "none" }}
        />
      )}
    </section>
  );
}
```
