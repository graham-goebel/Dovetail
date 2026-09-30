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
