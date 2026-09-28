# Tag

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Tag.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Tag.jsx), [Tag.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Tag.d.ts), [Tag.md](https://graham-goebel.github.io/Dovetail/system/components/display/Tag.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Tag.html

## Guidelines

An interactive chip. If it cannot be clicked or removed, it is a `Badge`.

### Use it when
- Filter chips the user toggles.
- Values the user entered and can remove: recipients, labels, applied filters.

### Don't use it when
- It is read-only status. Use `Badge`.
- It is a set of mutually exclusive options in a form. Use `Radio`.

### Example
```jsx
<Inline gap="xs">
  <Tag selected onClick={() => toggle("open")}>Open</Tag>
  <Tag onClick={() => toggle("closed")}>Closed</Tag>
  <Tag onRemove={() => clear("priority")}>Priority: high</Tag>
</Inline>
```

### Accessibility
With an `onClick`, Tag becomes `role="button"` with `aria-pressed` and a tab stop. The remove button gets its own label derived from the tag text.

### Content
Sentence case. Applied filters read as "Field: value".

## Props

```ts
import * as React from "react";

/** Interactive chip: a filter that can be toggled, or an entered value that can be removed. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Toggled-on state. Sets aria-pressed when the tag is clickable. */
  selected?: boolean;
  /** Renders a remove button. */
  onRemove?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export declare function Tag(props: TagProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-selected` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-subtle` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";

export function Tag({ selected = false, onRemove, disabled = false, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!rest.onClick;
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role={interactive ? "button" : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)",
        fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
        lineHeight: 1, fontWeight: "var(--dt-font-weight-medium)",
        height: "var(--dt-size-control-sm)", padding: "0 var(--dt-space-inset-sm)",
        borderRadius: "var(--dt-radius-pill)",
        border: `var(--dt-border-width-default) solid ${selected ? "var(--dt-border-selected)" : "var(--dt-border-default)"}`,
        background: selected ? "var(--dt-surface-selected)" : hover && interactive ? "var(--dt-surface-subtle)" : "var(--dt-surface-base)",
        color: selected ? "var(--dt-text-on-selected)" : "var(--dt-text-primary)",
        cursor: disabled ? "not-allowed" : interactive ? "pointer" : "default",
        opacity: disabled ? 0.6 : 1,
        transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
        ...style,
      }}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${typeof children === "string" ? children : "tag"}`}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ display: "flex", padding: 0, border: 0, background: "none", color: "inherit", cursor: "pointer" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      )}
    </span>
  );
}
```
