# Banner

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Banner.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Banner.jsx), [Banner.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Banner.d.ts), [Banner.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Banner.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Banner.html

## Guidelines

Page-level message about the state of the whole view: trial expiry, degraded service,
a pending migration. Use Alert for messages scoped to one region or form.

### Rules

- Banners run edge to edge at the top of the region they describe. A floating banner in
  the middle of a page is an Alert.
- One banner at a time. Stacked banners push the actual page below the fold and train
  users to ignore the strip.
- `danger` announces as `role="alert"`; the rest announce politely. Do not use danger
  for anything the user can safely finish reading later.
- Persistent conditions get no dismiss button. Only offer `onDismiss` when dismissing
  it is a real decision.

### Tradeoffs

A banner buys attention from every user on the page, including the ones the message is
not for. Target it to the accounts that can act on it.

## Props

```ts
import * as React from "react";

/** Full-width message pinned to the top of a page or region. */
export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** @default "info" */
  tone?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  /** Body copy. */
  children?: React.ReactNode;
  /** Lucide icon. */
  icon?: React.ReactNode;
  /** One trailing action, usually a ghost Button or Link. */
  action?: React.ReactNode;
  /** Renders a close button when supplied. */
  onDismiss?: () => void;
  /** @default "Dismiss" */
  dismissLabel?: string;
}

export declare function Banner(props: BannerProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-danger` | semantic | `var(--dt-color-red-200)` |
| `--dt-border-info` | semantic | `var(--dt-color-cyan-200)` |
| `--dt-border-success` | semantic | `var(--dt-color-green-200)` |
| `--dt-border-warning` | semantic | `var(--dt-color-amber-200)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-surface-danger-subtle` | semantic | `var(--dt-color-red-050)` |
| `--dt-surface-info-subtle` | semantic | `var(--dt-color-cyan-050)` |
| `--dt-surface-success-subtle` | semantic | `var(--dt-color-green-050)` |
| `--dt-surface-warning-subtle` | semantic | `var(--dt-color-amber-050)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

const TONES = {
  info: { bg: "var(--dt-surface-info-subtle)", fg: "var(--dt-text-info)", bd: "var(--dt-border-info)" },
  success: { bg: "var(--dt-surface-success-subtle)", fg: "var(--dt-text-success)", bd: "var(--dt-border-success)" },
  warning: { bg: "var(--dt-surface-warning-subtle)", fg: "var(--dt-text-warning)", bd: "var(--dt-border-warning)" },
  danger: { bg: "var(--dt-surface-danger-subtle)", fg: "var(--dt-text-danger)", bd: "var(--dt-border-danger)" },
};

export function Banner({ tone = "info", title, children, icon, action, onDismiss, dismissLabel = "Dismiss", style, ...rest }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div role={tone === "danger" ? "alert" : "status"} style={{
      display: "flex", alignItems: "flex-start", gap: "var(--dt-space-inline-sm)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-md)",
      background: t.bg, color: "var(--dt-text-primary)",
      borderBottom: `var(--dt-border-width-default) solid ${t.bd}`,
      width: "100%", boxSizing: "border-box", ...style,
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
          color: "var(--dt-text-secondary)", fontSize: "var(--dt-text-body-md-size)", lineHeight: 1,
          padding: "var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)",
        }}>×</button>
      )}
    </div>
  );
}
```
