# Inline

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [Inline.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/Inline.jsx), [Inline.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/Inline.d.ts), [Inline.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/Inline.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Inline.html

## Guidelines

Horizontal layout primitive. Wraps by default, because a row of buttons that overflows on a phone is the most common responsive bug in a design system.

### Use it when
- Laying out buttons, chips, avatars, icons with labels, toolbar items.

### Don't use it when
- You need a fixed column structure. Use `Grid`.
- It is a run of text with inline links. Use ordinary flow.

### Example
```jsx
<Inline gap="xs" justify="flex-end">
  <Button variant="secondary">Cancel</Button>
  <Button>Save changes</Button>
</Inline>
```

### Variants
Set `wrap={false}` only when overflow is handled another way, such as a scrolling toolbar.

### Layers and spacing
`layer` sets the gap by how closely the neighbours belong together (`related`, `group`, `block` or `section`) instead of by step, and the layout's character moves it: `spacing="tight"` for a technical toolbar, `open` for room to breathe. It wins over `gap`. Where each layer sits in both directions is on Foundations, Layout.

```jsx
<Inline layer="related">
  <Icon name="clock" />
  <Text>4 days</Text>
</Inline>
```

### Tokens
`--dt-space-inline-*` for `gap`, and `--dt-layout-inline-*` for `layer`.

## Props

```ts
import * as React from "react";

/** Horizontal layout. Wraps by default so button rows survive narrow viewports. */
export interface InlineProps extends React.HTMLAttributes<HTMLElement> {
  /** Gap from the inline axis of the space scale. @default "sm" */
  gap?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** How closely the things either side of this gap belong together, from the layout layers: `related` (parts of one thing), `group` (members of a set), `block` (one unit from the next), `section` (a theme from the next). Sets the gap from `--dt-layout-inline-*`, which the layout's character moves as one, and wins over `gap`. */
  layer?: "related" | "group" | "block" | "section";
  /** The layout's character for this element and everything inside it: `tight` (technical), `balanced` or `open` (breathing room). Sets `data-layout`, which re-declares the layer tokens here. Inherited from the page when not set. */
  spacing?: "tight" | "balanced" | "open";
  /** @default "center" */
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  /** Allow children to wrap onto a new row. @default true */
  wrap?: boolean;
  /** @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Inline(props: InlineProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-layout-inline-block` | semantic | `var(--dt-dim-6)` |
| `--dt-layout-inline-group` | semantic | `var(--dt-dim-3)` |
| `--dt-layout-inline-related` | semantic | `var(--dt-dim-2)` |
| `--dt-layout-inline-section` | semantic | `var(--dt-dim-12)` |
| `--dt-layout-scale` | semantic | `1` |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xl` | semantic | `var(--dt-dim-8)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |

## Source

```jsx
import React from "react";

const GAPS = { "2xs": "var(--dt-space-inline-2xs)", xs: "var(--dt-space-inline-xs)", sm: "var(--dt-space-inline-sm)", md: "var(--dt-space-inline-md)", lg: "var(--dt-space-inline-lg)", xl: "var(--dt-space-inline-xl)", "2xl": "var(--dt-space-inline-2xl)" };

/* Drawn at --dt-layout-scale, 1 on a page, so a surface at another size keeps
   its proportions. */
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;
const LAYERS = { related: scaled("--dt-layout-inline-related"), group: scaled("--dt-layout-inline-group"), block: scaled("--dt-layout-inline-block"), section: scaled("--dt-layout-inline-section") };

export function Inline({ gap = "sm", layer, spacing, align = "center", justify, wrap = true, as: Tag = "div", children, style, ...rest }) {
  return (
    <Tag data-layout={spacing} style={{ display: "flex", flexDirection: "row", gap: LAYERS[layer] || GAPS[gap] || GAPS.sm, alignItems: align, justifyContent: justify, flexWrap: wrap ? "wrap" : "nowrap", ...style }} {...rest}>
      {children}
    </Tag>
  );
}
```
