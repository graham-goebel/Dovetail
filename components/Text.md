# Text

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Typography family. Files: [Text.jsx](https://graham-goebel.github.io/Dovetail/system/components/typography/Text.jsx), [Text.d.ts](https://graham-goebel.github.io/Dovetail/system/components/typography/Text.d.ts), [Text.md](https://graham-goebel.github.io/Dovetail/system/components/typography/Text.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Text.html

## Guidelines

Running text in one of the system's type roles: an eyebrow, a lead paragraph, body copy, small print, fine print, a label. It replaces the hand-written `.eyebrow`, `.lead` and `.fine` classes every brand otherwise writes for itself.

### Use it when
- Any paragraph or line of text outside `Prose` that belongs to a type role.
- A price, a count or a value that should line up: `variant="label" numeric`.

### Don't use it when
- It is long-form content from a CMS. Use `Prose`, which styles plain elements.
- It is a heading. Use `Heading`.

### Variants
| variant | role | tag | default tone |
| --- | --- | --- | --- |
| `eyebrow` | eyebrow, uppercase | span | secondary |
| `lead` | body-lg | p | secondary |
| `body` | body-md | p | inherit |
| `small` | body-sm | p | inherit |
| `fine` | body-xs | p | tertiary |
| `label` | label-md | span | inherit |

### Example
```jsx
<Stack gap="xs">
  <Text variant="label" weight="semibold" numeric>$48.00</Text>
  <Text variant="fine">Tax calculated at checkout.</Text>
</Stack>
```

Paragraph variants are bounded at `--dt-measure-default` so a line never runs wider than it can be read; pass `measure="none"` inside a narrow column where the bound does nothing.

### Tone
`brand` and `brand-secondary` read `--dt-text-brand` and `--dt-text-brand-secondary`: an eyebrow, a highlighted word or a price in the brand colour, at text contrast in either mode.

```jsx
<Text variant="eyebrow" tone="brand">New season</Text>
```

Every tone is a semantic role, so a `Text` inside a brand or photo `Section` follows the section: the section re-points `--dt-text-primary`, `-secondary` and `-tertiary` for its own surface.

### Tokens
`--dt-text-{role}-*`, `--dt-text-primary`, `-secondary`, `-tertiary`, `-link`, `--dt-measure-*`, `--dt-font-weight-*`. The eyebrow and label roles read `--dt-font-family-secondary`, so a secondary face set in Configure reaches them.

## Props

```ts
import * as React from "react";

/**
 * Running text in one of the system's type roles. The variant picks the role,
 * the tag and a default tone; every one of those can be overridden.
 */
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * eyebrow: small caps label above a heading, secondary. lead: the opening
   * paragraph, body-lg, secondary. body: body-md. small: body-sm. fine: body-xs,
   * tertiary, for terms and footnotes. label: label-md, for a price or a value.
   * @default "body"
   */
  variant?: "eyebrow" | "lead" | "body" | "small" | "fine" | "label";
  /** Overrides the variant's default tone. inherit follows the surface it sits on; brand and brand-secondary read the brand text roles, for an eyebrow, a highlighted word or a price in the brand colour. */
  tone?: "inherit" | "primary" | "secondary" | "tertiary" | "link" | "brand" | "brand-secondary";
  /** Bounds the line length. Defaults to "default" for paragraph variants and "none" for eyebrow and label. */
  measure?: "narrow" | "default" | "wide" | "none";
  /** Overrides the role's weight, most often for a price. */
  weight?: "regular" | "medium" | "semibold";
  align?: React.CSSProperties["textAlign"];
  /** Tabular numerals, so a column of prices lines up. @default false */
  numeric?: boolean;
  /** Overrides the tag: p for paragraph variants, span for eyebrow and label. */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Text(props: TextProps): JSX.Element;
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
| `--dt-text-display-lg-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-lg-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-display-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-md-line` | semantic | `var(--dt-line-height-6xl)` |
| `--dt-text-display-md-size` | semantic | `var(--dt-font-size-6xl)` |
| `--dt-text-display-md-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-md-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xl-line` | semantic | `var(--dt-line-height-4xl)` |
| `--dt-text-heading-xl-size` | semantic | `var(--dt-font-size-4xl)` |
| `--dt-text-heading-xl-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-xl-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-semibold)` |
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
| `--dt-text-link` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-primary-800)` |
| `--dt-text-link-visited` | semantic | `var(--dt-color-violet-700)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
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
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-text-wordmark` | semantic | `var(--dt-text-primary)` |
| `--dt-color-secondary-700` | primitive | `oklch(0.518 0.190 305)` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-font-weight-regular` | primitive | `400` |
| `--dt-font-weight-semibold` | primitive | `600` |
| `--dt-measure-default` | primitive | `68ch` |
| `--dt-measure-narrow` | primitive | `45ch` |
| `--dt-measure-wide` | primitive | `85ch` |

## Source

```jsx
import React from "react";

const VARIANTS = {
  eyebrow: { role: "eyebrow", tag: "span", tone: "secondary", measure: "none", upper: true },
  lead: { role: "body-lg", tag: "p", tone: "secondary", measure: "default" },
  body: { role: "body-md", tag: "p", tone: "inherit", measure: "default" },
  small: { role: "body-sm", tag: "p", tone: "inherit", measure: "default" },
  fine: { role: "body-xs", tag: "p", tone: "tertiary", measure: "default" },
  label: { role: "label-md", tag: "span", tone: "inherit", measure: "none" },
};
const TONES = {
  inherit: "inherit",
  primary: "var(--dt-text-primary)",
  secondary: "var(--dt-text-secondary)",
  tertiary: "var(--dt-text-tertiary)",
  link: "var(--dt-text-link)",
  brand: "var(--dt-text-brand, var(--dt-text-link))",
  "brand-secondary": "var(--dt-text-brand-secondary, var(--dt-color-secondary-700, var(--dt-text-link)))",
};
const MEASURES = { narrow: "var(--dt-measure-narrow)", default: "var(--dt-measure-default)", wide: "var(--dt-measure-wide)", none: "none" };
const WEIGHTS = { regular: "var(--dt-font-weight-regular)", medium: "var(--dt-font-weight-medium)", semibold: "var(--dt-font-weight-semibold)" };

export function Text({ variant = "body", tone, measure, weight, align, numeric = false, as, children, style, ...rest }) {
  const v = VARIANTS[variant] || VARIANTS.body;
  const Tag = as || v.tag;
  const role = v.role;
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: `var(--dt-text-${role}-family)`,
        fontSize: `var(--dt-text-${role}-size)`,
        lineHeight: `var(--dt-text-${role}-line)`,
        fontWeight: WEIGHTS[weight] || `var(--dt-text-${role}-weight)`,
        letterSpacing: `var(--dt-text-${role}-tracking)`,
        textTransform: v.upper ? "uppercase" : undefined,
        color: TONES[tone || v.tone] || TONES.inherit,
        maxWidth: MEASURES[measure || v.measure] || MEASURES.none,
        textAlign: align,
        textWrap: v.tag === "p" ? "pretty" : undefined,
        fontVariantNumeric: numeric ? "tabular-nums" : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```
