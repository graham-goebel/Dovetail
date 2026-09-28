# EmptyState

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [EmptyState.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/EmptyState.jsx), [EmptyState.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/EmptyState.d.ts), [EmptyState.md](https://graham-goebel.github.io/Dovetail/system/components/display/EmptyState.md).

Live page: https://graham-goebel.github.io/Dovetail/components/EmptyState.html

## Guidelines

Turns a blank region into an instruction. Use it for first-run views, cleared filters,
zero search results, and permission gaps.

### Rules

- The three empties are different. First run needs a create action; no results needs a
  way to widen the search; no access needs a way to request it. Do not ship one generic
  empty state for all three.
- `description` says why it is empty and what happens next. "No data" says neither.
- One primary action. If there are two equal paths forward, the view has a design
  problem upstream.
- Size `sm` for empties inside a card or panel, `md` for a full page region.

### Tradeoffs

An illustrated empty state is memorable on first run and tiresome on the fiftieth. For
states a user hits routinely, such as a cleared filter or an empty inbox, keep it to text and one
control.

## Props

```ts
import * as React from "react";

/** Placeholder for a view with no content yet, no results, or no access. */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What is empty, in sentence case. */
  title: React.ReactNode;
  /** Why it is empty and what to do next. */
  description?: React.ReactNode;
  /** Lucide icon element, sized from --dt-size-icon-*. */
  icon?: React.ReactNode;
  /** Primary action — usually the thing that fills the empty space. */
  action?: React.ReactNode;
  /** Optional secondary action, e.g. "Learn more". */
  secondaryAction?: React.ReactNode;
  /** @default "md" */
  size?: "sm" | "md";
}

export declare function EmptyState(props: EmptyStateProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inset-xl` | semantic | `var(--dt-dim-8)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

export function EmptyState({ title, description, icon, action, secondaryAction, size = "md", style, ...rest }) {
  const pad = size === "sm" ? "var(--dt-space-inset-lg)" : "var(--dt-space-inset-xl)";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      gap: "var(--dt-space-stack-sm)", padding: pad, ...style,
    }} {...rest}>
      {icon && <span aria-hidden="true" style={{ color: "var(--dt-text-tertiary)", display: "flex" }}>{icon}</span>}
      <span style={{
        fontFamily: "var(--dt-text-heading-xs-family)", fontSize: size === "sm" ? "var(--dt-text-body-lg-size)" : "var(--dt-text-heading-xs-size)",
        lineHeight: "var(--dt-text-heading-xs-line)", fontWeight: "var(--dt-font-weight-semibold)", color: "var(--dt-text-primary)",
      }}>{title}</span>
      {description && (
        <p style={{
          margin: 0, maxWidth: "46ch",
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)", textWrap: "pretty",
        }}>{description}</p>
      )}
      {(action || secondaryAction) && (
        <span style={{ display: "flex", gap: "var(--dt-space-inline-sm)", marginTop: "var(--dt-space-stack-2xs)" }}>
          {action}{secondaryAction}
        </span>
      )}
    </div>
  );
}
```
