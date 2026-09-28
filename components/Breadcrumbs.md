# Breadcrumbs

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [Breadcrumbs.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/Breadcrumbs.jsx), [Breadcrumbs.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/Breadcrumbs.d.ts), [Breadcrumbs.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/Breadcrumbs.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Breadcrumbs.html

## Guidelines

Tells the user where they are in a nested structure and gives them one click back up.
Use it for hierarchies at least three levels deep.

### Rules

- The last crumb is the current page. It renders as text with `aria-current="page"`,
  never as a link to itself.
- Breadcrumbs reflect hierarchy, not history. Do not build them from the back stack;
  that is what the browser button is for.
- Keep labels short. Truncate long titles rather than wrapping the trail onto two lines.
- Two levels does not need a trail. Use a single back link instead.

### Tradeoffs

Deep trails eat a row of vertical space on every page to serve a minority of navigation
events. On mobile, consider collapsing the middle crumbs to an ellipsis.

## Props

```ts
import * as React from "react";

export interface Crumb {
  label: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/** Shows where the current page sits in the hierarchy. */
export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  /** Root first, current page last. The last item renders as text, not a link. */
  items: Crumb[];
  /** @default "Breadcrumb" */
  label?: string;
  /** @default "/" */
  separator?: React.ReactNode;
}

export declare function Breadcrumbs(props: BreadcrumbsProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";

export function Breadcrumbs({ items = [], label = "Breadcrumb", separator = "/", style, ...rest }) {
  return (
    <nav aria-label={label} style={style} {...rest}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.href || i} style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", minWidth: 0 }}>
              {last ? (
                <span aria-current="page" style={{
                  fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                  color: "var(--dt-text-primary)", fontWeight: "var(--dt-font-weight-medium)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{it.label}</span>
              ) : (
                <a href={it.href} onClick={it.onClick} style={{
                  fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                  color: "var(--dt-text-secondary)", textDecoration: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{it.label}</a>
              )}
              {!last && <span aria-hidden="true" style={{ color: "var(--dt-text-tertiary)", fontSize: "var(--dt-text-body-sm-size)" }}>{separator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```
