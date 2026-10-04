# HeroBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [HeroBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/HeroBlock.jsx), [HeroBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/HeroBlock.d.ts), [HeroBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/HeroBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/HeroBlock.html

## Guidelines

The top of a page. `split` sets the copy beside a picture and stacks them on a phone, `centered` centres it over the picture, and `background` turns the block into a photo band with the copy on a scrim.

### Use it when
- The first section of a landing or product page.

### Don't use it when
- Anywhere but the top. A second hero competes with the first; use `SplitBlock`.

### Example
```jsx
<HeroBlock
  eyebrow="Design system infrastructure"
  title="One component set. Every brand you ship."
  lead="Components read tokens, tokens read a theme."
  actions={<><Button>Start free</Button><Button variant="secondary">Read the docs</Button></>}
  media={<Image alt="The product" ratio="4:3" />}
/>
```

### Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

### Title size
Set `titleSize` to move the title along the type scale, from `display-lg` down to `heading-md`. It defaults to `display-sm`. Only its size changes: the heading level stays what the block renders.

### Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

### Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.

## Props

```ts
import * as React from "react";

/** The top of a page: copy beside a picture, copy centred over one, or copy on a photo band. */
export interface HeroBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "display-sm" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  /** One or two sentences under the title. */
  lead?: React.ReactNode;
  /** The primary and secondary buttons. */
  actions?: React.ReactNode;
  /** A picture, video, product shot or live component beside (split) or under (centered) the copy. */
  media?: React.ReactNode;
  /** An image URL: the block becomes a photo band with the copy on a scrim, scoped dark. Takes over from media. */
  background?: string;
  /** split sets the copy beside media, stacking on a phone; centered centres it over media. @default "split" */
  layout?: "split" | "centered";
  /** Anything under the actions: tags, a logo row, a note. */
  children?: React.ReactNode;
  /** The band's surface, passed to Section. @default "base" */
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

export declare function HeroBlock(props: HeroBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The top of a page. Split puts the copy beside a picture and stacks them on
   a phone; centred puts the copy over the picture; a background image turns
   the whole block into a photo band with the copy on a scrim. */
export function HeroBlock({ eyebrow, title, titleSize = "display-sm", lead, actions, media, background, layout = "split", tone = "base", dark, texture, spacing = "default", width = "default", children, ...rest }) {
  const header = <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} actions={actions} level={1} align={layout === "centered" || background ? (layout === "centered" ? "center" : "start") : "start"} />;
  if (background) {
    return (
      <Section media={background} align={layout === "centered" ? "center" : "bottom"} dark={dark} spacing={spacing} width={width} {...rest}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-lg)", alignItems: layout === "centered" ? "center" : "flex-start" }}>
          {header}
          {children}
        </div>
      </Section>
    );
  }
  if (layout === "centered") {
    return (
      <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--dt-layout-module-gap)" }}>
          {header}
          {children}
          {media && <div style={{ width: "100%" }}>{media}</div>}
        </div>
      </Section>
    );
  }
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-lg)" }}>
          {header}
          {children}
        </div>
        {media && <div style={{ minWidth: 0 }}>{media}</div>}
      </div>
    </Section>
  );
}
```
