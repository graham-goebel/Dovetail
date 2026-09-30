# Stepper

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [Stepper.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/Stepper.jsx), [Stepper.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/Stepper.d.ts), [Stepper.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/Stepper.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Stepper.html

## Guidelines

Shows how far through a sequential task the user is and how much remains. Use it for
checkout, onboarding, and setup wizards.

### Rules

- Steps must be genuinely sequential. If the user can complete them in any order, use
  Tabs or a checklist.
- Three to five steps. A seven-step stepper reads as a warning, not a guide.
- Step labels are nouns or short verb phrases, sentence case: "Shipping address", not
  "STEP 2: ENTER YOUR SHIPPING ADDRESS".
- The active step carries `aria-current="step"`. Do not also mark it with colour alone.
- Use `vertical` when step descriptions run longer than a few words.

### Tradeoffs

Showing the full path sets expectations but can deter users at step one. If your flow is
long, consider splitting it so the first commitment is small.

## Props

```ts
import * as React from "react";

export interface Step {
  id?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

/** Shows position in a linear, multi-step task. */
export interface StepperProps extends React.HTMLAttributes<HTMLElement> {
  steps: Step[];
  /** Index of the active step, 0-based. Earlier steps render as complete. */
  current: number;
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  /** @default "Progress" */
  label?: string;
}

export declare function Stepper(props: StepperProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-surface-action` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-dim-hair` | primitive | `1px` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

export function Stepper({ steps = [], current = 0, orientation = "horizontal", label = "Progress", style, ...rest }) {
  const horiz = orientation === "horizontal";
  return (
    <nav aria-label={label} style={style} {...rest}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: horiz ? "row" : "column", gap: horiz ? "var(--dt-space-inline-sm)" : "var(--dt-space-stack-sm)" }}>
        {steps.map((s, i) => {
          const done = i < current, active = i === current;
          const ring = done ? "var(--dt-surface-action)" : active ? "var(--dt-surface-action)" : "var(--dt-surface-sunken)";
          const fg = done || active ? "var(--dt-text-on-action)" : "var(--dt-text-tertiary)";
          return (
            <li key={s.id || i} aria-current={active ? "step" : undefined} style={{ display: "flex", flexDirection: horiz ? "column" : "row", gap: horiz ? "var(--dt-space-stack-2xs)" : "var(--dt-space-inline-sm)", flex: horiz ? 1 : "none", alignItems: horiz ? "stretch" : "flex-start", minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
                <span aria-hidden="true" style={{
                  width: 24, height: 24, flex: "none", borderRadius: "var(--dt-radius-pill)",
                  background: ring, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
                  fontWeight: "var(--dt-font-weight-medium)",
                  border: active ? "none" : done ? "none" : "var(--dt-border-width-default) solid var(--dt-border-default)",
                }}>{done ? "✓" : i + 1}</span>
                {horiz && i < steps.length - 1 && <span aria-hidden="true" style={{ flex: 1, height: "var(--dt-dim-hair)", background: done ? "var(--dt-surface-action)" : "var(--dt-border-subtle)" }} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: "block", fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                  fontWeight: active ? "var(--dt-font-weight-semibold)" : "var(--dt-font-weight-medium)",
                  color: active || done ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
                }}>{s.label}</span>
                {s.description && <span style={{ display: "block", fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)", color: "var(--dt-text-tertiary)" }}>{s.description}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```
