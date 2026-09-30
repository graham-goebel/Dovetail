# Composer

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [Composer.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/Composer.jsx), [Composer.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/Composer.d.ts), [Composer.md](https://graham-goebel.github.io/Dovetail/system/components/chat/Composer.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Composer.html

## Guidelines

The field where a message is written, with an optional attach button and a send button. Enter sends, Shift+Enter adds a line, and the field grows with its text.

### Use it when
- The person replies in a conversation: to a person, a team or an assistant.

### Don't use it when
- It is a form field that happens to be long, such as a note or a description. Use `Textarea`; Enter there should add a line, not submit.
- It is a search box. Use `Input` or `Combobox`.

### Example
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

### Behaviour
- **Controlled.** `value` and `onChange` are required. `onSend` receives the text trimmed of leading and trailing whitespace; clear `value` there. The composer never clears itself, so a send that fails can keep the draft.
- **Keys.** Enter sends. Shift+Enter inserts a newline. Enter while an input method editor is composing (Japanese, Chinese, Korean input) confirms the composition and never sends. Enter with only whitespace does nothing.
- **Send button.** Labelled "Send", disabled while the trimmed value is empty. After a click, focus returns to the field.
- **Growth.** The field starts at one line and grows with its text up to `maxRows` (default 6), then scrolls.
- **Attach.** `onAttach` shows an `IconButton` labelled "Attach a file". Opening a file picker and uploading are your app's job.
- **Disabled** disables the field and both buttons. Say why in the placeholder: "This conversation has ended".

### Composition
The last child of the conversation's flex column, below `MessageList`. **Keeping it at the bottom is the layout's job, not the composer's:** make the list `flex: 1` in a column of fixed height (such as `100dvh`), or give the composer `position: sticky; bottom: 0` in a page that scrolls. On a phone, check it with the on-screen keyboard open. Uses `IconButton` for attach and send.

### Tokens
The field reuses the input tokens, so it matches every other field: `--dt-input-bg`, `--dt-input-bg-disabled`, `--dt-input-fg`, `--dt-input-fg-disabled`, `--dt-input-border`, `--dt-input-border-focus`, `--dt-input-border-disabled`, `--dt-input-border-width`, `--dt-input-radius`, `--dt-input-padding-x`, `--dt-input-font-family`, `--dt-input-font-size`, `--dt-input-height-md` and `--dt-input-transition`. The bar reads `--dt-chat-surface` and `--dt-chat-border`. The buttons read `--dt-button-*`. It adds no tokens of its own.

### Accessibility
- The field is a `<textarea>` named by the required `label`. The placeholder is only a hint and disappears as soon as the person types.
- Attach and send are `IconButton`s with the names "Attach a file" and "Send"; send is disabled, not hidden, while there is nothing to send.
- Tab order: attach, field, send.
- `enterKeyHint="send"` labels the on-screen keyboard's return key.

### Content
- `label` names who or what the message goes to: "Message Maya Chen", "Ask the assistant".
- Placeholder: a short hint, sentence case, no full stop: "Write a message".

## Props

```ts
import * as React from "react";

/** Where a message is written. Enter sends, Shift+Enter adds a line; the field grows up to `maxRows`, then scrolls. */
export interface ComposerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The text. Controlled. */
  value: string;
  /** Called with the new text on every edit. */
  onChange: (next: string) => void;
  /** Called with the trimmed text on Enter or the send button; clear `value` here. Never called while the text is empty or only whitespace. */
  onSend: (text: string) => void;
  /** Accessible name of the text field, e.g. "Message Maya". Required: a placeholder is not a label. */
  label: string;
  /** Hint shown while the field is empty. */
  placeholder?: string;
  /** Disables the field and both buttons. @default false */
  disabled?: boolean;
  /** Shows an attach button, labelled "Attach a file", before the field. */
  onAttach?: () => void;
  /** Lines the field grows to before it scrolls. @default 6 */
  maxRows?: number;
}

export declare function Composer(props: ComposerProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-chat-border` | component | `var(--dt-border-subtle)` |
| `--dt-chat-surface` | component | `var(--dt-surface-base)` |
| `--dt-input-bg` | component | `var(--dt-surface-base)` |
| `--dt-input-bg-disabled` | component | `var(--dt-surface-disabled)` |
| `--dt-input-border` | component | `var(--dt-border-default)` |
| `--dt-input-border-disabled` | component | `var(--dt-border-disabled)` |
| `--dt-input-border-focus` | component | `var(--dt-focus-ring-color)` |
| `--dt-input-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-input-fg` | component | `var(--dt-text-primary)` |
| `--dt-input-fg-disabled` | component | `var(--dt-text-disabled)` |
| `--dt-input-font-family` | component | `var(--dt-text-body-md-family)` |
| `--dt-input-font-size` | component | `var(--dt-font-size-sm)` |
| `--dt-input-height-md` | component | `var(--dt-size-control-md)` |
| `--dt-input-padding-x` | component | `var(--dt-space-inset-sm)` |
| `--dt-input-radius` | component | `var(--dt-radius-control)` |
| `--dt-input-transition` | component | `var(--dt-motion-micro)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |

## Source

```jsx
import React from "react";
import { IconButton } from "../actions/IconButton.jsx";

/* Where a message is written. Controlled: the app owns the text, receives it
   on send, and clears it. Enter sends and Shift+Enter breaks the line; Enter
   that confirms an IME composition (Japanese, Chinese, Korean input) is left
   to the IME. The field grows with its text up to maxRows, then scrolls. */

/* A layout effect in the browser, so the field never paints at the wrong
   height; a plain effect on the server, where layout effects warn. */
const useIsoLayoutEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

const ATTACH = ["m20.5 11.5-8.3 8.3a5.3 5.3 0 0 1-7.5-7.5l8.6-8.6a3.5 3.5 0 0 1 5 5l-8.6 8.6a1.8 1.8 0 0 1-2.5-2.5l7.9-7.9"];
const SEND = ["M12 19.5v-15", "m5.5 11 6.5-6.5 6.5 6.5"];

function Glyph({ paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)", display: "block" }}>
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export function Composer({ value, onChange, onSend, label, placeholder, disabled = false, onAttach, maxRows = 6, style, ...rest }) {
  const area = React.useRef(null);
  const [focus, setFocus] = React.useState(false);
  const id = React.useId();
  const text = value == null ? "" : String(value);
  const empty = text.trim() === "";

  /* Grow to fit, up to maxRows lines, measured from the field's own line
     height and padding so a theme or density change is honoured. */
  useIsoLayoutEffect(() => {
    const el = area.current;
    if (!el || typeof getComputedStyle === "undefined") return;
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
    const box = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const max = line * Math.max(1, maxRows) + box;
    el.style.height = "auto";
    const needed = el.scrollHeight + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    el.style.height = `${Math.min(needed, max)}px`;
    el.style.overflowY = needed > max ? "auto" : "hidden";
  }, [text, maxRows]);

  const send = () => {
    if (disabled || empty) return;
    onSend(text.trim());
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    /* keyCode 229 is how older Safari reports a key the IME consumed. */
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    send();
  };

  const onSendClick = () => {
    send();
    /* The send button disables itself once the app clears the text; return
       focus to the field so it is not dropped on the page. */
    if (area.current) area.current.focus();
  };

  const border = focus ? "var(--dt-input-border-focus)" : "var(--dt-input-border)";

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-end", gap: "var(--dt-space-inline-xs)",
        padding: "var(--dt-space-inset-xs)",
        background: "var(--dt-chat-surface)",
        borderTop: "var(--dt-border-width-default) solid var(--dt-chat-border)",
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {onAttach && (
        <IconButton label="Attach a file" onClick={onAttach} disabled={disabled} style={{ flex: "none" }}>
          <Glyph paths={ATTACH} />
        </IconButton>
      )}
      <textarea
        ref={area}
        id={id}
        rows={1}
        value={text}
        aria-label={label}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        enterKeyHint="send"
        style={{
          flex: "1 1 auto", minWidth: 0, width: "100%", margin: 0,
          minHeight: "var(--dt-input-height-md)",
          padding: "var(--dt-space-inset-xs) var(--dt-input-padding-x)",
          fontFamily: "var(--dt-input-font-family)",
          fontSize: "var(--dt-input-font-size)",
          lineHeight: "var(--dt-text-body-sm-line)",
          color: disabled ? "var(--dt-input-fg-disabled)" : "var(--dt-input-fg)",
          background: disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
          border: `var(--dt-input-border-width) solid ${disabled ? "var(--dt-input-border-disabled)" : border}`,
          borderRadius: "var(--dt-input-radius)",
          outline: "none",
          resize: "none",
          overflowY: "hidden",
          transition: "border-color var(--dt-input-transition)",
          boxSizing: "border-box",
        }}
      />
      <IconButton label="Send" variant="solid" onClick={onSendClick} disabled={disabled || empty} style={{ flex: "none" }}>
        <Glyph paths={SEND} />
      </IconButton>
    </div>
  );
}
```
