# Prose

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [Prose.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/Prose.jsx), [Prose.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/Prose.d.ts), [Prose.md](https://graham-goebel.github.io/Dovetail/system/components/content/Prose.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Prose.html

## Guidelines

Wraps long-form editorial text (articles, documentation, changelogs) in a readable
measure with consistent vertical rhythm.

### Rules

- Cap the measure. The default 68ch is the upper bound for comfortable reading; do not
  raise it past 75ch to fill a wide column.
- Prose owns the gap between blocks. Do not add margins to the paragraphs inside it.
- Use `lg` for a standalone article page and `md` inside product UI. `sm` is for
  footnotes and sidebars only.
- Content inside Prose comes from a CMS or Markdown. Do not put interactive controls in
  it; compose those outside.

### Tradeoffs

A fixed measure leaves white space on wide screens. That space is the point: full-width
text at 1400px is unreadable regardless of how empty the margins look.

## Props

```ts
import * as React from "react";

/** Readable long-form text container with a measure cap. */
export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Body role applied to the text. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Maximum line length. @default "68ch" */
  measure?: string;
}

export declare function Prose(props: ProseProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-text-body-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-lg-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-lg-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-body-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |

## Source

```jsx
import React from "react";

export function Prose({ children, size = "md", measure = "68ch", style, ...rest }) {
  const body = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";
  return (
    <div
      className="dt-prose"
      style={{
        maxWidth: measure,
        fontFamily: `var(--dt-text-body-${body}-family)`,
        fontSize: `var(--dt-text-body-${body}-size)`,
        lineHeight: `var(--dt-text-body-${body}-line)`,
        color: "var(--dt-text-primary)",
        textWrap: "pretty",
        display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
```
