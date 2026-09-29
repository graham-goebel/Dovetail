# FeatureGridBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [FeatureGridBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/FeatureGridBlock.jsx), [FeatureGridBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/FeatureGridBlock.d.ts), [FeatureGridBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/FeatureGridBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/FeatureGridBlock.html

## Guidelines

A header over a grid of features: an icon on a brand tint, a title and a sentence each. Columns drop as the width runs out, down to one on a phone.

### Use it when
- Three to eight parallel reasons, capabilities or steps.

### Don't use it when
- One idea with a picture. Use `SplitBlock`.

### Example
```jsx
<FeatureGridBlock
  eyebrow="Why it holds"
  title="Three tiers, referenced one way"
  tone="subtle"
  items={[
    { icon: <PaletteIcon />, title: "Primitives name values", description: "Nothing here knows what it is for." },
    { icon: <LayersIcon />, title: "Semantics name jobs", description: "The only tier a component reads." },
    { icon: <BlocksIcon />, title: "Components name parts", description: "Retuned per context." },
  ]}
/>
```

### Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

### Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

### Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.

## Props

```ts
import * as React from "react";

/** One feature in a FeatureGridBlock. */
export interface FeatureItem {
  /** An icon, drawn on a brand tint. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** One sentence. */
  description?: React.ReactNode;
  /** Adds a link under the description. */
  href?: string;
  /** The link's text. @default "Learn more" */
  linkLabel?: string;
}

/** A header over a grid of features, each with an icon, a title and a sentence. */
export interface FeatureGridBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  items: FeatureItem[];
  /** Columns on a wide screen; fewer as the width runs out, one on a phone. @default 3 */
  columns?: 2 | 3 | 4;
  /** The header's alignment. @default "center" */
  align?: "start" | "center";
  /** plain sits on the band; cards puts each feature on the card surface. @default "plain" */
  variant?: "plain" | "cards";
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

export declare function FeatureGridBlock(props: FeatureGridBlockProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-card-bg` | component | `var(--dt-surface-raised)` |
| `--dt-card-border-color` | component | `var(--dt-border-default)` |
| `--dt-card-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-card-fg` | component | `var(--dt-text-primary)` |
| `--dt-card-padding` | component | `var(--dt-space-inset-lg)` |
| `--dt-card-radius` | component | `var(--dt-radius-container)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-size-control-md` | semantic | `var(--dt-dim-10)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-xl` | semantic | `var(--dt-dim-10)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-brand-muted` | semantic | `var(--dt-color-primary-050)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The narrowest a column may get before the grid drops a column, per count:
   more columns ask for less room each, and a phone always ends up with one. */
const MIN = { 2: "360px", 3: "260px", 4: "200px" };

/* A header over a grid of features: an icon on a brand tint, a title and a
   sentence each. Cards puts each on a raised surface; plain leaves the band's
   own background. */
export function FeatureGridBlock({ eyebrow, title, lead, actions, items = [], columns = 3, align = "center", variant = "plain", tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const card = variant === "cards";
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xl)" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} actions={actions} align={align} />}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MIN[columns] || MIN[3]}), 1fr))`, gap: "var(--dt-space-inline-lg)" }}>
          {items.map((it, i) => (
            <div key={it.title || i} style={{
              display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)",
              padding: card ? "var(--dt-card-padding)" : 0,
              background: card ? "var(--dt-card-bg)" : undefined,
              border: card ? "var(--dt-card-border-width) solid var(--dt-card-border-color)" : undefined,
              borderRadius: card ? "var(--dt-card-radius)" : undefined,
              color: card ? "var(--dt-card-fg)" : undefined,
            }}>
              {it.icon && (
                <span aria-hidden="true" style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-start",
                  width: "var(--dt-size-control-md)", height: "var(--dt-size-control-md)", marginBottom: "var(--dt-space-stack-xs)",
                  borderRadius: "var(--dt-radius-control)", background: "var(--dt-surface-brand-muted)", color: "var(--dt-text-on-brand-muted)",
                }}>{it.icon}</span>
              )}
              <Heading level={3} size="heading-sm">{it.title}</Heading>
              {it.description && <Text variant="small" tone="secondary">{it.description}</Text>}
              {it.href && <a href={it.href} style={{ marginTop: "var(--dt-space-stack-2xs)", color: "var(--dt-text-link)", fontSize: "var(--dt-text-body-sm-size)", textUnderlineOffset: 3 }}>{it.linkLabel || "Learn more"}</a>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
```
