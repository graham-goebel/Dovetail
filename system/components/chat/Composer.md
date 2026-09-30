# Composer

The field where a message is written, with an optional attach button and a send button. Enter sends, Shift+Enter adds a line, and the field grows with its text.

## Use it when
- The person replies in a conversation: to a person, a team or an assistant.

## Don't use it when
- It is a form field that happens to be long, such as a note or a description. Use `Textarea`; Enter there should add a line, not submit.
- It is a search box. Use `Input` or `Combobox`.

## Example
```jsx
const [draft, setDraft] = useState("");

<Composer
  label="Message Maya Chen"
  placeholder="Write a message"
  value={draft}
  onChange={setDraft}
  onSend={(text) => { sendMessage(text); setDraft(""); }}
  onAttach={openFilePicker}
/>
```

## Behaviour
- **Controlled.** `value` and `onChange` are required. `onSend` receives the text trimmed of leading and trailing whitespace; clear `value` there. The composer never clears itself, so a send that fails can keep the draft.
- **Keys.** Enter sends. Shift+Enter inserts a newline. Enter while an input method editor is composing (Japanese, Chinese, Korean input) confirms the composition and never sends. Enter with only whitespace does nothing.
- **Send button.** Labelled "Send", disabled while the trimmed value is empty. After a click, focus returns to the field.
- **Growth.** The field starts at one line and grows with its text up to `maxRows` (default 6), then scrolls.
- **Attach.** `onAttach` shows an `IconButton` labelled "Attach a file". Opening a file picker and uploading are your app's job.
- **Disabled** disables the field and both buttons. Say why in the placeholder: "This conversation has ended".

## Composition
The last child of the conversation's flex column, below `MessageList`. **Keeping it at the bottom is the layout's job, not the composer's:** make the list `flex: 1` in a column of fixed height (such as `100dvh`), or give the composer `position: sticky; bottom: 0` in a page that scrolls. On a phone, check it with the on-screen keyboard open. Uses `IconButton` for attach and send.

## Tokens
The field reuses the input tokens, so it matches every other field: `--dt-input-bg`, `--dt-input-bg-disabled`, `--dt-input-fg`, `--dt-input-fg-disabled`, `--dt-input-border`, `--dt-input-border-focus`, `--dt-input-border-disabled`, `--dt-input-border-width`, `--dt-input-radius`, `--dt-input-padding-x`, `--dt-input-font-family`, `--dt-input-font-size`, `--dt-input-height-md` and `--dt-input-transition`. The bar reads `--dt-chat-surface` and `--dt-chat-border`. The buttons read `--dt-button-*`. It adds no tokens of its own.

## Accessibility
- The field is a `<textarea>` named by the required `label`. The placeholder is only a hint and disappears as soon as the person types.
- Attach and send are `IconButton`s with the names "Attach a file" and "Send"; send is disabled, not hidden, while there is nothing to send.
- Tab order: attach, field, send.
- `enterKeyHint="send"` labels the on-screen keyboard's return key.

## Content
- `label` names who or what the message goes to: "Message Maya Chen", "Ask the assistant".
- Placeholder: a short hint, sentence case, no full stop: "Write a message".
