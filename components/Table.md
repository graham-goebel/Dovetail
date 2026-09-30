# Table

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Table.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Table.jsx), [Table.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Table.d.ts), [Table.md](https://graham-goebel.github.io/Dovetail/system/components/display/Table.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Table.html

## Guidelines

Compares records across several fields at once. Use it when the user reads across a row
as often as down a column.

### Rules

- Give every table a `caption`. It is the accessible name and it tells a scanning reader
  what the rows are before they parse the headers.
- Right-align numbers. The component turns on tabular figures for right-aligned columns
  so digits line up.
- Use `dense` for data tables over roughly fifteen rows. Use the default padding for
  short summary tables where each row is a decision.
- `zebra` and hairlines are alternatives, not a pair. Stripes plus borders on every row
  reads as noise.

### Tradeoffs

Tables do not reflow. Below roughly 600px a multi-column table either scrolls sideways or
has to become a List. Decide which before you ship a responsive view.

## Props

```ts
import * as React from "react";

export interface TableColumn<Row = any> {
  /** Field name on the row, and the React key. */
  key: string;
  /** Column heading. */
  header: React.ReactNode;
  /** Use "right" for numeric columns — it also enables tabular figures. @default "left" */
  align?: "left" | "center" | "right";
  /** Fixed column width, e.g. "120px" or "20%". */
  width?: string;
  /** Custom cell renderer. Receives the whole row. */
  render?: (row: Row) => React.ReactNode;
}

/** Tabular data with a header row. */
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  columns: TableColumn[];
  rows: Array<Record<string, any>>;
  /** Visible description above the table. Also serves as the accessible name. */
  caption?: React.ReactNode;
  /** Tighter row padding for data-heavy views. @default false */
  dense?: boolean;
  /** Alternating row tint. @default false */
  zebra?: boolean;
}

export declare function Table(props: TableProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-subtle` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";

export function Table({ columns = [], rows = [], caption, dense = false, zebra = false, style, ...rest }) {
  const pad = dense ? "var(--dt-space-inset-xs) var(--dt-space-inset-sm)" : "var(--dt-space-inset-sm) var(--dt-space-inset-md)";
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", ...style }} {...rest}>
      {caption && <caption style={{ captionSide: "top", textAlign: "left", padding: "0 0 var(--dt-space-stack-xs)", color: "var(--dt-text-secondary)", fontSize: "var(--dt-text-body-sm-size)" }}>{caption}</caption>}
      <thead>
        <tr>
          {columns.map(c => (
            <th key={c.key} scope="col" style={{
              textAlign: c.align || "left", padding: pad,
              fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
              fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-secondary)",
              borderBottom: "var(--dt-border-width-default) solid var(--dt-border-default)",
              whiteSpace: "nowrap", width: c.width,
            }}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id ?? i} style={{ background: zebra && i % 2 === 1 ? "var(--dt-surface-subtle)" : "transparent" }}>
            {columns.map(c => (
              <td key={c.key} style={{
                padding: pad, textAlign: c.align || "left", color: "var(--dt-text-primary)",
                borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
                fontVariantNumeric: c.align === "right" ? "tabular-nums" : undefined,
              }}>{c.render ? c.render(r) : r[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```
