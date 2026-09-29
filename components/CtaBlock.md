# CtaBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [CtaBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/CtaBlock.jsx), [CtaBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/CtaBlock.d.ts), [CtaBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/CtaBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/CtaBlock.html

## Guidelines

The close of a page: one ask and its buttons, on the brand fill by default. With `media` the copy sits beside an illustration or product shot.

### Use it when
- The last block on a page.

### Don't use it when
- Mid-page. A call to action before the argument is made reads as pressure.

### Example
```jsx
<CtaBlock
  title="Ship your brand, not ours"
  lead="Free while you evaluate."
  actions={<><Button>Start free</Button><Button variant="secondary">Talk to us</Button></>}
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

/** The close of a page: one ask and its buttons, on the brand fill by default. */
export interface CtaBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  /** An illustration or product shot; the copy moves beside it. */
  media?: React.ReactNode;
  /** The band's surface, passed to Section. @default "brand" */
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

export declare function CtaBlock(props: CtaBlockProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The close of a page: one ask and its buttons, on the brand fill by default.
   With media (an illustration, a product shot) the copy sits beside it. */
export function CtaBlock({ eyebrow, title, lead, actions, media, tone = "brand", dark, texture, spacing = "default", width = "default", ...rest }) {
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      {media ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: "center" }}>
          <BlockHeader eyebrow={eyebrow} title={title} lead={lead} actions={actions} />
          <div style={{ minWidth: 0, display: "flex", justifyContent: "center" }}>{media}</div>
        </div>
      ) : (
        <BlockHeader eyebrow={eyebrow} title={title} lead={lead} actions={actions} align="center" />
      )}
    </Section>
  );
}
```
