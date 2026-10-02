# FaqBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [FaqBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/FaqBlock.jsx), [FaqBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/FaqBlock.d.ts), [FaqBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/FaqBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/FaqBlock.html

## Guidelines

Questions before someone commits, in an `Accordion`. `split` puts the header beside the answers on a wide screen; `stacked` centres it above them.

### Use it when
- The four to eight questions sales or support hear most.

### Don't use it when
- Documentation. Link to it from an answer instead.

### Example
```jsx
<FaqBlock
  eyebrow="Questions"
  title="Before you adopt it"
  items={[
    { question: "Can we keep our own brand?", answer: "That is the point." },
    { question: "Does it work outside React?", answer: "The tokens do." },
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

/** One question in a FaqBlock. */
export interface FaqItem {
  id?: string;
  question: React.ReactNode;
  answer: React.ReactNode;
}

/** Questions and answers in an Accordion, beside or under a header. */
export interface FaqBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "heading-lg" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  lead?: React.ReactNode;
  /** A link to support, under the lead. */
  actions?: React.ReactNode;
  items: FaqItem[];
  /** split puts the header beside the answers; stacked centres it above. @default "split" */
  layout?: "split" | "stacked";
  /** Ids open at first. Items without an id are numbered from "0". */
  defaultOpen?: string[];
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

export declare function FaqBlock(props: FaqBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-size-container-narrow` | semantic | `var(--dt-dim-container-md)` |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Accordion } from "../content/Accordion.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* Questions before someone commits. Split puts the header beside the
   answers on a wide screen; stacked centres the header over them. */
export function FaqBlock({ eyebrow, title, titleSize = "heading-lg", lead, actions, items = [], layout = "split", defaultOpen, tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const list = (
    <Accordion
      label={typeof title === "string" ? title : "Questions"}
      defaultOpen={defaultOpen}
      items={items.map((q, i) => ({ id: q.id || String(i), title: q.question, content: q.answer }))}
    />
  );
  const header = <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} actions={actions} align={layout === "split" ? "start" : "center"} />;
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      {layout === "split" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: "start" }}>
          {header}
          <div style={{ minWidth: 0 }}>{list}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)", maxWidth: "var(--dt-size-container-narrow)", marginInline: "auto" }}>
          {header}
          {list}
        </div>
      )}
    </Section>
  );
}
```
