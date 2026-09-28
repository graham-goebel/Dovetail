# ToastRegion

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Toast.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Toast.jsx), [Toast.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Toast.d.ts), [Toast.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Toast.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ToastRegion.html

## Guidelines

Confirms that something happened, out of the user's way. Use it for results of actions
the user just took.

### Rules

- Render toasts inside a `ToastRegion`. It owns the fixed positioning, stacking, and
  the accessible region name.
- Toasts are for outcomes, not errors that need a decision. A failed save that the user
  must resolve belongs in an Alert next to the form.
- One action, and it should be Undo or Retry. A toast that disappears while the user
  reaches for a link is a broken control.
- `danger` announces assertively and should not auto-dismiss. Everything else can.
- Never stack more than three. Collapse the rest into a count.

### Tradeoffs

Toasts are easy to miss: they appear away from the point of action and vanish. For
anything the user must acknowledge, use a Dialog or an inline Alert.

## Props

```ts
import * as React from "react";

/** Transient confirmation or failure notice. */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "neutral" */
  tone?: "neutral" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** One action, usually Undo. */
  action?: React.ReactNode;
  onDismiss?: () => void;
  /** @default "Dismiss" */
  dismissLabel?: string;
}

/** Fixed container that stacks toasts in a corner. */
export interface ToastRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** @default "bottom-right" */
  placement?: "bottom-right" | "bottom-left" | "top-right" | "top-center";
  /** @default "Notifications" */
  label?: string;
}

export declare function Toast(props: ToastProps): JSX.Element;
export declare function ToastRegion(props: ToastRegionProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-danger` | semantic | `var(--dt-color-red-200)` |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-success` | semantic | `var(--dt-color-green-200)` |
| `--dt-border-warning` | semantic | `var(--dt-color-amber-200)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-3` | semantic | `var(--dt-shadow-raw-3)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-overlay` | semantic | `var(--dt-radius-raw-24)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-raised` | semantic | `var(--dt-color-white)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

const TONES = {
  neutral: { bd: "var(--dt-border-default)", fg: "var(--dt-text-secondary)" },
  success: { bd: "var(--dt-border-success)", fg: "var(--dt-text-success)" },
  warning: { bd: "var(--dt-border-warning)", fg: "var(--dt-text-warning)" },
  danger: { bd: "var(--dt-border-danger)", fg: "var(--dt-text-danger)" },
};

export function Toast({ tone = "neutral", title, children, icon, action, onDismiss, dismissLabel = "Dismiss", style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <div role={tone === "danger" ? "alert" : "status"} aria-live={tone === "danger" ? "assertive" : "polite"} style={{
      display: "flex", alignItems: "flex-start", gap: "var(--dt-space-inline-sm)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-md)",
      background: "var(--dt-surface-raised)", color: "var(--dt-text-primary)",
      border: `var(--dt-border-width-default) solid ${t.bd}`,
      borderRadius: "var(--dt-radius-overlay)", boxShadow: "var(--dt-elevation-3)",
      minWidth: 260, maxWidth: 420, boxSizing: "border-box", ...style,
    }} {...rest}>
      {icon && <span aria-hidden="true" style={{ color: t.fg, flex: "none", display: "flex", marginTop: 1 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {title && <span style={{ fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-semibold)" }}>{title}</span>}
        {children && <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{children}</span>}
      </div>
      {action && <span style={{ flex: "none" }}>{action}</span>}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={dismissLabel} style={{
          flex: "none", appearance: "none", background: "transparent", border: "none", cursor: "pointer",
          color: "var(--dt-text-tertiary)", fontSize: "var(--dt-text-body-md-size)", lineHeight: 1,
          padding: "var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)",
        }}>×</button>
      )}
    </div>
  );
}

export function ToastRegion({ children, placement = "bottom-right", label = "Notifications", style, ...rest }) {
  const pos = {
    "bottom-right": { bottom: "var(--dt-space-inset-lg)", right: "var(--dt-space-inset-lg)", alignItems: "flex-end" },
    "bottom-left": { bottom: "var(--dt-space-inset-lg)", left: "var(--dt-space-inset-lg)", alignItems: "flex-start" },
    "top-right": { top: "var(--dt-space-inset-lg)", right: "var(--dt-space-inset-lg)", alignItems: "flex-end" },
    "top-center": { top: "var(--dt-space-inset-lg)", left: "50%", transform: "translateX(-50%)", alignItems: "center" },
  }[placement];
  return (
    <div role="region" aria-label={label} style={{
      position: "fixed", zIndex: 50, display: "flex", flexDirection: "column",
      gap: "var(--dt-space-stack-xs)", pointerEvents: "none", ...pos, ...style,
    }} {...rest}>
      {React.Children.map(children, c => <div style={{ pointerEvents: "auto" }}>{c}</div>)}
    </div>
  );
}
```
