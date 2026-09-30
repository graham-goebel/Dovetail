# BlockHeader

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [BlockHeader.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/BlockHeader.jsx), [BlockHeader.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/BlockHeader.d.ts), [BlockHeader.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/BlockHeader.md).

Live page: https://graham-goebel.github.io/Dovetail/components/BlockHeader.html

## Guidelines

The eyebrow, title, lead and actions every block opens with, so a page of blocks keeps one rhythm. Use it to start a block of your own.

### Use it when
- Opening a custom section in the same voice as the other blocks.

### Don't use it when
- A page title. Use `HeroBlock`, whose header is an `h1`.

### Example
```jsx
<BlockHeader eyebrow="Pricing" title="Pick a plan" lead="Every plan includes the full system." align="center" />
```

### Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

### Tokens
Reads the typography tokens through `Heading` and `Text`; it has none of its own.

### Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.

## Props

```ts
import * as React from "react";

/** The eyebrow, title, lead and actions every block opens with. Use it to start a custom block in the same rhythm. */
export interface BlockHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** One or two sentences under the title. */
  lead?: React.ReactNode;
  /** Buttons under the lead. */
  actions?: React.ReactNode;
  /** Centred for a header over a grid; start beside media. @default "start" */
  align?: "start" | "center";
  /** The heading level, for the page outline. @default 2 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The heading's type size. @default "heading-lg" */
  size?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
}

export declare function BlockHeader(props: BlockHeaderProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |

## Source

```jsx
import React from "react";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { Inline } from "../primitives/Inline.jsx";
import { Stack } from "../primitives/Stack.jsx";

/* The eyebrow, title and lead every block opens with, so a page of blocks
   keeps one rhythm. Centred for a section that introduces a grid; start for
   one that sits beside media. */
export function BlockHeader({ eyebrow, title, lead, actions, align = "start", level = 2, size = "heading-lg", style, ...rest }) {
  const centred = align === "center";
  const items = centred ? "center" : "flex-start";
  /* The gaps are the text layers of the layout: an eyebrow binds to the
     heading it introduces (eyebrow), and the lead follows the pair (subcopy),
     so Configure's Text control moves them apart from the rest. */
  return (
    <Stack
      layer="subcopy"
      align={items}
      style={{ textAlign: centred ? "center" : "left", marginInline: centred ? "auto" : undefined, ...style }}
      {...rest}
    >
      {(eyebrow || title) && (
        <Stack layer="eyebrow" align={items}>
          {eyebrow && <Text variant="eyebrow" tone="tertiary">{eyebrow}</Text>}
          {title && <Heading level={level} size={size} align={centred ? "center" : "left"} measure={centred ? "default" : "wide"} balance>{title}</Heading>}
        </Stack>
      )}
      {lead && <Text variant="lead" tone="secondary" align={centred ? "center" : "left"} measure="default">{lead}</Text>}
      {actions && <div style={{ marginTop: "var(--dt-space-stack-xs)" }}><Inline gap="sm" wrap justify={centred ? "center" : "flex-start"}>{actions}</Inline></div>}
    </Stack>
  );
}
```
