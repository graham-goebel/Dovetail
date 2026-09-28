# Pagination

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [Pagination.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/Pagination.jsx), [Pagination.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/Pagination.d.ts), [Pagination.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/Pagination.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Pagination.html

## Guidelines

Moves through a result set one page at a time. Use it when the user needs a stable
position they can return to or cite.

### Rules

- Pages are 1-indexed, matching what the user reads.
- Show the total. A user who cannot see how much is left cannot decide whether to page
  or to filter.
- Disable, never hide, the previous and next controls at the ends. A control that
  vanishes shifts the row under the cursor.
- Every number is labelled "Page N" for screen readers; the current one carries
  `aria-current="page"`.

### Tradeoffs

Pagination beats infinite scroll for findability and deep linking, and loses to it for
casual browsing. Use it for tables and search results, not for feeds.

## Props

```ts
import * as React from "react";

/** Page-by-page navigation for a known result count. */
export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  /** Current page, 1-indexed. */
  page: number;
  totalPages: number;
  onChange?: (page: number) => void;
  /** @default "Pagination" */
  label?: string;
}

export declare function Pagination(props: PaginationProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-selected` | semantic | `var(--dt-color-primary-600)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-6)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-selected` | semantic | `var(--dt-color-primary-050)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-motion-duration-fast` | none | not declared |
| `--dt-motion-easing-standard` | none | not declared |

## Source

```jsx
import React from "react";

function pages(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (page >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", page - 1, page, page + 1, "…", total];
}

export function Pagination({ page = 1, totalPages = 1, onChange, label = "Pagination", style, ...rest }) {
  const btn = (on, disabled) => ({
    minWidth: 32, height: 32, padding: "0 var(--dt-space-inset-xs)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: "var(--dt-radius-control)",
    border: `var(--dt-border-width-default) solid ${on ? "var(--dt-border-selected)" : "var(--dt-border-default)"}`,
    background: on ? "var(--dt-surface-selected)" : "var(--dt-surface-base)",
    color: disabled ? "var(--dt-text-disabled)" : on ? "var(--dt-text-on-selected)" : "var(--dt-text-primary)",
    fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
    fontWeight: "var(--dt-font-weight-medium)", fontVariantNumeric: "tabular-nums",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
  });
  return (
    <nav aria-label={label} style={style} {...rest}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "var(--dt-space-inline-2xs)", alignItems: "center", flexWrap: "wrap" }}>
        <li><button type="button" disabled={page <= 1} onClick={() => onChange && onChange(page - 1)} style={btn(false, page <= 1)} aria-label="Previous page">‹</button></li>
        {pages(page, totalPages).map((p, i) =>
          p === "…" ? (
            <li key={"gap" + i}><span aria-hidden="true" style={{ padding: "0 var(--dt-space-inline-2xs)", color: "var(--dt-text-tertiary)" }}>…</span></li>
          ) : (
            <li key={p}>
              <button type="button" aria-current={p === page ? "page" : undefined} aria-label={"Page " + p} onClick={() => onChange && onChange(p)} style={btn(p === page, false)}>{p}</button>
            </li>
          )
        )}
        <li><button type="button" disabled={page >= totalPages} onClick={() => onChange && onChange(page + 1)} style={btn(false, page >= totalPages)} aria-label="Next page">›</button></li>
      </ul>
    </nav>
  );
}
```
