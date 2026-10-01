# Button

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Actions family. Files: [Button.jsx](https://graham-goebel.github.io/Dovetail/system/components/actions/Button.jsx), [Button.d.ts](https://graham-goebel.github.io/Dovetail/system/components/actions/Button.d.ts), [Button.md](https://graham-goebel.github.io/Dovetail/system/components/actions/Button.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Button.html

## Guidelines

The system's action control. Use exactly one `primary` button per view. If two things are equally important, neither is.

### Use it when
- The user performs an action: save, delete, add, continue.

### Don't use it when
- It navigates somewhere. Use `Link`, or `Button as="a"` only when a navigation genuinely needs button prominence (a hero CTA).
- It toggles a setting instantly. Use `Switch`.

### Example
```jsx
<Inline gap="xs" justify="flex-end">
  <Button variant="secondary">Cancel</Button>
  <Button loading={saving}>Save changes</Button>
</Inline>
```

### Variants
| Variant | For |
|---|---|
| `primary` | The one main action in the view |
| `secondary` | Everything else with equal visual weight to each other |
| `ghost` | Low-emphasis actions in toolbars and table rows |
| `danger` | Destructive actions, always behind a confirmation |
| `brand` | A call to action in the primary brand colour, where the brand should lead |
| `brand-secondary` | The same, in the secondary brand colour |

Sizes `sm` / `md` / `lg`. In marketing context `md` is already 48px, so `lg` is rarely needed.

### On a brand tint
Inside a `Section` toned `brand-muted`, `primary` takes the brand colour and `secondary` the secondary brand colour, each with text that passes on it. Inside `secondary-muted` the two swap: `primary` takes the secondary brand colour and `secondary` the primary one. The band decides; the buttons in it need no prop. The colours come from `--dt-surface-action-brand*` and `--dt-surface-action-brand-secondary*`, the same steps the Configure panel checks for contrast.

```jsx
<Section tone="brand-muted">
  <Inline gap="sm">
    <Button>Start free</Button>                 {/* the brand colour */}
    <Button variant="secondary">See plans</Button> {/* the secondary brand colour */}
  </Inline>
</Section>
```

Pass `variant="brand"` or `variant="brand-secondary"` to use those colours anywhere else.

### Product vs marketing
The same component. Context tokens change its height, padding, and font size: `dt-context-product` gives a 40px/14px toolbar button, `dt-context-marketing` a 48px/16px CTA. Do not hand-size buttons per surface.

### Tokens
Reads `--dt-button-*` (Tier 3), which resolve to `--dt-surface-action*` and `--dt-text-on-action*`. The brand variants read `--dt-button-brand-*` and `--dt-button-brand-secondary-*`, which resolve to `--dt-surface-action-brand*`, `--dt-surface-action-brand-secondary*` and their `--dt-text-on-action-brand*` pairs. Override the Tier 3 tokens to restyle Button alone; override the semantic tokens to move every action surface together.

### As a link
`as="a"` with an `href` makes a real link that looks like a button. Button sets `text-decoration: none`, so the system's global link underline does not reach it; `Link` is the component that keeps the underline.

### Accessibility
`loading` sets `aria-busy` and blocks clicks while keeping the label readable. Disabled buttons set both `disabled` and `aria-disabled`. Focus ring comes from the system.

### Content
Verb-first, one to three words, sentence case. "Save changes", not "Submit" or "Click here". Never change the label to "Loading…"; the spinner says that already.

## Props

```ts
import * as React from "react";

/**
 * The system's primary action control.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary is the single main action in a view; everything else is secondary, ghost, or danger. brand and brand-secondary fill the button with the primary or secondary brand colour, with text that passes contrast on it. Inside a Section toned brand-muted or secondary-muted, primary and secondary take the brand colours on their own. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "brand" | "brand-secondary";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Shows a spinner and blocks interaction. Keep the label — never swap it for "Loading…". */
  loading?: boolean;
  fullWidth?: boolean;
  /** Icon before the label. 16px, currentColor. */
  iconStart?: React.ReactNode;
  /** Icon after the label. Reserve for external links and disclosure. */
  iconEnd?: React.ReactNode;
  /** Render as another element, e.g. "a" for a link that looks like a button. @default "button" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Button(props: ButtonProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-button-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-button-brand-bg` | component | `var(--dt-surface-action-brand)` |
| `--dt-button-brand-bg-active` | component | `var(--dt-surface-action-brand-active)` |
| `--dt-button-brand-bg-hover` | component | `var(--dt-surface-action-brand-hover)` |
| `--dt-button-brand-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-brand-fg` | component | `var(--dt-text-on-action-brand)` |
| `--dt-button-brand-secondary-bg` | component | `var(--dt-surface-action-brand-secondary)` |
| `--dt-button-brand-secondary-bg-active` | component | `var(--dt-surface-action-brand-secondary-active)` |
| `--dt-button-brand-secondary-bg-hover` | component | `var(--dt-surface-action-brand-secondary-hover)` |
| `--dt-button-brand-secondary-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-brand-secondary-fg` | component | `var(--dt-text-on-action-brand-secondary)` |
| `--dt-button-danger-bg` | component | `var(--dt-surface-action-danger)` |
| `--dt-button-danger-bg-active` | component | `var(--dt-surface-action-danger-active)` |
| `--dt-button-danger-bg-hover` | component | `var(--dt-surface-action-danger-hover)` |
| `--dt-button-danger-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-danger-fg` | component | `var(--dt-text-on-action-danger)` |
| `--dt-button-disabled-bg` | component | `var(--dt-surface-action-disabled)` |
| `--dt-button-disabled-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-disabled-fg` | component | `var(--dt-text-on-action-disabled)` |
| `--dt-button-font-family` | component | `var(--dt-text-label-md-family)` |
| `--dt-button-font-size-lg` | component | `var(--dt-font-size-md)` |
| `--dt-button-font-size-md` | component | `var(--dt-font-size-sm)` |
| `--dt-button-font-size-sm` | component | `var(--dt-font-size-sm)` |
| `--dt-button-font-weight` | component | `var(--dt-font-weight-medium)` |
| `--dt-button-gap` | component | `var(--dt-space-inline-xs)` |
| `--dt-button-ghost-bg` | component | `var(--dt-surface-action-ghost)` |
| `--dt-button-ghost-bg-active` | component | `var(--dt-surface-action-ghost-active)` |
| `--dt-button-ghost-bg-hover` | component | `var(--dt-surface-action-ghost-hover)` |
| `--dt-button-ghost-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-ghost-fg` | component | `var(--dt-text-on-action-ghost)` |
| `--dt-button-height-lg` | component | `var(--dt-size-control-lg)` |
| `--dt-button-height-md` | component | `var(--dt-size-control-md)` |
| `--dt-button-height-sm` | component | `var(--dt-size-control-sm)` |
| `--dt-button-padding-lg` | component | `var(--dt-space-inset-lg)` |
| `--dt-button-padding-md` | component | `var(--dt-space-inset-md)` |
| `--dt-button-padding-sm` | component | `var(--dt-space-inset-sm)` |
| `--dt-button-primary-bg` | component | `var(--dt-surface-action)` |
| `--dt-button-primary-bg-active` | component | `var(--dt-surface-action-active)` |
| `--dt-button-primary-bg-hover` | component | `var(--dt-surface-action-hover)` |
| `--dt-button-primary-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-primary-fg` | component | `var(--dt-text-on-action)` |
| `--dt-button-radius` | component | `var(--dt-radius-pill)` |
| `--dt-button-secondary-bg` | component | `var(--dt-surface-action-secondary)` |
| `--dt-button-secondary-bg-active` | component | `var(--dt-surface-action-secondary-active)` |
| `--dt-button-secondary-bg-hover` | component | `var(--dt-surface-action-secondary-hover)` |
| `--dt-button-secondary-border` | component | `var(--dt-border-action-secondary)` |
| `--dt-button-secondary-fg` | component | `var(--dt-text-on-action-secondary)` |
| `--dt-button-transition` | component | `var(--dt-motion-micro)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |

## Source

```jsx
import React from "react";

const V = {
  primary: { bg: "--dt-button-primary-bg", hover: "--dt-button-primary-bg-hover", active: "--dt-button-primary-bg-active", fg: "--dt-button-primary-fg", border: "--dt-button-primary-border" },
  secondary: { bg: "--dt-button-secondary-bg", hover: "--dt-button-secondary-bg-hover", active: "--dt-button-secondary-bg-active", fg: "--dt-button-secondary-fg", border: "--dt-button-secondary-border" },
  ghost: { bg: "--dt-button-ghost-bg", hover: "--dt-button-ghost-bg-hover", active: "--dt-button-ghost-bg-active", fg: "--dt-button-ghost-fg", border: "--dt-button-ghost-border" },
  danger: { bg: "--dt-button-danger-bg", hover: "--dt-button-danger-bg-hover", active: "--dt-button-danger-bg-active", fg: "--dt-button-danger-fg", border: "--dt-button-danger-border" },
  brand: { bg: "--dt-button-brand-bg", hover: "--dt-button-brand-bg-hover", active: "--dt-button-brand-bg-active", fg: "--dt-button-brand-fg", border: "--dt-button-brand-border" },
  "brand-secondary": { bg: "--dt-button-brand-secondary-bg", hover: "--dt-button-brand-secondary-bg-hover", active: "--dt-button-brand-secondary-bg-active", fg: "--dt-button-brand-secondary-fg", border: "--dt-button-brand-secondary-border" },
};

export function Button({ variant = "primary", size = "md", disabled = false, loading = false, fullWidth = false, iconStart, iconEnd, as: Tag = "button", children, style, ...rest }) {
  const [state, setState] = React.useState("idle");
  const v = V[variant] || V.primary;
  const isOff = disabled || loading;
  const bg = isOff ? "var(--dt-button-disabled-bg)" : `var(${state === "active" ? v.active : state === "hover" ? v.hover : v.bg})`;
  const fg = isOff ? "var(--dt-button-disabled-fg)" : `var(${v.fg})`;
  const bd = isOff ? "var(--dt-button-disabled-border)" : `var(${v.border})`;

  return (
    <Tag
      disabled={Tag === "button" ? isOff : undefined}
      aria-disabled={isOff || undefined}
      aria-busy={loading || undefined}
      onMouseEnter={() => !isOff && setState("hover")}
      onMouseLeave={() => setState("idle")}
      onMouseDown={() => !isOff && setState("active")}
      onMouseUp={() => !isOff && setState("hover")}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: "var(--dt-button-gap)",
        height: `var(--dt-button-height-${size})`,
        padding: `0 var(--dt-button-padding-${size})`,
        fontFamily: "var(--dt-button-font-family)",
        fontSize: `var(--dt-button-font-size-${size})`,
        fontWeight: "var(--dt-button-font-weight)",
        lineHeight: 1,
        color: fg,
        background: bg,
        border: `var(--dt-button-border-width) solid ${bd}`,
        borderRadius: "var(--dt-button-radius)",
        cursor: isOff ? "not-allowed" : "pointer",
        textDecoration: "none",
        transition: "background var(--dt-button-transition), border-color var(--dt-button-transition)",
        width: fullWidth ? "100%" : undefined,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner /> : iconStart}
      {children}
      {iconEnd}
    </Tag>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", animation: "dt-spin 700ms linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
```
