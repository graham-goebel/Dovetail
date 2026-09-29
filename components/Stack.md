# Stack

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [Stack.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/Stack.jsx), [Stack.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/Stack.d.ts), [Stack.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/Stack.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Stack.html

## Guidelines

Vertical layout primitive. It owns the space between its children, so nothing inside needs a margin.

### Use it when
- Anything stacks vertically: form fields, card contents, page sections.
- You would otherwise write `margin-bottom` on every child but the last.

### Don't use it when
- The layout is horizontal. Use `Inline`.
- Children need to wrap onto multiple rows. Use `Grid`.

### Example
```jsx
<Stack gap="lg">
  <Heading>Billing</Heading>
  <Card>…</Card>
</Stack>
```

### Layers and spacing
`gap` picks a step of the stack scale. `layer` says instead how closely the things either side of the gap belong together, and lets the layout's character decide the distance:

```jsx
<Stack layer="section" spacing="open">
  <Stack layer="group">…</Stack>
  <Stack layer="group">…</Stack>
</Stack>
```

- `related`: parts of one thing, such as a label and its value.
- `group`: members of a set, such as the fields in a form.
- `block`: one unit from the next, such as a card from a card.
- `section`: a theme from the next within a region.

For text, `eyebrow` sets the gap between an eyebrow and its heading, `subcopy` between a heading and the lead under it, and `paragraph` between one paragraph and the next. Nest them: an `eyebrow` stack of the eyebrow and heading, inside a `subcopy` stack with the lead.

`spacing="tight"` pulls the layers together for a technical screen; `open` leaves related things close and moves the layers apart. It sets `data-layout` on the stack, so everything inside follows. See Foundations, Layout.

### Composition
Nests freely inside `Inline`, `Grid`, and itself. `as` lets it render as `section`, `ul`, or `form` without a wrapper.

### Tokens
`--dt-space-stack-*` for `gap`, and `--dt-layout-stack-*` and `--dt-layout-text-*` for `layer`, multiplied by `--dt-layout-scale` (1 on a page). The context layer retunes `xl` and `2xl`, so a marketing page gets more air than a dashboard from the same prop.

### Content
None. Stack renders no text of its own.

## Props

```ts
import * as React from "react";

/** Vertical layout. Owns the gap between children so they never set their own margins. */
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** Gap from the stack axis of the space scale. @default "md" */
  gap?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** How closely the things either side of this gap belong together, from the layout layers: `related` (parts of one thing), `group` (members of a set), `block` (one unit from the next), `section` (a theme from the next); or, for text, `eyebrow` (an eyebrow and its heading), `subcopy` (a heading and the lead under it), `paragraph` (one paragraph and the next). Sets the gap from `--dt-layout-stack-*` or `--dt-layout-text-*`, which the layout's character moves as one, and wins over `gap`. */
  layer?: "related" | "group" | "block" | "section" | "eyebrow" | "subcopy" | "paragraph";
  /** The layout's character for this element and everything inside it: `tight` (technical), `balanced` or `open` (breathing room). Sets `data-layout`, which re-declares the layer tokens here. Inherited from the page when not set. */
  spacing?: "tight" | "balanced" | "open";
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  /** Element to render. @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Stack(props: StackProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-layout-scale` | semantic | `1` |
| `--dt-layout-stack-block` | semantic | `var(--dt-dim-8)` |
| `--dt-layout-stack-group` | semantic | `var(--dt-dim-4)` |
| `--dt-layout-stack-related` | semantic | `var(--dt-dim-2)` |
| `--dt-layout-stack-section` | semantic | `var(--dt-dim-16)` |
| `--dt-layout-text-eyebrow` | semantic | `var(--dt-space-stack-sm)` |
| `--dt-layout-text-paragraph` | semantic | `var(--dt-space-stack-md)` |
| `--dt-layout-text-subcopy` | semantic | `var(--dt-space-stack-sm)` |
| `--dt-space-stack-2xl` | semantic | `var(--dt-dim-16)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-xl` | semantic | `var(--dt-dim-10)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |

## Source

```jsx
import React from "react";

const GAPS = { "2xs": "var(--dt-space-stack-2xs)", xs: "var(--dt-space-stack-xs)", sm: "var(--dt-space-stack-sm)", md: "var(--dt-space-stack-md)", lg: "var(--dt-space-stack-lg)", xl: "var(--dt-space-stack-xl)", "2xl": "var(--dt-space-stack-2xl)" };

/* Each layer is drawn at --dt-layout-scale, 1 on a page, so a surface at
   another size (a social artboard) keeps its proportions. */
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;
const LAYERS = {
  related: scaled("--dt-layout-stack-related"), group: scaled("--dt-layout-stack-group"), block: scaled("--dt-layout-stack-block"), section: scaled("--dt-layout-stack-section"),
  eyebrow: scaled("--dt-layout-text-eyebrow"), subcopy: scaled("--dt-layout-text-subcopy"), paragraph: scaled("--dt-layout-text-paragraph"),
};

export function Stack({ gap = "md", layer, spacing, align, justify, as: Tag = "div", children, style, ...rest }) {
  return (
    <Tag data-layout={spacing} style={{ display: "flex", flexDirection: "column", gap: LAYERS[layer] || GAPS[gap] || GAPS.md, alignItems: align, justifyContent: justify, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
```
