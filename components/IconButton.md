# IconButton

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Actions family. Files: [IconButton.jsx](https://graham-goebel.github.io/Dovetail/system/components/actions/IconButton.jsx), [IconButton.d.ts](https://graham-goebel.github.io/Dovetail/system/components/actions/IconButton.d.ts), [IconButton.md](https://graham-goebel.github.io/Dovetail/system/components/actions/IconButton.md).

Live page: https://graham-goebel.github.io/Dovetail/components/IconButton.html

## Guidelines

A button whose only content is an icon. `label` is a required prop and the type system enforces it.

### Use it when
- Space is genuinely tight and the icon is unambiguous: close, search, more, edit, delete.

### Don't use it when
- The icon needs explaining. If you would add a caption, use a `Button` with `iconStart`.
- It is the primary action in a form or dialog. Those get words.

### Example
```jsx
<IconButton label="Close dialog" onClick={close}>
  <X size={20} />
</IconButton>
```

### Variants
`ghost` (default) for toolbars and table rows. `solid` for a floating or primary action.

### Accessibility
`label` becomes both `aria-label` and the native tooltip. On touch surfaces use `size="md"` or larger: `xs` and `sm` fall below the 44px target and need a padded hit area around them.

### Content
Label is a verb phrase naming the action and its object: "Close dialog", not "Close" or "X".

## Props

```ts
import * as React from "react";

/** Icon-only button. The accessible label is required, not optional. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name and tooltip. Required — an unlabelled icon button is a bug. */
  label: string;
  /** @default "ghost" */
  variant?: "ghost" | "solid";
  /** @default "md" */
  size?: "xs" | "sm" | "md" | "lg";
  disabled?: boolean;
  /** A single icon, 20px, currentColor. */
  children: React.ReactNode;
}

export declare function IconButton(props: IconButtonProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-button-disabled-bg` | component | `var(--dt-surface-action-disabled)` |
| `--dt-button-disabled-fg` | component | `var(--dt-text-on-action-disabled)` |
| `--dt-button-ghost-bg` | component | `var(--dt-surface-action-ghost)` |
| `--dt-button-ghost-bg-active` | component | `var(--dt-surface-action-ghost-active)` |
| `--dt-button-ghost-bg-hover` | component | `var(--dt-surface-action-ghost-hover)` |
| `--dt-button-ghost-fg` | component | `var(--dt-text-on-action-ghost)` |
| `--dt-button-primary-bg` | component | `var(--dt-surface-action)` |
| `--dt-button-primary-bg-active` | component | `var(--dt-surface-action-active)` |
| `--dt-button-primary-bg-hover` | component | `var(--dt-surface-action-hover)` |
| `--dt-button-primary-fg` | component | `var(--dt-text-on-action)` |
| `--dt-button-radius` | component | `var(--dt-radius-control)` |
| `--dt-button-transition` | component | `var(--dt-motion-micro)` |
| `--dt-size-control-lg` | semantic | `var(--dt-dim-12)` |
| `--dt-size-control-md` | semantic | `var(--dt-dim-10)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-size-control-xs` | semantic | `var(--dt-dim-6)` |

## Source

```jsx
import React from "react";

export function IconButton({ label, variant = "ghost", size = "md", disabled = false, children, style, ...rest }) {
  const [state, setState] = React.useState("idle");
  const solid = variant === "solid";
  const bg = disabled
    ? "var(--dt-button-disabled-bg)"
    : solid
      ? `var(--dt-button-primary-bg${state === "active" ? "-active" : state === "hover" ? "-hover" : ""})`
      : `var(--dt-button-ghost-bg${state === "active" ? "-active" : state === "hover" ? "-hover" : ""})`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseEnter={() => !disabled && setState("hover")}
      onMouseLeave={() => setState("idle")}
      onMouseDown={() => !disabled && setState("active")}
      onMouseUp={() => !disabled && setState("hover")}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: `var(--dt-size-control-${size})`, height: `var(--dt-size-control-${size})`,
        padding: 0, border: 0, borderRadius: "var(--dt-button-radius)",
        background: bg,
        color: disabled ? "var(--dt-button-disabled-fg)" : solid ? "var(--dt-button-primary-fg)" : "var(--dt-button-ghost-fg)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background var(--dt-button-transition)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
```
