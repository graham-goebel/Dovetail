# Media

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [Media.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/Media.jsx), [Media.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/Media.d.ts), [Media.md](https://graham-goebel.github.io/Dovetail/system/components/content/Media.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Media.html

## Guidelines

A media-and-copy row. This is the block a marketing or lifestyle page is mostly made of, so it is a component rather than something each template re-lays-out.

### Alternate, don't randomise

Stack several Media blocks and flip \`reverse\` on every other one. The zigzag gives a long page rhythm without any new layout code. Flipping them in an irregular order reads as a mistake.

\`\`\`jsx
<Media media={<Image src={a} alt="…" ratio="4:3" />} title="Ship the theme, not the fork" body="…" />
<Media media={<Image src={b} alt="…" ratio="4:3" />} title="One contract, every surface" body="…" reverse />
\`\`\`

### One primary action

\`actions\` takes a row of controls. At most one is primary; everything else is secondary or a link. Three buttons in a marketing row means you have not decided what the section is for.

### Weighting the columns

\`mediaWidth\` sets the media track. Use \`"1fr"\` for an even split, \`"1.2fr"\` when the image is the argument, and a fixed width like \`"360px"\` for a small supporting visual beside long copy.

## Props

```ts
import * as React from "react";

/** A media-and-copy row: the workhorse block of a marketing or lifestyle page. */
export interface MediaProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The visual half, usually an \`Image\` or \`Figure\`. */
  media?: React.ReactNode;
  /** Short kicker above the title. Uppercased by the eyebrow role. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  body?: React.ReactNode;
  /** Buttons or links. Keep to one primary action. */
  actions?: React.ReactNode;
  /** Put the media on the right instead of the left. @default false */
  reverse?: boolean;
  /** @default "center" */
  align?: "center" | "start";
  /** @default "xl" */
  gap?: "md" | "lg" | "xl" | "2xl";
  /** Narrowest either column may get before the row stacks to one column. @default "300px" */
  minColumnWidth?: string;
  /** @default "section" */
  as?: keyof JSX.IntrinsicElements;
}

export declare function Media(props: MediaProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xl` | semantic | `var(--dt-dim-8)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-family-mono` | primitive | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |
| `--dt-font-family-sans` | primitive | `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--dt-font-size-2xl` | primitive | `28px` |
| `--dt-font-size-md` | primitive | `16px` |
| `--dt-font-size-xs` | primitive | `12px` |
| `--dt-font-weight-semibold` | primitive | `600` |
| `--dt-line-height-2xl` | primitive | `36px` |
| `--dt-line-height-md` | primitive | `24px` |
| `--dt-tracking-tight` | primitive | `-0.02em` |
| `--dt-tracking-wide` | primitive | `0.02em` |

## Source

```jsx
import React from "react";

const GAPS = { md: "var(--dt-space-inline-md)", lg: "var(--dt-space-inline-lg)", xl: "var(--dt-space-inline-xl)", "2xl": "var(--dt-space-inline-2xl)" };

export function Media({ media, eyebrow, title, body, actions, reverse = false, align = "center", gap = "xl", minColumnWidth = "300px", as: Tag = "section", style, ...rest }) {
  return (
    <Tag style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}), 1fr))`, gap: GAPS[gap] || GAPS.xl, alignItems: align === "center" ? "center" : "start", ...style }} {...rest}>
      <div style={{ order: reverse ? 2 : 1, minWidth: 0 }}>{media}</div>
      <div style={{ order: reverse ? 1 : 2, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)", alignItems: "flex-start" }}>
        {eyebrow && <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-font-size-xs)", letterSpacing: "var(--dt-tracking-wide)", textTransform: "uppercase", color: "var(--dt-text-tertiary)" }}>{eyebrow}</span>}
        {title && <h2 style={{ margin: 0, fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-font-size-2xl)", lineHeight: "var(--dt-line-height-2xl)", fontWeight: "var(--dt-font-weight-semibold)", letterSpacing: "var(--dt-tracking-tight)", color: "var(--dt-text-primary)", textWrap: "pretty" }}>{title}</h2>}
        {body && <div style={{ fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-font-size-md)", lineHeight: "var(--dt-line-height-md)", color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{body}</div>}
        {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-sm)" }}>{actions}</div>}
      </div>
    </Tag>
  );
}
```
