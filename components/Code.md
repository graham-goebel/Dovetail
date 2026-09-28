# Code

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Code.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Code.jsx), [Code.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Code.d.ts), [Code.md](https://graham-goebel.github.io/Dovetail/system/components/display/Code.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Code.html

## Guidelines

Marks text that must be read literally: token names, file paths, commands, snippets.

### Rules

- Inline code does not wrap. Keep it to a short identifier; a whole command belongs in a
  block.
- Give every block a `label` when the snippet belongs to a file. A snippet with no
  filename is hard to act on.
- Do not syntax-highlight. This component ships one colour on purpose; highlighting is a
  product decision and a dependency, not a system default.
- Never put code in a Prose paragraph without this component. Proportional digits and
  ligatures change what the reader copies.

### Tradeoffs

Blocks scroll horizontally rather than wrap, because a wrapped command can be copied
incorrectly. That costs the reader a scroll on narrow screens.

## Props

```ts
import * as React from "react";

/** Monospace code, inline or as a block. */
export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /** Renders a scrollable <pre> block instead of inline <code>. @default false */
  block?: boolean;
  /** Caption above a block, e.g. a filename. Ignored when inline. */
  label?: React.ReactNode;
}

export declare function Code(props: CodeProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-6)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-family-mono` | primitive | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |
| `--dt-line-height-relaxed` | none | not declared |

## Source

```jsx
import React from "react";

export function Code({ children, block = false, label, style, ...rest }) {
  const shared = {
    fontFamily: "var(--dt-font-family-mono)",
    fontSize: "var(--dt-text-body-sm-size)",
    color: "var(--dt-text-primary)",
    background: "var(--dt-surface-sunken)",
    border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
  };
  if (!block) {
    return <code style={{ ...shared, padding: "1px var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)", whiteSpace: "nowrap", ...style }} {...rest}>{children}</code>;
  }
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", ...style }} {...rest}>
      {label && <figcaption style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-text-body-xs-size)", color: "var(--dt-text-tertiary)" }}>{label}</figcaption>}
      <pre style={{
        ...shared, margin: 0, padding: "var(--dt-space-inset-md)", borderRadius: "var(--dt-radius-container)",
        overflowX: "auto", lineHeight: "var(--dt-line-height-relaxed, 1.6)",
      }}><code>{children}</code></pre>
    </figure>
  );
}
```
