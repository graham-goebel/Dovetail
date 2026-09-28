# Progress

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Progress.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Progress.jsx), [Progress.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Progress.d.ts), [Progress.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Progress.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Progress.html

## Guidelines

Shows how much of a known task is done. Use it for uploads, imports, quota meters, and
multi-file operations.

### Rules

- Only use a determinate bar when you can measure progress honestly. A bar that sits at
  90% for a minute costs more trust than a spinner.
- Pair `label` with `showValue` for operations over a few seconds. A bare bar tells the
  user something is happening but not what.
- Tone is semantic. Use `warning` and `danger` for quota meters approaching a limit,
  not to decorate a normal upload.
- For quota displays, `max` is the limit and the label states the units.

### Tradeoffs

Indeterminate bars look like progress without being progress. If you cannot measure,
Spinner is the more honest control.

## Props

```ts
import * as React from "react";

/** Determinate or indeterminate progress bar. */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value. Omit for an indeterminate bar. */
  value?: number;
  /** @default 100 */
  max?: number;
  /** Visible label above the bar. Also the accessible name. */
  label?: React.ReactNode;
  /** Show the percentage on the right. @default false */
  showValue?: boolean;
  /** @default "primary" */
  tone?: "primary" | "success" | "warning" | "danger";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

export declare function Progress(props: ProgressProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-action` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-surface-danger` | semantic | `var(--dt-color-red-600)` |
| `--dt-surface-success` | semantic | `var(--dt-color-green-600)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-warning` | semantic | `var(--dt-color-amber-500)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-motion-duration-normal` | none | not declared |
| `--dt-motion-easing-standard` | none | not declared |

## Source

```jsx
import React from "react";

export function Progress({ value, max = 100, label, showValue = false, tone = "primary", size = "md", style, ...rest }) {
  const indeterminate = value == null;
  const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const h = size === "sm" ? 4 : size === "lg" ? 10 : 6;
  const fill = { primary: "var(--dt-surface-action)", success: "var(--dt-surface-success)", warning: "var(--dt-surface-warning)", danger: "var(--dt-surface-danger)" }[tone];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", ...style }} {...rest}>
      {(label || showValue) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)" }}>
          {label && <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", color: "var(--dt-text-secondary)", fontWeight: "var(--dt-font-weight-medium)" }}>{label}</span>}
          {showValue && !indeterminate && <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", color: "var(--dt-text-secondary)", fontVariantNumeric: "tabular-nums" }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={typeof label === "string" ? label : undefined}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        style={{ height: h, background: "var(--dt-surface-sunken)", borderRadius: "var(--dt-radius-pill)", overflow: "hidden" }}
      >
        <div style={{
          height: "100%", background: fill, borderRadius: "var(--dt-radius-pill)",
          width: indeterminate ? "35%" : pct + "%",
          transition: "width var(--dt-motion-duration-normal) var(--dt-motion-easing-standard)",
          animation: indeterminate ? "dt-progress-slide 1200ms var(--dt-motion-easing-standard) infinite" : undefined,
        }} />
      </div>
    </div>
  );
}
```
