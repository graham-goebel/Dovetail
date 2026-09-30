# Divider

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [Divider.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/Divider.jsx), [Divider.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/Divider.d.ts), [Divider.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/Divider.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Divider.html

## Guidelines

A rule between content groups.

### Use it when
- Separating sections inside a card or menu where whitespace alone is ambiguous.
- Splitting alternative paths, with `label="or"`.

### Don't use it when
- Space would do the job. Reach for `Stack` with a larger gap first; a divider is visual debt.
- Between every row of a list. Use one border on the container instead.

### Example
```jsx
<Divider />
<Divider label="or" />
<Divider orientation="vertical" />
```

### Accessibility
Renders `role="separator"`, with `aria-orientation` on the vertical variant.

### Tokens
`--dt-border-subtle` by default; `--dt-border-default` and `--dt-border-strong` via `tone`.

## Props

```ts
import * as React from "react";

/** Rule between content groups. Optional centred label. */
export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  /** Centred label, horizontal only, e.g. "or" */
  label?: string;
  /** @default "subtle" */
  tone?: "subtle" | "default" | "strong";
}

export declare function Divider(props: DividerProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-strong` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |

## Source

```jsx
import React from "react";

export function Divider({ orientation = "horizontal", label, tone = "subtle", style, ...rest }) {
  const color = tone === "strong" ? "var(--dt-border-strong)" : tone === "default" ? "var(--dt-border-default)" : "var(--dt-border-subtle)";
  if (orientation === "vertical") {
    return <div role="separator" aria-orientation="vertical" style={{ width: "var(--dt-border-width-default)", alignSelf: "stretch", background: color, ...style }} {...rest} />;
  }
  if (label) {
    return (
      <div role="separator" style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)", ...style }} {...rest}>
        <span style={{ height: "var(--dt-border-width-default)", background: color, flex: 1 }} />
        <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", fontWeight: "var(--dt-text-label-sm-weight)", color: "var(--dt-text-tertiary)" }}>{label}</span>
        <span style={{ height: "var(--dt-border-width-default)", background: color, flex: 1 }} />
      </div>
    );
  }
  return <div role="separator" style={{ height: "var(--dt-border-width-default)", background: color, width: "100%", ...style }} {...rest} />;
}
```
