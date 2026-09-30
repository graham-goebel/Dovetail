# TypingIndicator

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [TypingIndicator.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/TypingIndicator.jsx), [TypingIndicator.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/TypingIndicator.d.ts), [TypingIndicator.md](https://graham-goebel.github.io/Dovetail/system/components/chat/TypingIndicator.md).

Live page: https://graham-goebel.github.io/Dovetail/components/TypingIndicator.html

## Guidelines

Three dots in a received bubble while the other side of a conversation is typing.

### Use it when
- Your app knows the other person is typing, from your real-time service.

### Don't use it when
- An assistant is preparing an answer. Use `Thinking`, which can say what it is doing (thinking, searching) rather than only that something is happening.
- You want to make a reply feel more human by delaying it. Never show typing that is not happening.
- A page or a button is loading. Use `Spinner` or the button's `loading`.

### Example
```jsx
<MessageList label="Conversation with Maya Chen">
  {messages.map(renderBubble)}
  {mayaIsTyping && <TypingIndicator name="Maya" />}
</MessageList>
```

### Behaviour
- With `name`, "Maya is typing" shows beside the dots and is announced. Without it, only the dots show and "Typing" is announced.
- The dots rise and fade in a wave, one beat apart, paced by `--dt-typing-beat` through the Web Animations API. Under `prefers-reduced-motion: reduce` they hold still.
- The bubble is the height of a one-line message, so the reply that replaces it does not make the list jump.

### Composition
The last child of a `MessageList`, where the reply will appear. Remove it when the message arrives. `name` is one person: the component adds "is typing". When several people in a group are typing, show one indicator without `name` rather than a stack of them.

### Tokens
Reads `--dt-bubble-received-bg`, `--dt-bubble-radius`, `--dt-bubble-padding`, `--dt-bubble-run-gap` and `--dt-bubble-meta-fg` from the bubble set, and exposes `--dt-typing-dot` (colour, repeated under `.dark`), `--dt-typing-dot-size` and `--dt-typing-beat` (an alias of `--dt-motion-emphasis`, which reduced motion makes instant).

### Accessibility
- The root is a polite live region. It mounts empty and the text is added a moment later, so screen readers announce it once rather than missing a region that arrived already full.
- The dots are hidden from assistive technology; the text carries the meaning.
- No motion under `prefers-reduced-motion: reduce`.

### Content
- `name`: the first name as it appears in the conversation. The component adds "is typing".

## Props

```ts
import * as React from "react";

/** Three animated dots in a received bubble while the other side is typing. The dots hold still under reduced motion. */
export interface TypingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Who is typing. Shown and announced as "Maya is typing"; without it, "Typing" is announced and nothing is shown beside the dots. */
  name?: string;
}

export declare function TypingIndicator(props: TypingIndicatorProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-bubble-meta-fg` | component | `var(--dt-text-tertiary)` |
| `--dt-bubble-padding` | component | `var(--dt-space-inset-xs) var(--dt-space-inset-sm)` |
| `--dt-bubble-radius` | component | `var(--dt-radius-container)` |
| `--dt-bubble-received-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-bubble-run-gap` | component | `var(--dt-space-stack-sm)` |
| `--dt-typing-beat` | component | `var(--dt-motion-emphasis)` |
| `--dt-typing-dot` | component | `var(--dt-text-tertiary)` |
| `--dt-typing-dot-size` | component | `calc(var(--dt-size-icon-xs) / 2)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |

## Source

```jsx
import React from "react";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Someone is writing a reply: three dots in a received bubble. Show it while
   the app knows the other side is typing, and remove it when their message
   arrives. For an assistant working on an answer, Thinking says more.

   The dots are animated with the Web Animations API from an effect, paced by
   --dt-typing-beat, because inline styles cannot declare keyframes. Under
   prefers-reduced-motion they hold still. */

const REDUCE = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(REDUCE);
    const sync = () => setReduced(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else mq.addListener(sync);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", sync) : mq.removeListener(sync));
  }, []);
  return reduced;
}

/* One beat, in milliseconds, and its easing, read from the token on the
   element so a theme or context that retunes the motion role is honoured. */
function readBeat(node) {
  const raw = getComputedStyle(node).getPropertyValue("--dt-typing-beat").trim();
  const m = raw.match(/^(-?[\d.]+)(ms|s)\b\s*(.*)$/);
  if (!m) return { ms: 0, easing: "linear" };
  return { ms: parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1), easing: m[3] || "linear" };
}

export function TypingIndicator({ name, style, ...rest }) {
  const dots = React.useRef(null);
  const reduced = useReducedMotion();
  const message = name ? `${name} is typing` : "Typing";

  /* The live region mounts empty and is filled a moment later, so a screen
     reader announces the text once instead of missing a region that arrived
     already full. */
  const [spoken, setSpoken] = React.useState("");
  React.useEffect(() => {
    setSpoken(message);
  }, [message]);

  React.useEffect(() => {
    const box = dots.current;
    if (reduced || !box || typeof box.animate !== "function") return undefined;
    const { ms, easing } = readBeat(box);
    if (!ms) return undefined;
    /* Each dot rises over two beats and rests for two, a beat after the one
       before it, so the three read as a wave. */
    const running = Array.from(box.children).map((dot, i) =>
      dot.animate(
        [
          { opacity: 0.4, transform: "scale(0.75)" },
          { opacity: 1, transform: "scale(1)", offset: 0.25 },
          { opacity: 0.4, transform: "scale(0.75)", offset: 0.5 },
          { opacity: 0.4, transform: "scale(0.75)" },
        ],
        { duration: ms * 4, delay: ms * i, iterations: Infinity, easing },
      ),
    );
    return () => running.forEach((a) => a.cancel());
  }, [reduced]);

  const dot = {
    display: "block", flex: "none",
    width: "var(--dt-typing-dot-size)", height: "var(--dt-typing-dot-size)",
    borderRadius: "var(--dt-radius-pill)", background: "var(--dt-typing-dot)",
    opacity: reduced ? 0.7 : 0.4,
  };

  return (
    <div
      aria-live="polite"
      style={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--dt-space-inline-xs)",
        marginTop: "var(--dt-bubble-run-gap)",
        ...style,
      }}
      {...rest}
    >
      <div aria-hidden="true" ref={dots} style={{
        display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)",
        padding: "var(--dt-bubble-padding)",
        /* The height of one line of bubble text, so the indicator is the same
           height as the one-line reply that replaces it. */
        minHeight: "calc(var(--dt-text-body-sm-line) + var(--dt-space-inset-xs) * 2)",
        borderRadius: "var(--dt-bubble-radius)",
        background: "var(--dt-bubble-received-bg)",
      }}>
        <span style={dot} />
        <span style={dot} />
        <span style={dot} />
      </div>
      {name && (
        <span aria-hidden="true" style={{
          fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
          lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-bubble-meta-fg)",
        }}>{message}</span>
      )}
      <VisuallyHidden>{spoken}</VisuallyHidden>
    </div>
  );
}
```
