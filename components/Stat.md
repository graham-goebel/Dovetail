# Stat

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Stat.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Stat.jsx), [Stat.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Stat.d.ts), [Stat.md](https://graham-goebel.github.io/Dovetail/system/components/display/Stat.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Stat.html

## Guidelines

Puts one number where the eye lands first. Use it in dashboard headers, summary bars, and
report openers.

### Rules

- `deltaDirection` means good or bad, not up or down. A 12% drop in churn is `"up"`.
  Colour follows meaning; otherwise green reads as praise for a bad result.
- Format `value` before passing it. The component does not round, abbreviate, or add
  separators; your locale rules belong in your data layer.
- Always give `caption` a comparison period when a delta is shown. "+12.4%" against
  nothing is not a fact.
- Group stats with Grid, three or four across. More than that and none of them is
  headline.

### Tradeoffs

Big type buys attention at the cost of space. In a dense operational view a Table row
often communicates the same thing and lets the user compare twenty metrics instead of four.

## Props

```ts
import * as React from "react";

/** Single headline metric with an optional change indicator. */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What the number measures, e.g. "Monthly active users". */
  label: React.ReactNode;
  /** The figure itself, pre-formatted. */
  value: React.ReactNode;
  /** Trailing unit, e.g. "hrs" or "/ mo". */
  unit?: React.ReactNode;
  /** Change since the comparison period, e.g. "+12.4%". */
  delta?: React.ReactNode;
  /** Colours the delta. Direction is semantic, not arithmetic — a falling error rate is "up". */
  deltaDirection?: "up" | "down" | "flat";
  /** Comparison period or footnote under the figure. */
  caption?: React.ReactNode;
  /** @default "left" */
  align?: "left" | "center" | "right";
}

export declare function Stat(props: StatProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

export function Stat({ label, value, unit, delta, deltaDirection, caption, align = "left", style, ...rest }) {
  const dc = deltaDirection === "up" ? "var(--dt-text-success)" : deltaDirection === "down" ? "var(--dt-text-danger)" : "var(--dt-text-secondary)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", textAlign: align, ...style }} {...rest}>
      <span style={{
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
        lineHeight: "var(--dt-text-label-sm-line)", color: "var(--dt-text-secondary)",
        fontWeight: "var(--dt-font-weight-medium)",
      }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "var(--dt-space-inline-xs)", justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
        <span style={{
          fontFamily: "var(--dt-text-heading-lg-family)", fontSize: "var(--dt-text-heading-lg-size)",
          lineHeight: "var(--dt-text-heading-lg-line)", fontWeight: "var(--dt-font-weight-semibold)",
          letterSpacing: "var(--dt-text-heading-lg-tracking)", color: "var(--dt-text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}>{value}</span>
        {unit && <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-text-secondary)" }}>{unit}</span>}
        {delta && (
          <span style={{
            fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
            fontWeight: "var(--dt-font-weight-medium)", color: dc, fontVariantNumeric: "tabular-nums",
          }}>{delta}</span>
        )}
      </span>
      {caption && <span style={{ fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-tertiary)" }}>{caption}</span>}
    </div>
  );
}
```
