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

### Title size
Set `titleSize` to move the title along the type scale, from `display-lg` down to `heading-md`. It defaults to `heading-lg`. Only its size changes: the heading level stays what the block renders.

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
  /** The title's type size, on the system's heading and display scale. @default "heading-lg" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
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
  /** Padding above and below, passed to Section: `sm`, `md`, `lg`, `xl` or `none`, from the module padding steps; `default` is `md` and `compact` is `sm`. @default "default" */
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "default" | "compact";
  /** Padding above, when it differs from `spacing`. */
  spacingTop?: "none" | "sm" | "md" | "lg" | "xl";
  /** Padding below, when it differs from `spacing`. */
  spacingBottom?: "none" | "sm" | "md" | "lg" | "xl";
  /** `full` spans the screen; `inset` sets the band in from the page edges with the container radius. Passed to Section. @default "full" */
  bleed?: "full" | "inset";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function CtaBlock(props: CtaBlockProps): React.JSX.Element;
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
export function CtaBlock({ eyebrow, title, titleSize = "heading-lg", lead, actions, media, tone = "brand", dark, texture, spacing = "default", width = "default", ...rest }) {
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      {media ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: "center" }}>
          <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} actions={actions} />
          <div style={{ minWidth: 0, display: "flex", justifyContent: "center" }}>{media}</div>
        </div>
      ) : (
        <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} actions={actions} align="center" />
      )}
    </Section>
  );
}
```
