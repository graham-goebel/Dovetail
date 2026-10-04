# Section

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [Section.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/Section.jsx), [Section.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/Section.d.ts), [Section.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/Section.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Section.html

## Guidelines

A page section: the page column, the module padding above and below, and an optional surface. Its fill can span the screen or sit inset in the page column. With `media` it becomes a photo band. It is the scaffold both example sites built for themselves before it existed.

### Use it when
- Every top-level band of a marketing or editorial page.
- A band should be a fixed brand colour, or a photograph with text over it.

### Don't use it when
- Inside an app shell. Product screens are panels and grids, not stacked bands; use `Stack` and `Grid`.
- The image is the content. A photo someone should look at is an `Image` or a `Cover`, with alt text.

### Example
```jsx
<Section tone="brand-muted" texture>
  <Stack gap="md">
    <Text variant="eyebrow">Why it holds</Text>
    <Heading level={2}>Three tiers, referenced one way</Heading>
  </Stack>
</Section>

<Section media="/img/ridge.webp" align="bottom" width="wide">
  <Heading level={2} size="display-sm">Quiet mornings</Heading>
  <Text variant="lead">Somewhere without a signal.</Text>
</Section>
```

### Spacing, width and bleed
Every section on a page shares one column, `--dt-layout-page-width`, so content lines up from page to page without padding and margin doing the work. Configure's Page width moves it for every page at once. `width="narrow"` and `width="wide"` read `--dt-layout-page-width-narrow` and `-wide`, and `full` drops the bound. The column keeps `--dt-layout-page-gutter` from the screen's edge.

`spacing` sets the padding above and below from the module padding steps: `sm`, `md`, `lg`, `xl` or `none`. They move with the layout's character, so a tight page and an open one keep their proportions. `spacingTop` and `spacingBottom` set either edge apart, for a band that needs more room on top than below. `default` and `compact` are `md` and `sm` by their older names.

`bleed="inset"` sets a band in from the screen's edges: its fill sits in the page column with the container radius, its content is padded by `--dt-layout-module-inset`, and a block of space keeps two inset bands apart. Use it to set one theme apart from the bands around it.

```jsx
<Section spacingTop="xl" spacingBottom="md">
  <Heading level={1} size="display-md">Made slowly</Heading>
</Section>

<Section bleed="inset" tone="brand-muted" spacing="lg">
  <Heading level={2}>Members get early access</Heading>
</Section>
```

### Tones
A tone is a surface and the text roles that go on it. The `brand` tone follows Configure's Fill: solid, gradient, duotone, or Quiet, which is the palest tint of the primary (`--dt-surface-brand-muted`, its 050 step) with the text that belongs on it, for a band that does not shout. Padding follows the layout's modules setting. To tint a section without re-colouring its text, put `data-surface="brand-muted"` on it: the surface roles become the brand's tint and text keeps its ordinary roles. Put it on `html` for the whole page. `brand` and `secondary` are full fills; the `-muted` tones are the pale tint of the same hue. The section re-points `--dt-text-primary`, `-secondary` and `-tertiary` on itself, so everything inside that reads the semantic text roles, `Stat` and `Card` descriptions included, follows the band. That is also how to build a band that should not follow the page's light or dark mode: its colours come from the brand roles, not the page surface.

The `-muted` tones also re-point the buttons inside them. On `brand-muted`, a primary `Button` takes the brand colour and a secondary one the secondary brand colour; on `secondary-muted` the two swap. Each uses the brand-coloured action roles, so its text passes on it.

On a full fill (`brand`, `secondary`) the brand can't be the button too, so the section turns its buttons around. A primary or brand `Button` takes `--dt-text-on-brand` as its fill and the brand as its label; a secondary one is outlined in the text colour; a ghost one reads in it. Links, `--dt-border-subtle` and `-default`, the selected mark and the focus ring move to the text colour as well. `Navbar` and `Drawer` use the same declarations for their brand surfaces, and `data-surface="brand"` does the same for a page or any region.

### Dark and photo bands
`dark` puts the `dark` class on the section, so the semantic tier and the component tier both re-resolve as dark inside it while the rest of the page stays light. A `media` band is scoped dark by default. Its text reads `--dt-text-on-scrim`, which stays light in both modes, because a scrim over a photograph is dark whatever the page is doing.

A scrim's alpha does not tell you the contrast over a specific photograph. Check it the way `guidelines/accessibility.md` describes: hide the text, sample the pixels behind where it sat, and take the worst case.

### Tokens
`--dt-layout-page-width`, `--dt-layout-page-width-narrow`, `--dt-layout-page-width-wide`, `--dt-layout-page-gutter`, `--dt-layout-module-padding-sm`, `-md`, `-lg` and `-xl`, `--dt-layout-module-inset`, `--dt-layout-stack-block`, `--dt-radius-container`, `--dt-surface-brand*`, `--dt-text-on-brand*`, `--dt-surface-scrim`, `--dt-text-on-scrim*`, `--dt-surface-texture`.

## Props

```ts
import * as React from "react";

/**
 * A page section: the page column, the module padding above and below it, and
 * an optional surface, full bleed or set in from the page edges. Pass `media`
 * and it becomes a photo band with a scrim, scoped dark so everything inside
 * it reads as light on dark.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** The column, from the page-width tokens: `narrow` (--dt-layout-page-width-narrow, a reading column), `default` (--dt-layout-page-width, the column every page shares), `wide` (--dt-layout-page-width-wide), or `full` with no bound. Inset, it bounds the band itself. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
  /**
   * The surface, and the text roles that belong on it. Brand and secondary
   * tones re-point --dt-text-primary, -secondary and -tertiary on the section,
   * so Heading and Text inside follow without a prop. The -muted tones also
   * point a Button's primary and secondary at the brand colours (brand-muted:
   * brand then secondary; secondary-muted: the reverse). Ignored when `media` is set.
   * @default "base"
   */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this section: every semantic and component colour inside re-resolves as dark. Defaults to true when `media` is set. */
  dark?: boolean;
  /** Layers --dt-surface-texture over the tone. @default false */
  texture?: boolean;
  /** Padding above and below, from the module padding steps (--dt-layout-module-padding-sm to -xl), which move with the layout's character: `sm`, `md`, `lg`, `xl` or `none`. `default` is `md` and `compact` is `sm`, by their older names. @default "default" */
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "default" | "compact";
  /** Padding above, when it differs from `spacing`: a band can take more room at its top than its foot. */
  spacingTop?: "none" | "sm" | "md" | "lg" | "xl";
  /** Padding below, when it differs from `spacing`. */
  spacingBottom?: "none" | "sm" | "md" | "lg" | "xl";
  /** `full`: the band's fill spans the screen and its content sits in the column. `inset`: the band sits in the page column, set in from the screen's edges by the gutter, with the container radius, and pads its content with --dt-layout-module-inset. @default "full" */
  bleed?: "full" | "inset";
  /** Image URL. Turns the section into a full-bleed photo band. The image is decorative; say what matters in the text. */
  media?: string;
  /** With media: gradient fades from the edge the content sits on, solid washes the whole band. @default "gradient" */
  scrim?: "gradient" | "solid" | "none";
  /** With media: where the content sits. @default "bottom" */
  align?: "top" | "center" | "bottom";
  /** With media: the band's minimum height. @default "min(70vh, 640px)" */
  minHeight?: string;
  /** @default "section" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Section(props: SectionProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-button-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-button-brand-bg` | component | `var(--dt-surface-action-brand)` |
| `--dt-button-brand-bg-active` | component | `var(--dt-surface-action-brand-active)` |
| `--dt-button-brand-bg-hover` | component | `var(--dt-surface-action-brand-hover)` |
| `--dt-button-brand-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-brand-fg` | component | `var(--dt-text-on-action-brand)` |
| `--dt-button-brand-secondary-bg` | component | `var(--dt-surface-action-brand-secondary)` |
| `--dt-button-brand-secondary-bg-active` | component | `var(--dt-surface-action-brand-secondary-active)` |
| `--dt-button-brand-secondary-bg-hover` | component | `var(--dt-surface-action-brand-secondary-hover)` |
| `--dt-button-brand-secondary-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-brand-secondary-fg` | component | `var(--dt-text-on-action-brand-secondary)` |
| `--dt-button-danger-bg` | component | `var(--dt-surface-action-danger)` |
| `--dt-button-danger-bg-active` | component | `var(--dt-surface-action-danger-active)` |
| `--dt-button-danger-bg-hover` | component | `var(--dt-surface-action-danger-hover)` |
| `--dt-button-danger-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-danger-fg` | component | `var(--dt-text-on-action-danger)` |
| `--dt-button-disabled-bg` | component | `var(--dt-surface-action-disabled)` |
| `--dt-button-disabled-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-disabled-fg` | component | `var(--dt-text-on-action-disabled)` |
| `--dt-button-font-family` | component | `var(--dt-text-label-md-family)` |
| `--dt-button-font-size-lg` | component | `var(--dt-font-size-md)` |
| `--dt-button-font-size-md` | component | `var(--dt-font-size-sm)` |
| `--dt-button-font-size-sm` | component | `var(--dt-font-size-sm)` |
| `--dt-button-font-weight` | component | `var(--dt-font-weight-medium)` |
| `--dt-button-gap` | component | `var(--dt-space-inline-xs)` |
| `--dt-button-ghost-bg` | component | `var(--dt-surface-action-ghost)` |
| `--dt-button-ghost-bg-active` | component | `var(--dt-surface-action-ghost-active)` |
| `--dt-button-ghost-bg-hover` | component | `var(--dt-surface-action-ghost-hover)` |
| `--dt-button-ghost-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-ghost-fg` | component | `var(--dt-text-on-action-ghost)` |
| `--dt-button-height-lg` | component | `var(--dt-size-control-lg)` |
| `--dt-button-height-md` | component | `var(--dt-size-control-md)` |
| `--dt-button-height-sm` | component | `var(--dt-size-control-sm)` |
| `--dt-button-padding-lg` | component | `var(--dt-space-inset-lg)` |
| `--dt-button-padding-md` | component | `var(--dt-space-inset-md)` |
| `--dt-button-padding-sm` | component | `var(--dt-space-inset-sm)` |
| `--dt-button-primary-bg` | component | `var(--dt-surface-action)` |
| `--dt-button-primary-bg-active` | component | `var(--dt-surface-action-active)` |
| `--dt-button-primary-bg-hover` | component | `var(--dt-surface-action-hover)` |
| `--dt-button-primary-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-primary-fg` | component | `var(--dt-text-on-action)` |
| `--dt-button-radius` | component | `var(--dt-radius-pill)` |
| `--dt-button-secondary-bg` | component | `var(--dt-surface-action-secondary)` |
| `--dt-button-secondary-bg-active` | component | `var(--dt-surface-action-secondary-active)` |
| `--dt-button-secondary-bg-hover` | component | `var(--dt-surface-action-secondary-hover)` |
| `--dt-button-secondary-border` | component | `var(--dt-border-action-secondary)` |
| `--dt-button-secondary-fg` | component | `var(--dt-text-on-action-secondary)` |
| `--dt-button-transition` | component | `var(--dt-motion-micro)` |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-focus-ring-color` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-focus-ring-offset-color` | semantic | `var(--dt-surface-base)` |
| `--dt-layout-module-inset` | semantic | `var(--dt-dim-8)` |
| `--dt-layout-module-padding-lg` | semantic | `var(--dt-dim-32)` |
| `--dt-layout-module-padding-md` | semantic | `var(--dt-layout-module-padding)` |
| `--dt-layout-module-padding-sm` | semantic | `var(--dt-space-section-compact)` |
| `--dt-layout-module-padding-xl` | semantic | `var(--dt-dim-40)` |
| `--dt-layout-page-gutter` | semantic | `var(--dt-space-gutter)` |
| `--dt-layout-page-width` | semantic | `var(--dt-size-container-default)` |
| `--dt-layout-page-width-narrow` | semantic | `var(--dt-size-container-narrow)` |
| `--dt-layout-page-width-wide` | semantic | `var(--dt-size-container-wide)` |
| `--dt-layout-stack-block` | semantic | `var(--dt-dim-8)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-scrim-full` | semantic | `color-mix(in oklab, var(--dt-color-neutral-950) 55%, transparent)` |
| `--dt-surface-action-active` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-surface-action-brand` | semantic | `var(--dt-color-primary-600)` |
| `--dt-surface-action-brand-active` | semantic | `var(--dt-color-primary-800)` |
| `--dt-surface-action-brand-hover` | semantic | `var(--dt-color-primary-700)` |
| `--dt-surface-action-brand-secondary` | semantic | `var(--dt-color-secondary-600)` |
| `--dt-surface-action-brand-secondary-active` | semantic | `var(--dt-color-secondary-800)` |
| `--dt-surface-action-brand-secondary-hover` | semantic | `var(--dt-color-secondary-700)` |
| `--dt-surface-action-danger` | semantic | `var(--dt-color-red-600)` |
| `--dt-surface-action-danger-active` | semantic | `var(--dt-color-red-800)` |
| `--dt-surface-action-danger-hover` | semantic | `var(--dt-color-red-700)` |
| `--dt-surface-action-disabled` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-action-ghost` | semantic | `var(--dt-color-transparent)` |
| `--dt-surface-action-ghost-active` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-surface-action-ghost-hover` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-action-hover` | semantic | `var(--dt-color-neutral-800)` |
| `--dt-surface-action-secondary` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-action-secondary-active` | semantic | `var(--dt-color-neutral-300)` |
| `--dt-surface-action-secondary-hover` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-brand` | semantic | `var(--dt-color-primary-600)` |
| `--dt-surface-brand-muted` | semantic | `var(--dt-color-primary-050)` |
| `--dt-surface-brand-secondary` | semantic | `var(--dt-color-secondary-600)` |
| `--dt-surface-brand-secondary-muted` | semantic | `var(--dt-color-secondary-050)` |
| `--dt-surface-scrim` | semantic | `oklch(0.145 0.005 264 / 0.5)` |
| `--dt-surface-subtle` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-surface-texture` | semantic | `none` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-on-action-ghost` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-secondary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-secondary-muted` | semantic | `var(--dt-color-secondary-900)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-dim-container-sm` | primitive | `640px` |

## Source

```jsx
import React from "react";

/* The page column, from the page-width tokens, so every page lines up. */
const WIDTHS = {
  narrow: "var(--dt-layout-page-width-narrow)",
  default: "var(--dt-layout-page-width)",
  wide: "var(--dt-layout-page-width-wide)",
  full: "none",
};
/* The module padding steps, which move with the layout's character. default
   and compact are the md and sm steps by their older names. */
const pad = (step) => `var(--dt-layout-module-padding-${step})`;
const SPACING = { none: "0", sm: pad("sm"), md: pad("md"), lg: pad("lg"), xl: pad("xl"), default: pad("md"), compact: pad("sm") };
const ALIGN = { top: "flex-start", center: "center", bottom: "flex-end" };

/* Each tone is a surface and the text roles that belong on it. The text roles
   are re-pointed on the section itself, so a Heading or Text inside it that
   reads --dt-text-secondary gets the fill's own secondary rather than the
   page's grey. That is the "fixed card" pattern: the band decides its colours,
   and everything inside it follows without a prop. */
function onFill(fg) {
  return {
    "--dt-text-primary": fg,
    "--dt-text-headline": fg,
    "--dt-text-secondary": `color-mix(in oklab, ${fg} 88%, transparent)`,
    "--dt-text-tertiary": `color-mix(in oklab, ${fg} 76%, transparent)`,
    color: fg,
  };
}
/* On a pale brand tint, a Button's primary and secondary take the brand
   colours: the tint's own hue leads, the other brand hue follows. Each pair
   comes from the brand-coloured action roles, whose text passes on them. */
function buttonsIn(lead, follow) {
  const out = {};
  [["primary", lead], ["secondary", follow]].forEach(([variant, hue]) => {
    const role = `--dt-surface-action-${hue}`;
    out[`--dt-button-${variant}-bg`] = `var(${role})`;
    out[`--dt-button-${variant}-bg-hover`] = `var(${role}-hover)`;
    out[`--dt-button-${variant}-bg-active`] = `var(${role}-active)`;
    out[`--dt-button-${variant}-fg`] = `var(--dt-text-on-action-${hue})`;
    out[`--dt-button-${variant}-border`] = "transparent";
  });
  return out;
}
/* On a strong brand fill the brand can't be the button too: a primary (or
   brand) Button turns to the fill's own text colour with the fill as its
   label, a secondary one is outlined in that text colour, and a ghost one
   reads in it. Links, borders, the selected mark and the focus ring move to
   the text colour as well, so nothing on the fill disappears into it. */
function onStrong(fg, fill) {
  const mix = (a, pct, b) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;
  const out = {
    "--dt-text-link": fg,
    "--dt-border-subtle": mix(fg, 18, "transparent"),
    "--dt-border-default": mix(fg, 32, "transparent"),
    "--dt-border-selected": fg,
    "--dt-focus-ring-color": fg,
    "--dt-focus-ring-offset-color": fill,
  };
  ["primary", "brand", "brand-secondary"].forEach((v) => {
    out[`--dt-button-${v}-bg`] = fg;
    out[`--dt-button-${v}-bg-hover`] = mix(fg, 88, fill);
    out[`--dt-button-${v}-bg-active`] = mix(fg, 76, fill);
    out[`--dt-button-${v}-fg`] = fill;
    out[`--dt-button-${v}-border`] = "transparent";
  });
  out["--dt-button-secondary-bg"] = "transparent";
  out["--dt-button-secondary-bg-hover"] = mix(fg, 12, "transparent");
  out["--dt-button-secondary-bg-active"] = mix(fg, 20, "transparent");
  out["--dt-button-secondary-fg"] = fg;
  out["--dt-button-secondary-border"] = mix(fg, 55, "transparent");
  out["--dt-button-ghost-bg-hover"] = mix(fg, 12, "transparent");
  out["--dt-button-ghost-bg-active"] = mix(fg, 20, "transparent");
  out["--dt-button-ghost-fg"] = fg;
  return out;
}
const TONES = {
  base: { background: "var(--dt-surface-base)" },
  subtle: { background: "var(--dt-surface-subtle)" },
  brand: { background: "var(--dt-surface-brand)", ...onFill("var(--dt-text-on-brand)"), ...onStrong("var(--dt-text-on-brand)", "var(--dt-surface-brand)") },
  "brand-muted": { background: "var(--dt-surface-brand-muted)", ...onFill("var(--dt-text-on-brand-muted)"), ...buttonsIn("brand", "brand-secondary") },
  secondary: { background: "var(--dt-surface-brand-secondary)", ...onFill("var(--dt-text-on-brand-secondary)"), ...onStrong("var(--dt-text-on-brand-secondary)", "var(--dt-surface-brand-secondary)") },
  "secondary-muted": { background: "var(--dt-surface-brand-secondary-muted)", ...onFill("var(--dt-text-on-brand-secondary-muted)"), ...buttonsIn("brand-secondary", "brand") },
};
TONES["brand-secondary"] = TONES.secondary;
TONES["brand-secondary-muted"] = TONES["secondary-muted"];

/* A brand fill's background and every role that has to follow it: text,
   links, borders, focus and buttons. Section uses it for its tones; other
   bands that take a brand fill (Navbar, the open menu in Drawer) use the same
   declarations, so a Button reads the same on every brand fill. Unknown
   tones give the base surface. */
export function fillTone(tone) {
  return TONES[tone] || TONES.base;
}

function scrimImage(scrim, align) {
  if (scrim === "none") return "none";
  if (scrim === "solid" || align === "center") return "var(--dt-scrim-full, var(--dt-surface-scrim))";
  const to = align === "bottom" ? "to top" : "to bottom";
  /* A band's text block runs taller than a card's caption, so the scrim holds
     at full strength for its first third before it fades. */
  return `linear-gradient(${to}, var(--dt-scrim-full, var(--dt-surface-scrim)) 30%, transparent 90%)`;
}

export function Section({
  width = "default",
  tone = "base",
  dark,
  texture = false,
  spacing = "default",
  spacingTop,
  spacingBottom,
  bleed = "full",
  media,
  scrim = "gradient",
  align = "bottom",
  minHeight,
  as: Tag = "section",
  className,
  children,
  style,
  ...rest
}) {
  const photo = !!media;
  const scoped = dark === undefined ? photo : dark;
  const surface = photo ? { background: "var(--dt-surface-base)", ...onFill("var(--dt-text-on-scrim)"), "--dt-text-secondary": "var(--dt-text-on-scrim-secondary)" } : TONES[tone] || TONES.base;
  const fill = texture && surface.background ? `var(--dt-surface-texture), ${surface.background}` : surface.background;
  const both = SPACING[spacing] || SPACING.default;
  const inset = bleed === "inset";
  const limit = WIDTHS[width] || WIDTHS.default;

  /* The band: its fill, its photo and its padding above and below. Full
     bleed, it spans the screen; inset, it sits in the page column with the
     container radius, so a page can set one theme apart from the next. */
  const band = {
    position: "relative",
    overflow: photo || inset ? "hidden" : undefined,
    ...surface,
    background: fill,
    color: surface.color || "var(--dt-text-primary)",
    display: photo ? "flex" : undefined,
    flexDirection: photo ? "column" : undefined,
    justifyContent: photo ? ALIGN[align] || ALIGN.bottom : undefined,
    minHeight: minHeight || (photo ? "min(70vh, var(--dt-dim-container-sm))" : undefined),
    paddingTop: SPACING[spacingTop] || both,
    paddingBottom: SPACING[spacingBottom] || both,
  };
  const content = (
    <>
      {photo && <img src={media} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      {photo && scrim !== "none" && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: scrimImage(scrim, align) }} />}
      <div
        style={{
          position: photo ? "relative" : undefined,
          width: "100%",
          maxWidth: inset ? undefined : limit,
          marginInline: "auto",
          paddingInline: inset ? "var(--dt-layout-module-inset)" : "var(--dt-layout-page-gutter)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </>
  );
  const scope = [scoped ? "dark" : null, className].filter(Boolean).join(" ") || undefined;

  if (inset) {
    /* The gutter keeps it off the screen's edge, and a block of space keeps
       two inset bands apart. */
    return (
      <Tag className={className} style={{ paddingInline: "var(--dt-layout-page-gutter)", paddingBlock: "var(--dt-layout-stack-block)", ...style }} {...rest}>
        <div className={scoped ? "dark" : undefined} style={{ ...band, maxWidth: limit, marginInline: "auto", borderRadius: "var(--dt-radius-container)", boxSizing: "border-box" }}>
          {content}
        </div>
      </Tag>
    );
  }

  return (
    <Tag className={scope} style={{ ...band, ...style }} {...rest}>
      {content}
    </Tag>
  );
}
```
