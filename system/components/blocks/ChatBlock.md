# ChatBlock

A whole conversation from data. Pass the messages as an array and the block draws the header, a scrolling log with day dividers, events and runs worked out for you, typing, quick replies and the composer, in one fixed-height panel.

## Use it when
- A screen or a panel is one conversation: customer support, a team thread, an in-app assistant.
- You have the conversation as data and don't want to work out runs, dividers and group names by hand.

## Don't use it when
- You need something the block doesn't draw, such as reactions or a thread per message. Compose `ChatHeader`, `MessageList`, `MessageBubble` and `Composer` yourself.
- It is one message or a quote on a marketing page. Use `MessageBubble` or `Quote`.
- It is a feed of notifications. Use `List`.

## Example
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

## What it works out
- **Runs.** Consecutive messages from the same side (and, for `them`, the same `author`) form a run and get `grouped` first, middle and last, so the corners tighten where they meet. A day divider or an event ends a run. The value is also on each bubble as `data-grouped`.
- **Days.** `day` on an item inserts a `MessageDivider` before it when it differs from the last `day` given. Set it on every message or only on the first of each day; the result is one divider per change.
- **Events.** An item `{ id, kind: "event", text }` in `messages` is a divider across the log ("Maya joined the conversation"). Events live in the same array as messages so their order is never in doubt.
- **Group chats.** When more than one `author` answers on the `them` side, names and avatars show on each run. With one, they don't: the header already says who it is.
- **Times and statuses** show on every bubble that has them, as given. Put `time` (and `status`) on the last message of a run rather than on each, the way messengers do; the block doesn't hide or format them.
- **Failed messages.** A sent message with `status: "failed"` shows "Not sent" and, with `onRetry`, a Retry button that calls `onRetry(id)`. Retrying, resending and moving the status on are the app's job.
- **Rich content.** `content` puts any node in the bubble, under `text` if there is some: a `ProductCard` (horizontal suits the width), an `OrderStatus`, a `CartLine` with `readOnly`.

## Variants
| `variant` | for | differences |
| --- | --- | --- |
| `support` (default) | a person or team | Presence on the header avatar; `typing` shows a `TypingIndicator`, with a string as the typist's name. |
| `assistant` | an in-app AI assistant | No presence; `typing` shows an inline `Thinking` indicator where the reply will appear, with a string as its label ("Checking your order"). The composer is named "Ask {title}". |

## Layout
- A column of fixed `height`: `ChatHeader` at the top, `MessageList` filling the middle and scrolling, `Composer` at the bottom. The default is `min(calc(var(--dt-size-container-narrow) * 0.8), 80dvh)`, tall enough for a real exchange and never most of a phone screen. Pass a number (pixels) or any CSS length, such as `100dvh` for a full-screen chat on a phone.
- The log stays pinned to the newest message unless the reader has scrolled up (`MessageList` behaviour). Streaming a reply by appending to a message's `text` keeps it pinned too.
- **No Section of its own.** A chat is usually a panel in a page or a side sheet, not a band. To place it on a page, put it inside a `Section`; inside `<Section dark>` its colours follow the band, because the `--dt-chat-*` and `--dt-bubble-*` colour aliases are repeated under `.dark`.
- Works at 390px: bubbles keep to three quarters of the log, quick replies wrap, and the header truncates.

## Composition
Renders `ChatHeader`, `MessageList` with `MessageDivider`, `MessageBubble`, `TypingIndicator` or `Thinking`, `QuickReplies` and `Composer`. Remove `quickReplies` once one is chosen or the person types. Keep delivery (sending, sent, delivered, read), timers and replies in your app; the block only draws the state it is given.

## Tokens
Adds none. The panel reads `--dt-chat-surface`, `--dt-chat-border`, `--dt-border-width-default` and `--dt-radius-container`, the spacing reads `--dt-bubble-run-gap` and `--dt-space-stack-xs`, and the default height reads `--dt-size-container-narrow`. Everything inside reads its own component's tokens.

## Accessibility
- The log is `role="log"`, polite, named by `label` (default "Conversation with {title}"). Messages are announced as they are added.
- The header's title is a real heading (`headingLevel`, default 2). The root is a `<section>` without a name, so it adds no extra landmark.
- The composer is named by `composer.label` (default "Message {title}", or "Ask {title}" for the assistant).
- Status is never an icon alone, and a failed message says "Not sent" in text. Retry, quick replies, attach and send are real buttons.
- Typing and thinking announce themselves once. Motion in the dots and the Thinking figure stops under `prefers-reduced-motion`.

## Content
- `title`: the name as the person would recognise it: "Maya Chen", "Northwind support", "Assistant".
- Days: "Today", "Yesterday", then a date. Events: sentence case, no full stop, past tense or a state.
- Replies and suggestions: sentence case, in the person's voice ("Track my order").
