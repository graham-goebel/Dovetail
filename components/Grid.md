# Grid

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [Grid.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/Grid.jsx), [Grid.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/Grid.d.ts), [Grid.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/Grid.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Grid.html

## Guidelines

Equal-width column layout. Tracks use `minmax(0, 1fr)` so a long word in one cell cannot blow out the row.

### Use it when
- Card grids, feature rows, dashboard tiles, any repeating set.

### Don't use it when
- There are two or three items in a row that should size to content. Use `Inline`.

### Example
```jsx
<Grid minColumnWidth="240px" gap="lg">
  {plans.map((p) => <Card key={p.id} title={p.name} />)}
</Grid>
```

Prefer `minColumnWidth` over `columns`. It is responsive without a media query, and it degrades to one column on a phone automatically.

### When the count can change
`minColumnWidth` uses `auto-fit`, which lets the columns that exist grow to fill the row. That is right for a grid whose count never changes, and wrong for one a filter can narrow: a single result stretches across the whole row. Pass `track="fill"` and the empty tracks are kept, so one card stays one card wide.

```jsx
<Grid minColumnWidth="260px" track="fill">{results.map(renderCard)}</Grid>
```

### Tokens
`--dt-space-inline-*`.

## Props

```ts
import * as React from "react";

/** Equal-width column grid. Pass minColumnWidth for a responsive grid with no media queries. */
export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  /** Fixed column count. Ignored when minColumnWidth is set. @default 2 */
  columns?: number;
  /** @default "md" */
  gap?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** CSS length, e.g. "240px". Columns fit as many as will hold this width. */
  minColumnWidth?: string;
  /** With minColumnWidth: "fit" lets the columns that exist grow to fill the row;
   *  "fill" keeps the empty tracks, so a filter that lands on one result leaves
   *  one card at its intended width instead of stretching it. @default "fit" */
  track?: "fit" | "fill";
  align?: React.CSSProperties["alignItems"];
  /** @default "div" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Grid(props: GridProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xl` | semantic | `var(--dt-dim-8)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |

## Source

```jsx
import React from "react";

const GAPS = { xs: "var(--dt-space-inline-xs)", sm: "var(--dt-space-inline-sm)", md: "var(--dt-space-inline-md)", lg: "var(--dt-space-inline-lg)", xl: "var(--dt-space-inline-xl)", "2xl": "var(--dt-space-inline-2xl)" };

export function Grid({ columns = 2, gap = "md", minColumnWidth, track = "fit", align, as: Tag = "div", children, style, ...rest }) {
  const template = minColumnWidth
    ? `repeat(${track === "fill" ? "auto-fill" : "auto-fit"}, minmax(min(${minColumnWidth}, 100%), 1fr))`
    : `repeat(${columns}, minmax(0, 1fr))`;
  return (
    <Tag style={{ display: "grid", gridTemplateColumns: template, gap: GAPS[gap] || GAPS.md, alignItems: align, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
```
