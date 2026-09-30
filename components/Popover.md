# Popover

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Popover.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Popover.jsx), [Popover.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Popover.d.ts), [Popover.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Popover.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Popover.html

## Guidelines

Anchored panel holding secondary controls or detail: a filter set, a field explanation,
a small form. Opens on click, closes on outside click or Escape.

### Rules

- `label` is required. The panel is a dialog; an unnamed dialog is announced as nothing.
- Click, not hover. Hover-opened panels containing controls are unusable on touch and
  hostile with a trackpad.
- Keep it to one job. A popover with tabs inside it should be a Drawer or a Dialog.
- Do not nest popovers. The second one traps focus behind the first.

### Tradeoffs

Popovers stay anchored to their trigger, which keeps context but constrains size. Once
content exceeds roughly 320px tall, a Drawer gives the user a scrollable surface and a
clear way out.

## Props

```ts
import * as React from "react";

/** Anchored panel for secondary content and controls. */
export interface PopoverProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The element that opens the popover. Cloned with aria-expanded. */
  trigger: React.ReactNode;
  children?: React.ReactNode;
  /** Controlled open state. Omit to let the component manage it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** @default "bottom-start" */
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  /** Accessible name for the panel. Required. */
  label: string;
  /** @default 260 */
  width?: number | string;
}

export declare function Popover(props: PopoverProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-3` | semantic | `var(--dt-shadow-raw-3)` |
| `--dt-radius-overlay` | semantic | `var(--dt-radius-raw-24)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-surface-raised` | semantic | `var(--dt-color-white)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |

## Source

```jsx
import React from "react";

export function Popover({ trigger, children, open: controlled, onOpenChange, placement = "bottom-start", label, width = 260, style, ...rest }) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlled != null ? controlled : uncontrolled;
  const setOpen = v => { if (controlled == null) setUncontrolled(v); onOpenChange && onOpenChange(v); };
  const wrap = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = e => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const pos = {
    "bottom-start": { top: "calc(100% + 6px)", left: 0 },
    "bottom-end": { top: "calc(100% + 6px)", right: 0 },
    "top-start": { bottom: "calc(100% + 6px)", left: 0 },
    "top-end": { bottom: "calc(100% + 6px)", right: 0 },
  }[placement];
  return (
    <span ref={wrap} style={{ position: "relative", display: "inline-flex", ...style }} {...rest}>
      {React.isValidElement(trigger)
        ? React.cloneElement(trigger, { onClick: e => { trigger.props.onClick && trigger.props.onClick(e); setOpen(!open); }, "aria-expanded": open, "aria-haspopup": "dialog" })
        : trigger}
      {open && (
        <div role="dialog" aria-label={label} style={{
          position: "absolute", ...pos, zIndex: 30, width, boxSizing: "border-box",
          background: "var(--dt-surface-raised)", color: "var(--dt-text-primary)",
          border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
          borderRadius: "var(--dt-radius-overlay)", boxShadow: "var(--dt-elevation-3)",
          padding: "var(--dt-space-inset-md)",
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)",
        }}>{children}</div>
      )}
    </span>
  );
}
```
