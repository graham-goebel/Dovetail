# Figure

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [Figure.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/Figure.jsx), [Figure.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/Figure.d.ts), [Figure.md](https://graham-goebel.github.io/Dovetail/system/components/content/Figure.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Figure.html

## Guidelines

Pairs media with a caption. Use it in editorial and article layouts where the image carries information the surrounding prose does not.

### Caption is not alt text

They serve different readers and must say different things. \`alt\` describes what the image shows, for someone who cannot see it. The caption adds context everyone needs: a date, a place, what to notice. Repeating one in the other wastes a screen reader's time.

\`\`\`jsx
<Figure caption="Throughput held steady through the March migration." credit="Photo: Internal">
  <Image src={chart} alt="Line chart of requests per second across three months" ratio="4:3" />
</Figure>
\`\`\`

### Credit

\`credit\` renders smaller and in the mono role, below the caption. Use it for attribution and licence text only. If the source matters to the argument, put it in the caption instead.

## Props

```ts
import * as React from "react";

/** Wraps media with a caption and an optional credit line. */
export interface FigureProps extends React.HTMLAttributes<HTMLElement> {
  /** Describes or extends the image. Not a repeat of the alt text. */
  caption?: React.ReactNode;
  /** Photographer, source, or licence line. */
  credit?: React.ReactNode;
  /** @default "start" */
  align?: "start" | "center";
  /** The media element, usually an \`Image\`. */
  children?: React.ReactNode;
}

export declare function Figure(props: FigureProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-family-mono` | primitive | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |
| `--dt-font-family-sans` | primitive | `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--dt-font-size-sm` | primitive | `14px` |
| `--dt-font-size-xs` | primitive | `12px` |
| `--dt-line-height-sm` | primitive | `20px` |
| `--dt-line-height-xs` | primitive | `16px` |

## Source

```jsx
import React from "react";

export function Figure({ caption, credit, align = "start", children, style, ...rest }) {
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)", ...style }} {...rest}>
      {children}
      {(caption || credit) && (
        <figcaption style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", textAlign: align === "center" ? "center" : "left", alignItems: align === "center" ? "center" : "flex-start" }}>
          {caption && <span style={{ fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-font-size-sm)", lineHeight: "var(--dt-line-height-sm)", color: "var(--dt-text-secondary)" }}>{caption}</span>}
          {credit && <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-font-size-xs)", lineHeight: "var(--dt-line-height-xs)", color: "var(--dt-text-tertiary)" }}>{credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
```
