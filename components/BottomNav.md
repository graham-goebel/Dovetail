# BottomNav

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [BottomNav.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/BottomNav.jsx), [BottomNav.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/BottomNav.d.ts), [BottomNav.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/BottomNav.md).

Live page: https://graham-goebel.github.io/Dovetail/components/BottomNav.html

## Guidelines

A phone app's primary navigation: three to five destinations docked to the bottom of the screen, where a thumb can reach them, with the home indicator's safe area kept clear.

### Use it when
- A phone app has a handful of top-level destinations a person moves between often.
- Inside an `AppShell`, passed as `bottomNav`.

### Don't use it when
- There are more than five destinations. Put the rest behind a "More" item or in a Drawer.
- It is a website rather than an app. Use `Navbar`, which collapses to a menu on a phone.
- The choices are views of one screen. Those are `Tabs`.

### Variants
- `bar`: a full-width docked bar, glass by default, with an indicator pill behind the active icon.
- `floating`: an inset glass pill that sits over a fade of the page surface, with room for an `action` beside it, such as an add or record button. Good over imagery and dark, immersive screens.

### Example
```jsx
<BottomNav
  current={tab}
  onNavigate={setTab}
  items={[
    { id: "today", label: "Today", icon: <HomeIcon /> },
    { id: "trends", label: "Trends", icon: <ChartIcon />, badge: 2 },
    { id: "me", label: "Me", icon: <UserIcon /> },
  ]}
/>
```

Every item is at least `--dt-size-touch-target` tall. The current item carries `aria-current="page"`, and a badge is announced with its label ("Trends, 2 new"), so it is not colour alone.

### Tokens
`--dt-bottomnav-*` (Tier 3): the bar surface and border, the item colours at rest and active, the indicator for each variant, and the badge. The bar reads `--dt-surface-glass` and `--dt-backdrop-glass`; the floating variant sits on `--dt-scrim-fade-bottom`.

## Props

```ts
import * as React from "react";

export interface BottomNavItem {
  id: string;
  label: React.ReactNode;
  /** A 24px glyph. It inherits the item's colour. */
  icon: React.ReactNode;
  /** Renders the item as a link. Without it the item is a button. */
  href?: string;
  /** A count, or true for a dot. Announced with the label. */
  badge?: number | boolean;
}

/**
 * A phone app's primary navigation, docked to the bottom of the screen with
 * the home indicator's safe area kept clear. Three to five destinations.
 */
export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  items: BottomNavItem[];
  /** Id of the current destination. */
  current?: string;
  /** Called with an item's id. When set, link items are intercepted and routed through it. */
  onNavigate?: (id: string) => void;
  /**
   * bar is a full-width docked bar with an indicator pill behind the active
   * icon. floating is an inset glass pill over a fade of the page surface,
   * with room for an action button beside it. @default "bar"
   */
  variant?: "bar" | "floating";
  /** Glass that content scrolls beneath. Off gives a solid overlay surface. @default true */
  translucent?: boolean;
  /** A primary action beside the destinations, usually a round IconButton: add, compose, record. */
  action?: React.ReactNode;
  /** @default "Main" */
  label?: string;
}

export declare function BottomNav(props: BottomNavProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-bottomnav-badge-bg` | component | `var(--dt-surface-danger)` |
| `--dt-bottomnav-badge-fg` | component | `var(--dt-text-on-danger)` |
| `--dt-bottomnav-bg` | component | `var(--dt-surface-glass)` |
| `--dt-bottomnav-border` | component | `var(--dt-border-glass)` |
| `--dt-bottomnav-fg` | component | `var(--dt-text-secondary)` |
| `--dt-bottomnav-fg-active` | component | `var(--dt-text-primary)` |
| `--dt-bottomnav-indicator` | component | `var(--dt-surface-selected)` |
| `--dt-bottomnav-indicator-floating` | component | `var(--dt-surface-glass-tint)` |
| `--dt-backdrop-glass` | semantic | `saturate(1.4) blur(var(--dt-blur-glass))` |
| `--dt-border-glass` | semantic | `color-mix(in oklab, var(--dt-text-primary) 10%, transparent)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-6)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-scrim-fade-bottom` | semantic | `linear-gradient(to top, var(--dt-surface-base) 40%, transparent)` |
| `--dt-size-icon-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-size-touch-target` | semantic | `var(--dt-dim-11)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-danger` | semantic | `var(--dt-color-red-600)` |
| `--dt-surface-glass` | semantic | `color-mix(in oklab, var(--dt-surface-overlay) 72%, transparent)` |
| `--dt-surface-glass-tint` | semantic | `color-mix(in oklab, var(--dt-text-primary) 8%, transparent)` |
| `--dt-surface-overlay` | semantic | `var(--dt-color-white)` |
| `--dt-surface-selected` | semantic | `var(--dt-color-primary-050)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-dim-1` | primitive | `4px` |
| `--dt-dim-14` | primitive | `56px` |
| `--dt-dim-2` | primitive | `8px` |
| `--dt-dim-4` | primitive | `16px` |
| `--dt-dim-7` | primitive | `28px` |
| `--dt-font-size-2xs` | primitive | `11px` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

const GLASS = "var(--dt-backdrop-glass, saturate(1.4) blur(16px))";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

function NavBadge({ value }) {
  if (!value) return null;
  const dot = value === true;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute", top: dot ? 0 : -4, right: dot ? 0 : -8,
        minWidth: dot ? "var(--dt-dim-2)" : "var(--dt-dim-4)", height: dot ? "var(--dt-dim-2)" : "var(--dt-dim-4)",
        padding: dot ? 0 : "0 var(--dt-dim-1)", boxSizing: "border-box",
        borderRadius: "var(--dt-radius-pill)",
        background: "var(--dt-bottomnav-badge-bg, var(--dt-surface-danger))",
        color: "var(--dt-bottomnav-badge-fg, var(--dt-text-on-danger))",
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-font-size-2xs)", lineHeight: "var(--dt-dim-4)",
        fontWeight: "var(--dt-font-weight-semibold)", textAlign: "center",
      }}
    >
      {dot ? null : value > 99 ? "99+" : value}
    </span>
  );
}

export function BottomNav({ items = [], current, onNavigate, variant = "bar", translucent = true, action, label = "Main", style, ...rest }) {
  const floating = variant === "floating";
  const surface = translucent
    ? { background: "var(--dt-bottomnav-bg, var(--dt-surface-glass))", backdropFilter: GLASS, WebkitBackdropFilter: GLASS }
    : { background: "var(--dt-surface-overlay)" };

  const list = (
    <ul
      style={{
        listStyle: "none", margin: 0, flex: 1, minWidth: 0,
        display: "grid", gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
        padding: floating ? "var(--dt-space-inset-2xs)" : "var(--dt-space-inset-2xs) var(--dt-space-inset-xs)",
        ...(floating
          ? { ...surface, borderRadius: "var(--dt-radius-pill)", border: "var(--dt-border-width-default) solid var(--dt-bottomnav-border, var(--dt-border-glass))" }
          : null),
      }}
    >
      {items.map((item) => {
        const on = item.id === current;
        const Tag = item.href ? "a" : "button";
        const badgeText = item.badge === true ? ", new" : item.badge ? ", " + item.badge + " new" : "";
        return (
          <li key={item.id} style={{ display: "flex", minWidth: 0 }}>
            <Tag
              {...(item.href ? { href: item.href } : { type: "button" })}
              aria-current={on ? "page" : undefined}
              aria-label={typeof item.label === "string" ? item.label + badgeText : undefined}
              onClick={(e) => {
                if (!onNavigate) return;
                if (item.href) e.preventDefault();
                onNavigate(item.id);
              }}
              style={{
                flex: 1, minWidth: 0, minHeight: "var(--dt-size-touch-target, 44px)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "var(--dt-space-stack-2xs)", padding: "var(--dt-space-inset-2xs) 0",
                border: 0, borderRadius: floating ? "var(--dt-radius-pill)" : "var(--dt-radius-control)",
                background: floating && on ? "var(--dt-bottomnav-indicator-floating, var(--dt-surface-glass-tint))" : "transparent",
                color: on ? "var(--dt-bottomnav-fg-active, var(--dt-text-primary))" : "var(--dt-bottomnav-fg, var(--dt-text-secondary))",
                textDecoration: "none", cursor: "pointer", font: "inherit",
                transition: "color var(--dt-motion-micro), background var(--dt-motion-micro)",
              }}
            >
              <span
                style={{
                  position: "relative", display: "grid", placeItems: "center",
                  width: floating ? "var(--dt-size-icon-lg)" : "var(--dt-dim-14)", height: "var(--dt-dim-7)",
                  borderRadius: "var(--dt-radius-pill)",
                  background: !floating && on ? "var(--dt-bottomnav-indicator, var(--dt-surface-selected))" : "transparent",
                  transition: "background var(--dt-motion-micro)",
                }}
              >
                <span style={{ display: "grid", placeItems: "center", width: "var(--dt-size-icon-lg)", height: "var(--dt-size-icon-lg)" }}>{item.icon}</span>
                <NavBadge value={item.badge} />
              </span>
              <span
                style={{
                  maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
                  lineHeight: "var(--dt-text-label-sm-line)", fontWeight: on ? "var(--dt-font-weight-semibold)" : "var(--dt-text-label-sm-weight)",
                }}
              >
                {item.label}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );

  if (floating) {
    return (
      <nav
        aria-label={label}
        style={{
          display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
          padding: `var(--dt-space-inset-md) var(--dt-space-inset-md) calc(var(--dt-space-inset-md) + ${SAFE_BOTTOM})`,
          background: "var(--dt-scrim-fade-bottom, transparent)",
          ...style,
        }}
        {...rest}
      >
        {list}
        {action && <span style={{ flex: "none", display: "flex" }}>{action}</span>}
      </nav>
    );
  }

  return (
    <nav
      aria-label={label}
      style={{
        display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
        paddingBottom: SAFE_BOTTOM,
        borderTop: "var(--dt-border-width-default) solid var(--dt-bottomnav-border, var(--dt-border-glass))",
        ...surface,
        ...style,
      }}
      {...rest}
    >
      {list}
      {action && <span style={{ flex: "none", display: "flex", paddingRight: "var(--dt-space-inset-sm)" }}>{action}</span>}
    </nav>
  );
}
```
