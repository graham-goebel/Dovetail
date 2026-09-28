# Badge

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Badge.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Badge.jsx), [Badge.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Badge.d.ts), [Badge.md](https://graham-goebel.github.io/Dovetail/system/components/display/Badge.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Badge.html

## Guidelines

A small, non-interactive label. Badges report state; they never do anything.

### Use it when
- Status on a record: Active, Past due, Draft.
- A count or short piece of metadata beside a title.

### Don't use it when
- It is clickable or removable. Use `Tag`.
- The information needs a sentence. Use `Alert`.

### Example
```jsx
<Badge tone="success" dot>Active</Badge>
<Badge tone="danger">Past due</Badge>
<Badge tone="primary" variant="solid">New</Badge>
```

### Variants
`subtle` (default) for status in dense lists. `solid` sparingly: one solid badge draws the eye, five do not.

### Accessibility
Colour never carries the meaning alone; the text does. `dot` is decorative and aria-hidden.

### Content
One or two words, sentence case. "Past due", not "PAST DUE" or "This invoice is past due".

## Props

```ts
import * as React from "react";

/** Small non-interactive label for status or metadata. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "neutral" */
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  /** subtle is tinted with a border; solid is a filled chip for high emphasis. @default "subtle" */
  variant?: "subtle" | "solid";
  /** Leading status dot. */
  dot?: boolean;
  children?: React.ReactNode;
}

export declare function Badge(props: BadgeProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-danger` | semantic | `var(--dt-color-red-200)` |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-info` | semantic | `var(--dt-color-cyan-200)` |
| `--dt-border-selected` | semantic | `var(--dt-color-primary-600)` |
| `--dt-border-success` | semantic | `var(--dt-color-green-200)` |
| `--dt-border-warning` | semantic | `var(--dt-color-amber-200)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-action` | semantic | `var(--dt-color-primary-600)` |
| `--dt-surface-danger` | semantic | `var(--dt-color-red-600)` |
| `--dt-surface-danger-subtle` | semantic | `var(--dt-color-red-050)` |
| `--dt-surface-info` | semantic | `var(--dt-color-cyan-600)` |
| `--dt-surface-info-subtle` | semantic | `var(--dt-color-cyan-050)` |
| `--dt-surface-inverse` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-surface-selected` | semantic | `var(--dt-color-primary-050)` |
| `--dt-surface-success` | semantic | `var(--dt-color-green-600)` |
| `--dt-surface-success-subtle` | semantic | `var(--dt-color-green-050)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-warning` | semantic | `var(--dt-color-amber-500)` |
| `--dt-surface-warning-subtle` | semantic | `var(--dt-color-amber-050)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-info` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";

const TONES = {
  neutral: { bg: "var(--dt-surface-sunken)", fg: "var(--dt-text-secondary)", bd: "var(--dt-border-default)" },
  primary: { bg: "var(--dt-surface-selected)", fg: "var(--dt-text-on-selected)", bd: "var(--dt-border-selected)" },
  success: { bg: "var(--dt-surface-success-subtle)", fg: "var(--dt-text-success)", bd: "var(--dt-border-success)" },
  warning: { bg: "var(--dt-surface-warning-subtle)", fg: "var(--dt-text-warning)", bd: "var(--dt-border-warning)" },
  danger: { bg: "var(--dt-surface-danger-subtle)", fg: "var(--dt-text-danger)", bd: "var(--dt-border-danger)" },
  info: { bg: "var(--dt-surface-info-subtle)", fg: "var(--dt-text-info)", bd: "var(--dt-border-info)" },
};

export function Badge({ tone = "neutral", variant = "subtle", dot = false, children, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  const solid = variant === "solid";
  const solidBg = { neutral: "var(--dt-surface-inverse)", primary: "var(--dt-surface-action)", success: "var(--dt-surface-success)", warning: "var(--dt-surface-warning)", danger: "var(--dt-surface-danger)", info: "var(--dt-surface-info)" }[tone];
  const solidFg = { neutral: "var(--dt-text-inverse)", primary: "var(--dt-text-on-action)", success: "var(--dt-text-on-success)", warning: "var(--dt-text-on-warning)", danger: "var(--dt-text-on-danger)", info: "var(--dt-text-on-info)" }[tone];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)",
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
        lineHeight: "var(--dt-text-label-sm-line)", fontWeight: "var(--dt-font-weight-medium)",
        padding: "2px var(--dt-space-inset-xs)",
        borderRadius: "var(--dt-radius-pill)",
        background: solid ? solidBg : t.bg,
        color: solid ? solidFg : t.fg,
        border: solid ? "var(--dt-border-width-default) solid transparent" : `var(--dt-border-width-default) solid ${t.bd}`,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flex: "none" }} />}
      {children}
    </span>
  );
}
```
