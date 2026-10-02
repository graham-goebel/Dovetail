# StatsBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [StatsBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/StatsBlock.jsx), [StatsBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/StatsBlock.d.ts), [StatsBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/StatsBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/StatsBlock.html

## Guidelines

A few numbers that make the case, set large, each over a hairline, in a row that wraps on a phone.

### Use it when
- Two to four numbers a reader can check.

### Don't use it when
- Numbers without a source. A claim nobody can verify weakens the page.

### Example
```jsx
<StatsBlock
  eyebrow="Proof"
  title="The audit that took a week now runs in CI"
  stats={[
    { value: "63", label: "Components", caption: "across eight groups" },
    { value: "658", label: "Tokens", caption: "three tiers" },
  ]}
/>
```

### Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

### Title size
Set `titleSize` to move the title along the type scale, from `display-lg` down to `heading-md`. It defaults to `heading-lg`. Only its size changes: the heading level stays what the block renders.

### Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

### Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.

## Props

```ts
import * as React from "react";

/** One number in a StatsBlock. */
export interface StatItem {
  /** The number, as it should read: "63", "4.9★", "−38%". */
  value: React.ReactNode;
  label: React.ReactNode;
  /** A short qualifier under the label. */
  caption?: React.ReactNode;
}

/** A few numbers that make the case, set large, each over a hairline. */
export interface StatsBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "heading-lg" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  lead?: React.ReactNode;
  stats: StatItem[];
  /** @default "start" */
  align?: "start" | "center";
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function StatsBlock(props: StatsBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Text } from "../typography/Text.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* A few numbers that make the case, set large, each over a hairline. */
export function StatsBlock({ eyebrow, title, titleSize = "heading-lg", lead, stats = [], align = "start", tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} align={align} />}
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "var(--dt-space-inline-lg)" }}>
          {stats.map((s, i) => (
            <div key={s.label || i} style={{ display: "flex", flexDirection: "column-reverse", gap: "var(--dt-space-stack-2xs)", paddingTop: "var(--dt-space-stack-sm)", borderTop: "var(--dt-border-width-default) solid var(--dt-border-subtle)" }}>
              <dt style={{ margin: 0 }}>
                <Text as="span" variant="label">{s.label}</Text>
                {s.caption && <Text as="span" variant="small" tone="tertiary" style={{ display: "block" }}>{s.caption}</Text>}
              </dt>
              <dd style={{
                margin: 0, fontFamily: "var(--dt-text-display-sm-family)", fontSize: "var(--dt-text-display-sm-size)",
                lineHeight: "var(--dt-text-display-sm-line)", fontWeight: "var(--dt-text-display-sm-weight)",
                letterSpacing: "var(--dt-text-display-sm-tracking)", fontVariantNumeric: "tabular-nums", color: "var(--dt-text-headline, var(--dt-text-primary))",
              }}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
```
