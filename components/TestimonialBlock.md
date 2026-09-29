# TestimonialBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [TestimonialBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/TestimonialBlock.jsx), [TestimonialBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/TestimonialBlock.d.ts), [TestimonialBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/TestimonialBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/TestimonialBlock.html

## Guidelines

What customers say. One quote is set large and centred; several sit in a grid on the card surface.

### Use it when
- Real quotes from named people.

### Don't use it when
- Invented quotes. Leave the block out until you have real ones.

### Example
```jsx
<TestimonialBlock
  quotes={[{ quote: "Tokens made the redesign a config change.", name: "Ada Lovelace", role: "Design Systems Lead, Northwind" }]}
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

/** One quote in a TestimonialBlock. */
export interface TestimonialItem {
  quote: React.ReactNode;
  /** Who said it. Also the initials in the default avatar. */
  name?: string;
  /** Their role and company. */
  role?: string;
  /** A custom avatar; defaults to an Avatar from name. */
  avatar?: React.ReactNode;
}

/** What customers say: one quote set large, or several in a grid. */
export interface TestimonialBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  lead?: React.ReactNode;
  quotes: TestimonialItem[];
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

export declare function TestimonialBlock(props: TestimonialBlockProps): JSX.Element;
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
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-xl` | semantic | `var(--dt-dim-10)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Quote } from "../content/Quote.jsx";
import { Avatar } from "../display/Avatar.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* What customers say. One quote is set large and centred; several sit in a
   grid on raised surfaces. */
export function TestimonialBlock({ eyebrow, title, lead, quotes = [], tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const one = quotes.length === 1;
  const quote = (q, size) => (
    <Quote size={size} attribution={q.name} role={q.role} avatar={q.avatar || (q.name ? <Avatar name={q.name} /> : undefined)}>{q.quote}</Quote>
  );
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={one ? "narrow" : width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xl)", alignItems: one ? "center" : "stretch" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} align="center" />}
        {one ? quote(quotes[0], "lg") : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "var(--dt-space-inline-lg)" }}>
            {quotes.map((q, i) => (
              <div key={q.name || i} style={{ padding: "var(--dt-card-padding)", background: "var(--dt-card-bg)", color: "var(--dt-card-fg)", border: "var(--dt-card-border-width) solid var(--dt-card-border-color)", borderRadius: "var(--dt-card-radius)" }}>
                {quote(q, "md")}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
```
