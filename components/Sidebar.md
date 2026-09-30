# Sidebar

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [Sidebar.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/Sidebar.jsx), [Sidebar.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/Sidebar.d.ts), [Sidebar.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/Sidebar.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Sidebar.html

## Guidelines

Persistent navigation for products with more destinations than a Navbar can hold.

### Rules

- Group with `sections` once you pass roughly seven items. The section eyebrow is the
  one place uppercase is allowed.
- Icons are optional but all-or-nothing within a section. A mixed column reads as broken.
- The active item carries `aria-current="page"` plus a filled surface. Do not rely on
  the surface alone.
- Counts go in `trailing` as a Badge. Do not append them to the label string; they
  break truncation.
- Below roughly 900px, move the sidebar into a Drawer rather than shrinking it.

### Tradeoffs

A sidebar costs 240px of every screen forever in exchange for one-click access. On
content-heavy pages, a collapsible rail buys the width back at the cost of a click.

## Props

```ts
import * as React from "react";

export interface SidebarItem {
  id: string;
  label: React.ReactNode;
  href?: string;
  /** Lucide icon before the label. */
  icon?: React.ReactNode;
  /** Trailing slot, usually a Badge count. */
  trailing?: React.ReactNode;
}

export interface SidebarSection {
  /** Uppercase eyebrow above the group. Omit for an ungrouped list. */
  title?: string;
  items: SidebarItem[];
}

/** Vertical navigation rail for product shells. */
export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  sections: SidebarSection[];
  /** Id of the active item. */
  current?: string;
  onNavigate?: (id: string) => void;
  /** Slot above the sections — workspace switcher, logo. */
  header?: React.ReactNode;
  /** Slot pinned to the bottom — account, help. */
  footer?: React.ReactNode;
  /** @default "Sections" */
  label?: string;
  /** @default 240 */
  width?: number | string;
}

export declare function Sidebar(props: SidebarProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-surface-selected` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-subtle` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-family-mono` | primitive | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-font-weight-regular` | primitive | `400` |
| `--dt-tracking-wide` | primitive | `0.02em` |
| `--dt-motion-duration-fast` | none | not declared |
| `--dt-motion-easing-standard` | none | not declared |

## Source

```jsx
import React from "react";

export function Sidebar({ sections = [], current, onNavigate, header, footer, label = "Sections", width = 240, style, ...rest }) {
  return (
    <nav aria-label={label} style={{
      width, flex: "none", display: "flex", flexDirection: "column",
      gap: "var(--dt-space-stack-md)", padding: "var(--dt-space-inset-md)",
      background: "var(--dt-surface-subtle)",
      borderRight: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
      boxSizing: "border-box", ...style,
    }} {...rest}>
      {header}
      {sections.map((s, si) => (
        <div key={s.title || si} style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
          {s.title && (
            <span style={{
              fontFamily: "var(--dt-text-eyebrow-family, var(--dt-font-family-mono))",
              fontSize: "var(--dt-text-label-sm-size)", textTransform: "uppercase",
              letterSpacing: "var(--dt-tracking-wide, 0.05em)", color: "var(--dt-text-tertiary)",
              padding: "0 var(--dt-space-inset-xs)",
            }}>{s.title}</span>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {s.items.map(it => {
              const on = it.id === current;
              return (
                <li key={it.id}>
                  <a
                    href={it.href || "#"}
                    aria-current={on ? "page" : undefined}
                    onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate(it.id); } }}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
                      padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm)",
                      borderRadius: "var(--dt-radius-control)", textDecoration: "none",
                      background: on ? "var(--dt-surface-selected)" : "transparent",
                      color: on ? "var(--dt-text-on-selected)" : "var(--dt-text-secondary)",
                      fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                      fontWeight: on ? "var(--dt-font-weight-medium)" : "var(--dt-font-weight-regular)",
                      transition: "background var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
                    }}
                  >
                    {it.icon && <span style={{ flex: "none", display: "flex" }}>{it.icon}</span>}
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                    {it.trailing}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {footer && <div style={{ marginTop: "auto" }}>{footer}</div>}
    </nav>
  );
}
```
