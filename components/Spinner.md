# Spinner

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Spinner.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Spinner.jsx), [Spinner.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Spinner.d.ts), [Spinner.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Spinner.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Spinner.html

## Guidelines

Signals an indeterminate wait where the resulting content has no known shape.

### Rules

- Use a spinner for actions: saving, submitting, connecting. Use Skeleton for content
  that is about to fill a known layout.
- Below roughly 300ms, show nothing. A flash of spinner reads as a glitch.
- The `label` is announced via `role="status"`. Make it specific: "Saving changes"
  beats "Loading".
- Never centre a spinner in an empty page for more than a few seconds without a
  cancel path or a progress estimate.

### Tradeoffs

Spinners give no sense of duration, so long waits feel longer under one. If you know the
progress, use Progress instead.

## Props

```ts
import * as React from "react";

/** Indeterminate loading indicator. */
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Announced to screen readers. @default "Loading" */
  label?: string;
  /** Render inline with text rather than as a block. @default false */
  inline?: boolean;
}

export declare function Spinner(props: SpinnerProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-action` | semantic | `var(--dt-color-primary-600)` |
| `--dt-motion-duration-slow` | none | not declared |

## Source

```jsx
import React from "react";

const SIZES = { sm: 14, md: 18, lg: 24 };

export function Spinner({ size = "md", label = "Loading", inline = false, style, ...rest }) {
  const px = SIZES[size] || SIZES.md;
  return (
    <span role="status" aria-live="polite" style={{ display: inline ? "inline-flex" : "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", ...style }} {...rest}>
      <span aria-hidden="true" style={{
        width: px, height: px, flex: "none", borderRadius: "var(--dt-radius-pill)",
        border: "2px solid var(--dt-border-default)", borderTopColor: "var(--dt-surface-action)",
        animation: "dt-spin var(--dt-motion-duration-slow, 700ms) linear infinite",
      }} />
      <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>{label}</span>
    </span>
  );
}
```
