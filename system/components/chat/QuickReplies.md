# QuickReplies

Suggested answers under a message, as a row of chip buttons the person can pick instead of typing.

## Use it when
- A bot or an agent asked a question with a few likely answers: "Track my order", "Start a return", "Talk to a person".

## Don't use it when
- There are more than about four options. That is a menu; put a `List` or links in the message itself.
- The choice changes settings or data outside the conversation. Use `Button`s in the page, where the result can be seen.

## Example
```jsx
<QuickReplies
  label="Suggested replies"
  options={[
    { id: "track", label: "Track my order" },
    { id: "return", label: "Start a return" },
    { id: "human", label: "Talk to a person" },
  ]}
  onSelect={(id) => sendMessage(labelFor(id))}
/>
```

## Layout
The row **wraps** onto as many lines as it needs; it never scrolls sideways. On a phone every option stays visible, and a long label wraps inside its chip. `align="end"` (the default) gathers the chips on the right, with the person's own messages, which is where the chosen answer will appear; `align="start"` puts them under the message on the left.

## Composition
Inside `MessageList`, after the message that asked the question. Each chip is a `Button` (ghost, medium, so it meets the 40px touch size) with an outline, so it never reads as a received message. Remove the chips once one is chosen or the person types instead; stale suggestions invite a second, contradictory answer. Choosing one is your app's to handle, usually by sending its label as the person's message.

## Tokens
Exposes `--dt-quick-replies-gap` (between chips) and `--dt-quick-replies-border` (the chip outline, repeated under `.dark`), and reads `--dt-bubble-run-gap` (above the row). The chips read `--dt-button-*`, so they follow the button tokens and the Shape setting.

## Accessibility
- The row is `role="group"` named by the required `label`, so a screen reader says what the options are for.
- Each chip is a real `<button type="button">`: Tab reaches them in reading order, and Enter or Space selects.
- Options appear in the order given, which is also the Tab order.

## Content
- Label each chip with what gets sent, in the person's voice: "Track my order", not "Order tracking".
- Sentence case, no full stop, a few words each.
