# Drawer

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Drawer.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Drawer.jsx), [Drawer.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Drawer.d.ts), [Drawer.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Drawer.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Drawer.html

## Guidelines

Modal side panel for detail views, filters, and secondary forms that need more room than
a Popover and less interruption than a full page.

### Rules

- Focus moves into the panel on open and Tab stays inside it. Escape closes, the scrim
  closes, and focus returns to the trigger. That is built in; do not add a second close
  path that skips focus restoration.
- Use `right` for detail and editing, `left` for navigation on narrow screens, and
  `bottom` for mobile sheets.
- Actions go in `footer`, not loose at the end of the body. The footer stays visible
  while the body scrolls.
- A drawer is modal. If the user needs to reference the page behind it while working,
  use an inline panel instead.
- It sits at `--dt-z-overlay`, above every sticky role, so a fixed page header never
  floats over the drawer's own scrim. Do not lower a header's z-index to make room.

### Surfaces
`surface` sets the panel's fill: `raised` (default), `glass` or `glass-strong` (what's behind shows through, blurred), or `brand` and `brand-muted`. The brand fills bring the text, links, borders and buttons that read on them, the same as a brand `Section`; `Navbar` passes its own surface down so the menu it opens matches the bar.

### Tradeoffs

Drawers preserve page context but cover a third of the screen and trap focus. For tasks
longer than a couple of fields, a dedicated page respects the browser's back button.

## Props

```ts
import * as React from "react";

/** Modal panel that slides in from an edge. */
export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose?: () => void;
  /** Header, and the accessible name unless `label` is given. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Footer slot, usually the action buttons. */
  footer?: React.ReactNode;
  /** @default "right" */
  side?: "right" | "left" | "bottom";
  /** Applies to left and right drawers. @default 380 */
  width?: number | string;
  /** The panel's fill. "glass" and "glass-strong" let what's behind show through, blurred. "brand" and "brand-muted" are the brand fills, with the text, links, borders and buttons that read on them (the same as Section's tones), for a menu opened from a brand bar. @default "raised" */
  surface?: "raised" | "glass" | "glass-strong" | "brand" | "brand-muted";
  /** Accessible name instead of the title, or for a drawer with no title. */
  label?: string;
}

export declare function Drawer(props: DrawerProps): React.JSX.Element | null;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-backdrop-glass` | semantic | `saturate(1.6) blur(var(--dt-blur-glass))` |
| `--dt-border-glass` | semantic | `color-mix(in oklab, var(--dt-text-primary) 10%, transparent)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-4` | semantic | `var(--dt-shadow-raw-4)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-overlay` | semantic | `var(--dt-radius-raw-24)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-surface-glass` | semantic | `color-mix(in oklab, var(--dt-surface-overlay) 72%, transparent)` |
| `--dt-surface-glass-strong` | semantic | `color-mix(in oklab, var(--dt-surface-overlay) 88%, transparent)` |
| `--dt-surface-raised` | semantic | `var(--dt-color-white)` |
| `--dt-surface-scrim` | semantic | `oklch(0.145 0.005 264 / 0.5)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-z-overlay` | semantic | `300` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";
import { useModalFocus } from "./Dialog.jsx";
import { fillTone } from "../primitives/Section.jsx";

/* Glass: the overlay surface let through, blurred, for a panel over a
   picture or a busy screen. Always paired with the backdrop filter. */
const GLASS = { glass: "var(--dt-surface-glass)", "glass-strong": "var(--dt-surface-glass-strong)" };
/* A brand fill brings the text, links, borders and buttons that read on it,
   the same declarations a brand Section uses. */
const FILLS = { brand: true, "brand-muted": true };

export function Drawer({ open, onClose, title, children, footer, side = "right", width = 380, surface = "raised", label, style, ...rest }) {
  const panel = React.useRef(null);
  const titleId = React.useId();
  useModalFocus(open, panel, onClose);
  if (!open) return null;
  const horizontal = side === "left" || side === "right";
  const fill = FILLS[surface] ? fillTone(surface) : null;
  const glass = GLASS[surface];
  const edge = glass ? "var(--dt-border-glass)" : "var(--dt-border-subtle)";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--dt-z-overlay)", display: "flex", justifyContent: side === "right" ? "flex-end" : "flex-start", alignItems: side === "bottom" ? "flex-end" : "stretch" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--dt-surface-scrim, rgba(0,0,0,0.4))" }} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label || undefined}
        aria-labelledby={!label && title ? titleId : undefined}
        tabIndex={-1}
        style={{
          position: "relative", display: "flex", flexDirection: "column",
          width: horizontal ? width : "100%", height: horizontal ? "100%" : "auto",
          maxHeight: "100%", maxWidth: "100%", boxSizing: "border-box",
          background: "var(--dt-surface-raised)", color: "var(--dt-text-primary)",
          ...(fill || {}),
          ...(glass ? { background: glass, backdropFilter: "var(--dt-backdrop-glass)", WebkitBackdropFilter: "var(--dt-backdrop-glass)" } : null),
          boxShadow: "var(--dt-elevation-4)",
          borderLeft: side === "right" ? `var(--dt-border-width-default) solid ${edge}` : "none",
          borderRight: side === "left" ? `var(--dt-border-width-default) solid ${edge}` : "none",
          borderTopLeftRadius: side === "bottom" ? "var(--dt-radius-overlay)" : 0,
          borderTopRightRadius: side === "bottom" ? "var(--dt-radius-overlay)" : 0,
          ...style,
        }}
        {...rest}
      >
        {title && (
          <header style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)",
            padding: "var(--dt-space-inset-md)", borderBottom: `var(--dt-border-width-default) solid ${edge}`, flex: "none",
          }}>
            <span id={titleId} style={{ fontFamily: "var(--dt-text-heading-xs-family)", fontSize: "var(--dt-text-heading-xs-size)", fontWeight: "var(--dt-font-weight-semibold)" }}>{title}</span>
            <button type="button" onClick={onClose} aria-label="Close" style={{
              appearance: "none", background: "transparent", border: "none", cursor: "pointer",
              color: "var(--dt-text-secondary)", fontSize: "var(--dt-text-body-lg-size)", lineHeight: 1,
              padding: "var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)",
            }}>×</button>
          </header>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--dt-space-inset-md)", fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)" }}>{children}</div>
        {footer && (
          <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--dt-space-inline-sm)", padding: "var(--dt-space-inset-md)", borderTop: `var(--dt-border-width-default) solid ${edge}`, flex: "none" }}>{footer}</footer>
        )}
      </div>
    </div>
  );
}
```
