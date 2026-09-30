---
type: added
bump: minor
area: components
components: [ChatHeader, MessageList, MessageDivider, MessageBubble, Composer, TypingIndicator, QuickReplies]
tokens: [--dt-bubble-sent-bg, --dt-bubble-sent-fg, --dt-bubble-received-bg, --dt-bubble-received-fg, --dt-bubble-meta-fg, --dt-bubble-author-fg, --dt-bubble-read-fg, --dt-bubble-failed-fg, --dt-bubble-radius, --dt-bubble-radius-tight, --dt-bubble-padding, --dt-bubble-gap, --dt-bubble-run-gap, --dt-presence-online, --dt-presence-away, --dt-presence-offline, --dt-presence-size, --dt-chat-surface, --dt-chat-border, --dt-chat-divider-fg, --dt-typing-beat, --dt-typing-dot, --dt-typing-dot-size, --dt-quick-replies-gap, --dt-quick-replies-border]
visual: false
---
A chat family builds a conversation from props: `ChatHeader` (title, subtitle, avatar, `presence`, `onBack`, `actions`), `MessageList` (a named `role="log"` that stays pinned to the newest message and offers a "New messages" jump when the reader has scrolled up) with `MessageDivider`, `MessageBubble` (`from`, `time`, `status` with `onRetry`, group `author`, and `grouped` run shapes), `Composer` (controlled; Enter sends, Shift+Enter adds a line, grows to `maxRows`, optional `onAttach`), `TypingIndicator` (`name`) and `QuickReplies` (`options`, `onSelect`). Sent bubbles use the action surface, so they follow the ink-or-brand choice in Configure; the new `--dt-bubble-*`, `--dt-presence-*`, `--dt-chat-*`, `--dt-typing-*` and `--dt-quick-replies-*` tokens tune the rest.
