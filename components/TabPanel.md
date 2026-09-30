# TabPanel

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [Tabs.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/Tabs.jsx), [Tabs.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/Tabs.d.ts), [Tabs.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/Tabs.md).

Live page: https://graham-goebel.github.io/Dovetail/components/TabPanel.html

## Guidelines

Switches between sibling views that share a purpose. Use tabs when the user compares or
alternates between panels, not to sequence a task.

### Rules

- `label` is required. A tablist with no name gives a screen reader nothing to announce
  before the tab count.
- Arrow keys move between tabs, wrapping at the ends, and Home/End jump to the first and
  last. Disabled tabs are skipped, never selected. That behaviour is built in; do not
  intercept keydown on the tablist.
- Pair every `Tabs` with `TabPanel`. The panel wires `aria-controls` and
  `aria-labelledby`; a bare div loses the relationship.
- Three to six tabs. Beyond that use a Sidebar; tabs that scroll horizontally hide options.
- Use `underline` inside page content and `pill` for compact filter switches in toolbars.

### Tradeoffs

Tabs hide everything but one panel, so users miss content they did not think to look for.
When the panels are short and related, stacking them with headings scans better.

## Props

```ts
import * as React from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Lucide icon before the label. */
  icon?: React.ReactNode;
  /** Trailing count, e.g. unread items. */
  count?: number;
  disabled?: boolean;
}

/** Switches between sibling views without leaving the page. */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tabs: TabItem[];
  /** Id of the selected tab. Controlled. */
  value: string;
  onChange?: (id: string) => void;
  /** Accessible tablist label. Required. */
  label: string;
  /** @default "underline" */
  variant?: "underline" | "pill";
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Must match the TabItem id this panel belongs to. */
  id: string;
  /** The currently selected tab id. */
  value: string;
  children?: React.ReactNode;
}

export declare function Tabs(props: TabsProps): React.JSX.Element;
export declare function TabPanel(props: TabPanelProps): React.JSX.Element | null;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-1` | semantic | `var(--dt-shadow-raw-1)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-raised` | semantic | `var(--dt-color-white)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-motion-duration-fast` | none | not declared |
| `--dt-motion-easing-standard` | none | not declared |

## Source

```jsx
import React from "react";

export function Tabs({ tabs = [], value, onChange, label, variant = "underline", style, ...rest }) {
  const refs = React.useRef([]);
  /* Keys move only among enabled tabs, wrapping at the ends, so a disabled
     tab is never selected or focused from the keyboard. */
  function onKeyDown(e) {
    const enabled = tabs.map((t, i) => i).filter(i => !tabs[i].disabled);
    if (!enabled.length) return;
    const at = enabled.indexOf(tabs.findIndex(t => t.id === value));
    let next = null;
    if (e.key === "ArrowRight") next = enabled[(at + 1) % enabled.length];
    if (e.key === "ArrowLeft") next = enabled[(at - 1 + enabled.length) % enabled.length];
    if (e.key === "Home") next = enabled[0];
    if (e.key === "End") next = enabled[enabled.length - 1];
    if (next === null) return;
    e.preventDefault();
    onChange && onChange(tabs[next].id);
    refs.current[next] && refs.current[next].focus();
  }
  const pill = variant === "pill";
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{
        display: "flex", gap: pill ? "var(--dt-space-inline-2xs)" : "var(--dt-space-inline-md)",
        borderBottom: pill ? "none" : "var(--dt-border-width-default) solid var(--dt-border-subtle)",
        background: pill ? "var(--dt-surface-sunken)" : "transparent",
        padding: pill ? "var(--dt-space-inset-2xs, 4px)" : 0,
        borderRadius: pill ? "var(--dt-radius-control)" : 0,
        overflowX: "auto", ...style,
      }}
      {...rest}
    >
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={el => (refs.current[i] = el)}
            role="tab"
            type="button"
            id={"tab-" + t.id}
            aria-selected={on}
            aria-controls={"panel-" + t.id}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange && onChange(t.id)}
            style={{
              appearance: "none", border: "none", cursor: t.disabled ? "not-allowed" : "pointer",
              background: pill && on ? "var(--dt-surface-raised)" : "transparent",
              padding: pill ? "var(--dt-space-inset-xs) var(--dt-space-inset-sm)" : "var(--dt-space-inset-xs) 0 calc(var(--dt-space-inset-xs) + 1px)",
              marginBottom: pill ? 0 : "calc(-1 * var(--dt-border-width-default))",
              borderBottom: pill ? "none" : `2px solid ${on ? "var(--dt-border-selected)" : "transparent"}`,
              borderRadius: pill ? "var(--dt-radius-control)" : 0,
              boxShadow: pill && on ? "var(--dt-elevation-1)" : "none",
              fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
              fontWeight: "var(--dt-font-weight-medium)", whiteSpace: "nowrap",
              color: t.disabled ? "var(--dt-text-disabled)" : on ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
              display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)",
              transition: "color var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
            }}
          >
            {t.icon}{t.label}
            {t.count != null && (
              <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "var(--dt-text-label-sm-size)", color: "var(--dt-text-tertiary)" }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, value, children, style, ...rest }) {
  if (id !== value) return null;
  return <div role="tabpanel" id={"panel-" + id} aria-labelledby={"tab-" + id} tabIndex={0} style={style} {...rest}>{children}</div>;
}
```
