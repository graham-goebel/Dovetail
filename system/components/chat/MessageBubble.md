# MessageBubble

One message in a conversation: sent on the right in the action colours, received on the left in a quiet surface, with its time, delivery status and, in groups, its author.

## Use it when
- You show a message in a `MessageList`: a person's, a support agent's or an assistant's.

## Don't use it when
- It is a system event such as "Maya joined". Use `MessageDivider`.
- It is a comment thread or a review. Use `Card` or `List`; bubbles say "conversation", with its left and right sides.

## Example
```jsx
<MessageBubble from="them" time="9:38">Are we still on for 11?</MessageBubble>
<MessageBubble from="me" time="9:39" status="read">Yes, see you at the gate.</MessageBubble>

{/* A run from one author */}
<MessageBubble from="them" author={{ name: "Maya Chen" }} grouped="first">Draft's in the folder.</MessageBubble>
<MessageBubble from="them" author={{ name: "Maya Chen" }} grouped="last" time="14:20">Comments by Thursday.</MessageBubble>

{/* Failed */}
<MessageBubble from="me" time="14:24" status="failed" onRetry={() => resend(id)}>Running late</MessageBubble>
```

## Variants
| prop | values | what it does |
| --- | --- | --- |
| `from` | `me`, `them` | `me` sits right in `--dt-bubble-sent-*` (the action surface, so it follows the ink-or-brand choice in Configure); `them` sits left in `--dt-bubble-received-*`. |
| `grouped` | `single` (default), `first`, `middle`, `last` | Position in a run of consecutive messages from one author. The corners where two bubbles meet tighten to `--dt-bubble-radius-tight` and the gap closes to `--dt-bubble-gap`; a new run starts `--dt-bubble-run-gap` below the last. |
| `status` | `sending`, `sent`, `delivered`, `read`, `failed` | Sent messages only; ignored for `them`. A clock, one tick, two ticks, two ticks in `--dt-bubble-read-fg`, or "Not sent" in `--dt-bubble-failed-fg`. |
| `onRetry` | function | With `failed`, adds a Retry button next to "Not sent". |
| `author` | `{ name, src? }` | Received messages in a group chat. The avatar sits beside the first bubble of a run and the name above it; later bubbles keep the avatar's gutter so the run lines up. |
| `time` | string | Preformatted by your app, e.g. "9:41". Shown under the bubble. |

The bubble is at most about three quarters of the list's width. Text keeps its newlines and wraps, and a long word or URL breaks rather than pushing the bubble off the screen.

## Composition
Inside `MessageList`. `children` is the message: text, or inline content such as a `Link`. Work out `grouped` in your app from consecutive messages by one author (usually within a few minutes), and put `time` and `status` on the last bubble of a run rather than on each. Uses `Avatar` for authors.

## Tokens
Exposes (Tier 3, `tokens/component/chat.css`): `--dt-bubble-sent-bg`, `--dt-bubble-sent-fg`, `--dt-bubble-received-bg`, `--dt-bubble-received-fg`, `--dt-bubble-meta-fg`, `--dt-bubble-author-fg`, `--dt-bubble-read-fg`, `--dt-bubble-failed-fg`, `--dt-bubble-radius`, `--dt-bubble-radius-tight`, `--dt-bubble-padding`, `--dt-bubble-gap` and `--dt-bubble-run-gap`. They alias `--dt-surface-action`, `--dt-text-on-action`, `--dt-surface-sunken` (`--dt-surface-overlay` under `.dark`, where sunken is darker than the page), the text roles, `--dt-radius-container`, `--dt-radius-control` and the space roles. Colour aliases are repeated under `.dark`. The retry button reads `--dt-text-link`.

## Accessibility
- Status is never an icon alone: each icon has visually hidden text ("Sending", "Sent", "Delivered", "Read"), and a failed message says "Not sent" in visible text.
- Retry is a real `<button>`, reachable with Tab.
- In a group, the author's name is visible text above the first bubble of a run and visually hidden text before the others, so a message announced on its own by the log still says who wrote it. The avatar is hidden, since the name is already read.
- Sent and received are told apart by position and colour, and by the author name in groups. Both colour pairs are the system's contrast-checked role pairs.

## Content
- The message is whatever the person wrote. Don't truncate it.
- Times: your app's locale format, short ("9:41", "Yesterday 16:02"). The bubble never formats dates itself.
