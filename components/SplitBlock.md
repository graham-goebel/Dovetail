# SplitBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [SplitBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/SplitBlock.jsx), [SplitBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/SplitBlock.d.ts), [SplitBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/SplitBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/SplitBlock.html

## Guidelines

Copy beside media: a picture, a video, a product shot or a live component. The two sit side by side on a wide screen and stack on a phone; `points` become a checked list.

### Use it when
- One idea that needs a picture to land.
- Alternating down a page: flip `reverse` on every other one.

### Don't use it when
- Several parallel ideas. Use `FeatureGridBlock`.

### Example
```jsx
<SplitBlock
  eyebrow="See it run"
  title="Retheme a whole product in one pass"
  body="Pick a colour, a type family and a radius. Every screen follows."
  points={["Light and dark from the same roles", "Contrast checked on every pairing"]}
  media={<Video label="Walkthrough" />}
  actions={<Button variant="secondary">Watch the tour</Button>}
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

/** Copy beside media, with an optional checked list and actions. Stacks on a phone. */
export interface SplitBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "heading-lg" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  /** The paragraph under the title. */
  body?: React.ReactNode;
  /** Short claims, shown as a checked list. */
  points?: React.ReactNode[];
  actions?: React.ReactNode;
  /** A picture, video, product shot or live component. */
  media?: React.ReactNode;
  /** Puts the copy first, media second. @default false */
  reverse?: boolean;
  /** Vertical alignment of the two sides. @default "center" */
  align?: "center" | "top";
  /** Anything after the points. */
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

export declare function SplitBlock(props: SplitBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-brand` | semantic | `var(--dt-color-primary-700)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Text } from "../typography/Text.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", flex: "none", marginTop: 3, color: "var(--dt-text-brand)" }}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* Copy beside media: a picture, a video, a product shot, a live component.
   The two sit side by side on a wide screen and stack on a phone, the media
   first unless reverse puts the copy first. Points become a checked list. */
export function SplitBlock({ eyebrow, title, titleSize = "heading-lg", body, points, actions, media, reverse = false, align = "center", tone = "base", dark, texture, spacing = "default", width = "default", children, ...rest }) {
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: align === "top" ? "start" : "center" }}>
        {media && <div style={{ minWidth: 0, order: reverse ? 2 : 1 }}>{media}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)", minWidth: 0, order: reverse ? 1 : 2 }}>
          <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={body} />
          {points && points.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)" }}>
              {points.map((p) => (
                <li key={typeof p === "string" ? p : undefined} style={{ display: "flex", gap: "var(--dt-space-inline-sm)", alignItems: "flex-start" }}>
                  {CHECK}<Text as="span" style={{ flex: "1 1 0%", minWidth: 0 }}>{p}</Text>
                </li>
              ))}
            </ul>
          )}
          {children}
          {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-sm)" }}>{actions}</div>}
        </div>
      </div>
    </Section>
  );
}
```
