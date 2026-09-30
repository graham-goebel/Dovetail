# TypingIndicator

Three dots in a received bubble while the other side of a conversation is typing.

## Use it when
- Your app knows the other person is typing, from your real-time service.

## Don't use it when
- An assistant is preparing an answer. Use `Thinking`, which can say what it is doing (thinking, searching) rather than only that something is happening.
- You want to make a reply feel more human by delaying it. Never show typing that is not happening.
- A page or a button is loading. Use `Spinner` or the button's `loading`.

## Example
```jsx
<MessageList label="Conversation with Maya Chen">
  {messages.map(renderBubble)}
  {mayaIsTyping && <TypingIndicator name="Maya" />}
</MessageList>
```

## Behaviour
- With `name`, "Maya is typing" shows beside the dots and is announced. Without it, only the dots show and "Typing" is announced.
- The dots rise and fade in a wave, one beat apart, paced by `--dt-typing-beat` through the Web Animations API. Under `prefers-reduced-motion: reduce` they hold still.
- The bubble is the height of a one-line message, so the reply that replaces it does not make the list jump.

## Composition
The last child of a `MessageList`, where the reply will appear. Remove it when the message arrives. `name` is one person: the component adds "is typing". When several people in a group are typing, show one indicator without `name` rather than a stack of them.

## Tokens
Reads `--dt-bubble-received-bg`, `--dt-bubble-radius`, `--dt-bubble-padding`, `--dt-bubble-run-gap` and `--dt-bubble-meta-fg` from the bubble set, and exposes `--dt-typing-dot` (colour, repeated under `.dark`), `--dt-typing-dot-size` and `--dt-typing-beat` (an alias of `--dt-motion-emphasis`, which reduced motion makes instant).

## Accessibility
- The root is a polite live region. It mounts empty and the text is added a moment later, so screen readers announce it once rather than missing a region that arrived already full.
- The dots are hidden from assistive technology; the text carries the meaning.
- No motion under `prefers-reduced-motion: reduce`.

## Content
- `name`: the first name as it appears in the conversation. The component adds "is typing".
