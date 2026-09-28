# List

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [List.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/List.jsx), [List.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/List.d.ts), [List.md](https://graham-goebel.github.io/Dovetail/system/components/display/List.md).

Live page: https://graham-goebel.github.io/Dovetail/components/List.html

## Guidelines

Presents a sequence of comparable records: files, members, notifications, settings.
Use it when rows share a shape and the user scans down one column.

### Rules

- `label` is required. An unlabelled list gives a screen reader no context for the count
  it announces.
- Set `interactive` only when rows navigate or select. A row that looks clickable and
  does nothing is worse than a plain row.
- One trailing action per row. Two competing controls in a row make the hit target
  ambiguous on touch.
- Keep `description` to one line. If a row needs more, it is a Card, not a list item.

### Tradeoffs

Lists scan faster than tables but carry less data per row. Once you need more than a
title, a description, and one piece of metadata, move to Table.

## Props

```ts
import * as React from "react";

export interface ListItem {
  id?: string | number;
  /** Primary line. */
  title: React.ReactNode;
  /** Secondary line under the title. */
  description?: React.ReactNode;
  /** Slot before the text — an Avatar, icon, or checkbox. */
  leading?: React.ReactNode;
  /** Slot after the text — a Badge, action, or chevron. */
  trailing?: React.ReactNode;
  /** Makes the row a button when the list is interactive. */
  onClick?: () => void;
}

/** Vertical row list with optional leading and trailing slots. */
export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  items: ListItem[];
  /** Hairline between rows. @default true */
  divided?: boolean;
  /** Renders rows with onClick as buttons with hover feedback. @default false */
  interactive?: boolean;
  /** Accessible list label. Required. */
  label: string;
}

export declare function List(props: ListProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-motion-duration-fast` | none | not declared |
| `--dt-motion-easing-standard` | none | not declared |
| `--dt-surface-hover` | none | not declared |

## Source

```jsx
import React from "react";

export function List({ items = [], divided = true, interactive = false, label, style, ...rest }) {
  return (
    <ul role="list" aria-label={label} style={{ listStyle: "none", margin: 0, padding: 0, ...style }} {...rest}>
      {items.map((it, i) => {
        const clickable = interactive && it.onClick;
        const Row = clickable ? "button" : "div";
        return (
          <li key={it.id ?? i} style={{ borderTop: i === 0 || !divided ? "none" : "var(--dt-border-width-default) solid var(--dt-border-subtle)" }}>
            <Row
              onClick={it.onClick}
              type={clickable ? "button" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
                width: "100%", boxSizing: "border-box", textAlign: "left",
                padding: "var(--dt-space-inset-sm) var(--dt-space-inset-md)",
                background: "transparent", border: "none", font: "inherit", color: "inherit",
                cursor: clickable ? "pointer" : "default",
                transition: "background var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
              }}
              onMouseEnter={clickable ? e => (e.currentTarget.style.background = "var(--dt-surface-hover)") : undefined}
              onMouseLeave={clickable ? e => (e.currentTarget.style.background = "transparent") : undefined}
            >
              {it.leading && <span style={{ flex: "none", display: "flex" }}>{it.leading}</span>}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: "block", fontFamily: "var(--dt-text-body-md-family)", fontSize: "var(--dt-text-body-md-size)",
                  lineHeight: "var(--dt-text-body-md-line)", fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{it.title}</span>
                {it.description && (
                  <span style={{
                    display: "block", fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                    lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)",
                  }}>{it.description}</span>
                )}
              </span>
              {it.trailing && <span style={{ flex: "none", display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>{it.trailing}</span>}
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
```
