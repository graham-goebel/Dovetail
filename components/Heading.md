# Heading

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Typography family. Files: [Heading.jsx](https://graham-goebel.github.io/Dovetail/system/components/typography/Heading.jsx), [Heading.d.ts](https://graham-goebel.github.io/Dovetail/system/components/typography/Heading.d.ts), [Heading.md](https://graham-goebel.github.io/Dovetail/system/components/typography/Heading.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Heading.html

## Guidelines

A heading whose level and size are two props. `level` sets the tag, so the document outline stays honest; `size` sets the type role, so the page can still look the way it should.

### Use it when
- Any heading on a page: a hero title, a section title, a card title that needs to be a real heading.
- The visual size and the outline disagree. A hero's one `h1` is often set at `display-md`; a product name inside a card is an `h3` set at `heading-sm`.

### Don't use it when
- The text is a label, not a heading. An eyebrow above a title is `Text variant="eyebrow"`, not a small heading.
- It sits inside `Prose`. Prose styles plain `h2` and `h3` itself.

### Example
```jsx
<Stack gap="sm">
  <Text variant="eyebrow">New season</Text>
  <Heading level={1} size="display-md">Built for the trail</Heading>
  <Text variant="lead">Four days, three huts, one pack.</Text>
</Stack>
```

One `h1` per page. Do not skip levels to get a smaller size; pick the right level and pass `size`.

### Tone
`tone` defaults to `headline`, which reads `--dt-text-headline`. That role is ink until a theme or Configure's Headline colour sets it to a brand colour, and then every heading follows at once. A brand, photo or dark `Section` re-points it for its own surface, so a heading in a band still reads correctly without a prop.

`brand` and `brand-secondary` set a single heading in a brand colour, through `--dt-text-brand` and `--dt-text-brand-secondary`, while the rest stay as they are. Both are text roles, tuned for text contrast in light and dark mode. `inherit` takes the parent's colour, for a heading inside a coloured block you built by hand rather than with `Section`.

```jsx
<Heading level={1} size="display-md" tone="brand">Built for the trail</Heading>
```

### Tokens
`--dt-text-{size}-family`, `-size`, `-line`, `-weight`, `-tracking`, `--dt-text-headline`, `--dt-text-brand`, `--dt-text-brand-secondary`, and `--dt-measure-*` when `measure` is set. A display face and a headline colour chosen in Configure reach every heading through these roles.

## Props

```ts
import * as React from "react";

/**
 * A heading whose document level and visual size are set separately, so a
 * page's outline and its scale can differ on purpose: an h2 set at display
 * size for a hero, an h3 set small inside a card.
 */
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Sets the tag, h1 to h6. @default 2 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The type role it is set in. Defaults by level: 1 heading-xl, 2 heading-lg, 3 heading-md, 4 heading-sm, 5 and 6 heading-xs. */
  size?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md" | "heading-sm" | "heading-xs";
  /**
   * headline reads --dt-text-headline: ink unless a theme sets headlines in a
   * brand colour, and re-pointed by a brand, photo or dark Section so it
   * follows the band. brand and brand-secondary set this one heading in a
   * brand text colour. inherit takes the colour of its parent, for a heading
   * inside a hand-built coloured block. @default "headline"
   */
  tone?: "headline" | "brand" | "brand-secondary" | "primary" | "secondary" | "inherit";
  align?: React.CSSProperties["textAlign"];
  /** Bounds the line length. @default "none" */
  measure?: "narrow" | "default" | "wide" | "none";
  /** Balances the lines, so a two-line heading does not end on one word. @default true */
  balance?: boolean;
  children?: React.ReactNode;
}

export declare function Heading(props: HeadingProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-text-body-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-lg-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-lg-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-body-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-brand-secondary` | semantic | `var(--dt-color-secondary-700)` |
| `--dt-text-code-md-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-code-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-code-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-code-sm-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-code-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-code-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-display-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-lg-line` | semantic | `var(--dt-line-height-7xl)` |
| `--dt-text-display-lg-size` | semantic | `var(--dt-font-size-7xl)` |
| `--dt-text-display-lg-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-md-line` | semantic | `var(--dt-line-height-6xl)` |
| `--dt-text-display-md-size` | semantic | `var(--dt-font-size-6xl)` |
| `--dt-text-display-md-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xl-line` | semantic | `var(--dt-line-height-4xl)` |
| `--dt-text-heading-xl-size` | semantic | `var(--dt-font-size-4xl)` |
| `--dt-text-heading-xl-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-heading-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-link-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-link-brand-hover` | semantic | `var(--dt-color-primary-800)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-link-visited` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-on-action-ghost` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-secondary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-secondary-muted` | semantic | `var(--dt-color-secondary-900)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-info` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-on-scrim-strong` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-selected-brand` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-text-wordmark` | semantic | `var(--dt-text-primary)` |
| `--dt-color-secondary-700` | primitive | `oklch(0.518 0.190 305)` |
| `--dt-measure-default` | primitive | `68ch` |
| `--dt-measure-narrow` | primitive | `45ch` |
| `--dt-measure-wide` | primitive | `85ch` |

## Source

```jsx
import React from "react";

const DEFAULT_SIZE = { 1: "heading-xl", 2: "heading-lg", 3: "heading-md", 4: "heading-sm", 5: "heading-xs", 6: "heading-xs" };
const SIZES = ["display-lg", "display-md", "display-sm", "heading-xl", "heading-lg", "heading-md", "heading-sm", "heading-xs"];
const TONES = {
  headline: "var(--dt-text-headline, var(--dt-text-primary))",
  brand: "var(--dt-text-brand, var(--dt-text-link))",
  "brand-secondary": "var(--dt-text-brand-secondary, var(--dt-color-secondary-700, var(--dt-text-link)))",
  primary: "var(--dt-text-primary)",
  secondary: "var(--dt-text-secondary)",
  inherit: "inherit",
};
const MEASURES = { narrow: "var(--dt-measure-narrow)", default: "var(--dt-measure-default)", wide: "var(--dt-measure-wide)", none: "none" };

export function Heading({ level = 2, size, tone = "headline", align, measure = "none", balance = true, children, style, ...rest }) {
  const lvl = Math.min(6, Math.max(1, Number(level) || 2));
  const Tag = "h" + lvl;
  const role = SIZES.indexOf(size) !== -1 ? size : DEFAULT_SIZE[lvl];
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: `var(--dt-text-${role}-family)`,
        fontSize: `var(--dt-text-${role}-size)`,
        lineHeight: `var(--dt-text-${role}-line)`,
        fontWeight: `var(--dt-text-${role}-weight)`,
        letterSpacing: `var(--dt-text-${role}-tracking)`,
        color: TONES[tone] || TONES.headline,
        textAlign: align,
        maxWidth: MEASURES[measure] || MEASURES.none,
        textWrap: balance ? "balance" : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```
