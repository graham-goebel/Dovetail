# MessageList

The scrolling log of a conversation, kept pinned to the newest message unless the reader has scrolled up to read history. `MessageDivider`, exported from the same file, labels days and events across it.

## Use it when
- You show a conversation: bubbles, dividers, a typing indicator, quick replies.
- New messages arrive while the conversation is open and the view should follow them.

## Don't use it when
- It is a feed of records or notifications. Use `List`; a log announces every addition.
- It is a single message or a quote. Use `MessageBubble` on its own, or `Quote`.

## Example
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

## Behaviour
- **Pinned.** On mount, and whenever children change or the content changes size (an image loads, a bubble grows), the list scrolls to the bottom, as long as the reader is already there.
- **Scrolled up.** If the reader has scrolled away from the bottom, new content leaves them where they are and a "New messages" button (a `Button`) appears at the bottom. It scrolls down (smoothly, unless reduced motion is set), and focus moves to the log so it is not lost when the button goes.
- **Short conversations** sit at the bottom of the list, next to the composer, not at the top.
- It never fetches, pages or reorders. Pass the conversation oldest first; load older history in your app and prepend it.

## MessageDivider
A centred label with a rule on each side: `<MessageDivider>Today</MessageDivider>`, `<MessageDivider>Conversation assigned to Maya</MessageDivider>`. Use it for days and for events that change the conversation (assigned, transferred, ended), not for every timestamp. `children` is the label; when it is not a plain string, pass `label` as its accessible name. Long labels wrap.

## Composition
The `flex: 1` middle of a column with `ChatHeader` above and `Composer` below, or any box with a bounded height. A list with no height bound never scrolls, so it has nothing to pin. Children are `MessageBubble`, `MessageDivider`, `TypingIndicator` and `QuickReplies`, which carry their own spacing: a run gap before each run and around dividers, a small gap inside a run.

## Tokens
Reads `--dt-chat-border` and `--dt-chat-divider-fg` for the divider, `--dt-bubble-run-gap` for the divider's margin, and `--dt-space-inset-sm` for the list's padding. The jump button is a `Button` and reads `--dt-button-*` and `--dt-elevation-2`. Exposes nothing of its own beyond the shared `--dt-chat-*` tokens.

## Accessibility
- The root is `role="log"` with `aria-live="polite"`, named by the required `label`. Screen readers announce messages as they are added, without interrupting. Don't wrap it in another live region.
- The log is focusable (`tabIndex={0}`), so keyboard users can scroll it with the arrow keys and Page Up and Page Down.
- The "New messages" button is a real button, reachable with Tab while it shows. Activating it moves focus to the log.
- `MessageDivider` is `role="separator"` named by its text, because a separator's content is not read on its own.
- The jump scrolls instantly under `prefers-reduced-motion: reduce`.

## Content
- `label`: who the conversation is with: "Conversation with Maya Chen", "Support chat".
- Divider labels: sentence case, no full stop. Days as "Today", "Yesterday", then a date; events in the past tense or as a state: "Conversation assigned to Maya", "Chat ended".
