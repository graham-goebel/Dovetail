# Tooltip

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Tooltip.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Tooltip.jsx), [Tooltip.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Tooltip.d.ts), [Tooltip.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Tooltip.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Tooltip.html

## Guidelines

Names a control whose purpose is not obvious from its face, most often an IconButton.

### Rules

- Tooltips are supplementary, never the only source of a label. An IconButton still needs
  its own `label` prop; the tooltip repeats it for sighted users.
- Never put an action, a link, or anything the user must read inside a tooltip. It is
  unreachable on touch and invisible to keyboard users who do not focus the trigger.
- The trigger must be focusable. A tooltip on a plain `span` never opens for keyboard
  users.
- A few words. Anything longer is a Popover.

### Tradeoffs

Tooltips do not exist on touch devices. Any information you put in one is information a
phone user will not get, so plan the mobile affordance separately.

## Props

```ts
import * as React from "react";

/** Short label revealed on hover or focus. */
export interface TooltipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "content"> {
  /** Tooltip text. Keep it to a few words. */
  content: React.ReactNode;
  /** The trigger. Must be focusable. */
  children: React.ReactNode;
  /** @default "top" */
  placement?: "top" | "bottom" | "left" | "right";
  /** Hover delay in ms. @default 200 */
  delay?: number;
}

export declare function Tooltip(props: TooltipProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-elevation-2` | semantic | `var(--dt-shadow-raw-2)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-inverse` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |

## Source

```jsx
import React from "react";

export function Tooltip({ content, children, placement = "top", delay = 200, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef(null);
  const id = React.useId();
  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), delay); };
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  React.useEffect(() => () => clearTimeout(timer.current), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const pos = {
    top: { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  }[placement];
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} {...rest}>
      {React.isValidElement(children) ? React.cloneElement(children, { "aria-describedby": open ? id : undefined }) : children}
      {open && (
        <span role="tooltip" id={id} style={{
          position: "absolute", ...pos, zIndex: 40, pointerEvents: "none",
          background: "var(--dt-surface-inverse)", color: "var(--dt-text-inverse)",
          padding: "var(--dt-space-inset-2xs, 4px) var(--dt-space-inset-xs)",
          borderRadius: "var(--dt-radius-control)", boxShadow: "var(--dt-elevation-2)",
          fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
          lineHeight: "var(--dt-text-body-xs-line)", whiteSpace: "nowrap", maxWidth: 260,
        }}>{content}</span>
      )}
    </span>
  );
}
```
