# Navbar

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [Navbar.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/Navbar.jsx), [Navbar.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/Navbar.d.ts), [Navbar.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/Navbar.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Navbar.html

## Guidelines

Top-level navigation for marketing pages and product shells with few destinations.

### Rules

- Five links or fewer. A navbar is a shortlist, not a sitemap; deeper structures belong
  in a Sidebar or a footer.
- The active link carries `aria-current="page"` and a visible underline. Colour alone
  does not mark position.
- One primary action in `actions`, at most. Two filled buttons side by side means
  neither is primary.
- Do not put the current page's own section links here. Those are Tabs.

### Tradeoffs

Horizontal bars run out of room fast. Below `collapseBelow` (640px by default) the link
row becomes a menu button that opens the same links in a Drawer, with `actions` moved to
the drawer's footer, so a phone never gets a sideways-scrolling strip of links. Pass
`collapseBelow={0}` only when the bar holds so few links it fits at every width.

## Props

```ts
import * as React from "react";

export interface NavLink {
  id: string;
  label: React.ReactNode;
  href?: string;
}

/** Horizontal top-level navigation bar. */
export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Logo or wordmark slot. */
  brand?: React.ReactNode;
  links: NavLink[];
  /** Id of the active link. */
  current?: string;
  /** When set, link clicks are intercepted and routed through this. */
  onNavigate?: (id: string) => void;
  /** Right-hand slot for buttons, search, or an Avatar. */
  actions?: React.ReactNode;
  /** @default "Main" */
  label?: string;
  /** @default false */
  sticky?: boolean;
  /**
   * Below this width in pixels the link row becomes a menu button that opens
   * the links in a Drawer, with `actions` in the drawer's footer. Pass 0 to keep
   * the row at every width. @default 640
   */
  collapseBelow?: number;
}

export declare function Navbar(props: NavbarProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-size-control-md` | semantic | `var(--dt-dim-10)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-z-sticky` | semantic | `100` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";

function MenuIcon() {
  return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }} aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
  );
}

function useNarrow(below) {
  const query = below ? `(max-width: ${below - 1}px)` : null;
  const [narrow, setNarrow] = React.useState(() => !!(query && typeof window !== "undefined" && window.matchMedia && window.matchMedia(query).matches));
  React.useEffect(() => {
    if (!query || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return narrow;
}

export function Navbar({ brand, links = [], actions, current, onNavigate, label = "Main", sticky = false, collapseBelow = 640, style, ...rest }) {
  const narrow = useNarrow(collapseBelow) && links.length > 0;
  const [open, setOpen] = React.useState(false);
  const go = (id) => { setOpen(false); if (onNavigate) onNavigate(id); };
  return (
    <nav aria-label={label} style={{
      display: "flex", alignItems: "center", gap: "var(--dt-space-inline-lg)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-lg)",
      background: "var(--dt-surface-base)",
      borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
      position: sticky ? "sticky" : "static", top: 0, zIndex: sticky ? "var(--dt-z-sticky)" : undefined, ...style,
    }} {...rest}>
      {brand && <span style={{ display: "flex", alignItems: "center", flex: "none" }}>{brand}</span>}
      {!narrow && <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "var(--dt-space-inline-md)", alignItems: "center", flex: 1, minWidth: 0, overflowX: "auto" }}>
        {links.map(l => {
          const on = l.id === current;
          return (
            <li key={l.id}>
              <a
                href={l.href || "#"}
                aria-current={on ? "page" : undefined}
                onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate(l.id); } }}
                style={{
                  fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                  fontWeight: "var(--dt-font-weight-medium)", textDecoration: "none", whiteSpace: "nowrap",
                  color: on ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
                  padding: "var(--dt-space-inset-2xs, 4px) 0",
                  borderBottom: `2px solid ${on ? "var(--dt-border-selected)" : "transparent"}`,
                }}
              >{l.label}</a>
            </li>
          );
        })}
      </ul>}
      {actions && !narrow && <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)", flex: "none" }}>{actions}</span>}
      {narrow && (
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "var(--dt-size-control-md)", height: "var(--dt-size-control-md)",
            border: 0, borderRadius: "var(--dt-radius-control)", background: "transparent",
            color: "var(--dt-text-primary)", cursor: "pointer",
          }}
        ><MenuIcon /></button>
      )}
      {narrow && (
        <Drawer open={open} onClose={() => setOpen(false)} side="right" title="Menu" label={label + " menu"} footer={actions}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {links.map(l => {
              const on = l.id === current;
              return (
                <li key={l.id}>
                  <a
                    href={l.href || "#"}
                    aria-current={on ? "page" : undefined}
                    onClick={e => { if (onNavigate) e.preventDefault(); go(l.id); }}
                    style={{
                      display: "block", padding: "var(--dt-space-inset-sm) 0",
                      fontFamily: "var(--dt-text-label-lg-family)", fontSize: "var(--dt-text-label-lg-size)",
                      fontWeight: "var(--dt-font-weight-medium)", textDecoration: "none",
                      color: on ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
                      borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
                    }}
                  >{l.label}</a>
                </li>
              );
            })}
          </ul>
        </Drawer>
      )}
    </nav>
  );
}
```
