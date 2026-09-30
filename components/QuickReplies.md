# QuickReplies

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [QuickReplies.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/QuickReplies.jsx), [QuickReplies.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/QuickReplies.d.ts), [QuickReplies.md](https://graham-goebel.github.io/Dovetail/system/components/chat/QuickReplies.md).

Live page: https://graham-goebel.github.io/Dovetail/components/QuickReplies.html

## Guidelines

Suggested answers under a message, as a row of chip buttons the person can pick instead of typing.

### Use it when
- A bot or an agent asked a question with a few likely answers: "Track my order", "Start a return", "Talk to a person".

### Don't use it when
- There are more than about four options. That is a menu; put a `List` or links in the message itself.
- The choice changes settings or data outside the conversation. Use `Button`s in the page, where the result can be seen.

### Example
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

### Layout
The row **wraps** onto as many lines as it needs; it never scrolls sideways. On a phone every option stays visible, and a long label wraps inside its chip. `align="end"` (the default) gathers the chips on the right, with the person's own messages, which is where the chosen answer will appear; `align="start"` puts them under the message on the left.

### Composition
Inside `MessageList`, after the message that asked the question. Each chip is a `Button` (ghost, medium, so it meets the 40px touch size) with an outline, so it never reads as a received message. Remove the chips once one is chosen or the person types instead; stale suggestions invite a second, contradictory answer. Choosing one is your app's to handle, usually by sending its label as the person's message.

### Tokens
Exposes `--dt-quick-replies-gap` (between chips) and `--dt-quick-replies-border` (the chip outline, repeated under `.dark`), and reads `--dt-bubble-run-gap` (above the row). The chips read `--dt-button-*`, so they follow the button tokens and the Shape setting.

### Accessibility
- The row is `role="group"` named by the required `label`, so a screen reader says what the options are for.
- Each chip is a real `<button type="button">`: Tab reaches them in reading order, and Enter or Space selects.
- Options appear in the order given, which is also the Tab order.

### Content
- Label each chip with what gets sent, in the person's voice: "Track my order", not "Order tracking".
- Sentence case, no full stop, a few words each.

## Props

```ts
import * as React from "react";

/** One suggested reply. */
export interface QuickReplyOption {
  /** Passed to onSelect. */
  id: string;
  /** The chip's text, usually what gets sent. */
  label: string;
}

/** Suggested replies as a row of chip buttons that wraps onto more lines. */
export interface QuickRepliesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The suggestions, in reading and Tab order. */
  options: QuickReplyOption[];
  /** Called with the chosen option's id. */
  onSelect: (id: string) => void;
  /** Accessible name of the group, e.g. "Suggested replies". Required. */
  label: string;
  /** Which side the chips gather on. end sits them with the person's own messages. @default "end" */
  align?: "start" | "end";
}

export declare function QuickReplies(props: QuickRepliesProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-bubble-run-gap` | component | `var(--dt-space-stack-sm)` |
| `--dt-button-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-button-height-md` | component | `var(--dt-size-control-md)` |
| `--dt-button-padding-md` | component | `var(--dt-space-inset-md)` |
| `--dt-quick-replies-border` | component | `var(--dt-border-default)` |
| `--dt-quick-replies-gap` | component | `var(--dt-space-inline-xs)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |

## Source

```jsx
import React from "react";
import { Button } from "../actions/Button.jsx";

/* Suggested answers, one tap each: a row of chip buttons that wraps onto as
   many lines as it needs, so every option stays visible on a phone and Tab
   reaches them in reading order. Choosing one is the app's to handle,
   usually by sending the label as the person's message. */

const ALIGN = { start: "flex-start", end: "flex-end" };

export function QuickReplies({ options = [], onSelect, label, align = "end", style, ...rest }) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "flex", flexWrap: "wrap", gap: "var(--dt-quick-replies-gap)",
        justifyContent: ALIGN[align] || ALIGN.end,
        marginTop: "var(--dt-bubble-run-gap)",
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {options.map((o) => (
        <Button
          key={o.id}
          type="button"
          variant="ghost"
          size="md"
          onClick={() => onSelect(o.id)}
          style={{
            /* A long suggestion wraps inside its chip rather than running off
               a phone screen. */
            maxWidth: "100%", height: "auto", minHeight: "var(--dt-button-height-md)",
            border: "var(--dt-button-border-width) solid var(--dt-quick-replies-border)",
            padding: "var(--dt-space-inset-2xs) var(--dt-button-padding-md)",
            whiteSpace: "normal", textAlign: "center", lineHeight: "var(--dt-text-label-md-line)",
          }}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
```
