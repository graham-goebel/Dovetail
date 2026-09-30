# Section

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [Section.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/Section.jsx), [Section.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/Section.d.ts), [Section.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/Section.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Section.html

## Guidelines

A page section: a column bounded by a container width, the section rhythm above and below, and an optional surface. With `media` it becomes a full-bleed photo band. It is the scaffold both example sites built for themselves before it existed.

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

### Tones
A tone is a surface and the text roles that go on it. The `brand` tone follows Configure's Fill: solid, gradient, duotone, or Quiet, which is the palest tint of the primary (`--dt-surface-brand-muted`, its 050 step) with the text that belongs on it, for a band that does not shout. Padding follows the layout's modules setting. To tint a section without re-colouring its text, put `data-surface="brand-muted"` on it: the surface roles become the brand's tint and text keeps its ordinary roles. Put it on `html` for the whole page. `brand` and `secondary` are full fills; the `-muted` tones are the pale tint of the same hue. The section re-points `--dt-text-primary`, `-secondary` and `-tertiary` on itself, so everything inside that reads the semantic text roles, `Stat` and `Card` descriptions included, follows the band. That is also how to build a band that should not follow the page's light or dark mode: its colours come from the brand roles, not the page surface.

On a `brand` fill the primary button and the fill are the same colour. Use a secondary or ghost button there, or a `-muted` tone.

### Dark and photo bands
`dark` puts the `dark` class on the section, so the semantic tier and the component tier both re-resolve as dark inside it while the rest of the page stays light. A `media` band is scoped dark by default. Its text reads `--dt-text-on-scrim`, which stays light in both modes, because a scrim over a photograph is dark whatever the page is doing.

A scrim's alpha does not tell you the contrast over a specific photograph. Check it the way `guidelines/accessibility.md` describes: hide the text, sample the pixels behind where it sat, and take the worst case.

### Tokens
`--dt-size-container-*`, `--dt-layout-module-padding` (`--dt-space-section` at the default layout), `--dt-space-section-compact`, `--dt-space-gutter`, `--dt-surface-brand*`, `--dt-text-on-brand*`, `--dt-surface-scrim`, `--dt-text-on-scrim*`, `--dt-surface-texture`.

## Props

```ts
import * as React from "react";

/**
 * A page section: a page-width column, the section rhythm above and below it,
 * and an optional surface. Pass `media` and it becomes a full-bleed photo band
 * with a scrim, scoped dark so everything inside it reads as light on dark.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** The inner column. full removes the bound. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
  /**
   * The surface, and the text roles that belong on it. Brand and secondary
   * tones re-point --dt-text-primary, -secondary and -tertiary on the section,
   * so Heading and Text inside follow without a prop. Ignored when `media` is set.
   * @default "base"
   */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this section: every semantic and component colour inside re-resolves as dark. Defaults to true when `media` is set. */
  dark?: boolean;
  /** Layers --dt-surface-texture over the tone. @default false */
  texture?: boolean;
  /** Vertical padding: the module padding (--dt-layout-module-padding, which is --dt-space-section until the layout says otherwise), --dt-space-section-compact, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
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
| `--dt-layout-module-padding` | semantic | `var(--dt-space-section)` |
| `--dt-scrim-full` | semantic | `color-mix(in oklab, var(--dt-color-neutral-950) 55%, transparent)` |
| `--dt-size-container-default` | semantic | `var(--dt-dim-container-xl)` |
| `--dt-size-container-narrow` | semantic | `var(--dt-dim-container-md)` |
| `--dt-size-container-wide` | semantic | `var(--dt-dim-container-2xl)` |
| `--dt-space-gutter` | semantic | `var(--dt-dim-6)` |
| `--dt-space-section` | semantic | `var(--dt-dim-24)` |
| `--dt-space-section-compact` | semantic | `var(--dt-dim-16)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-brand` | semantic | `var(--dt-color-primary-600)` |
| `--dt-surface-brand-muted` | semantic | `var(--dt-color-primary-050)` |
| `--dt-surface-brand-secondary` | semantic | `var(--dt-color-secondary-600)` |
| `--dt-surface-brand-secondary-muted` | semantic | `var(--dt-color-secondary-050)` |
| `--dt-surface-scrim` | semantic | `oklch(0.145 0.005 264 / 0.5)` |
| `--dt-surface-subtle` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-surface-texture` | semantic | `none` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
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

const WIDTHS = {
  narrow: "var(--dt-size-container-narrow)",
  default: "var(--dt-size-container-default)",
  wide: "var(--dt-size-container-wide)",
  full: "none",
};
const SPACING = { default: "var(--dt-layout-module-padding, var(--dt-space-section))", compact: "var(--dt-space-section-compact)", none: "0" };
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
const TONES = {
  base: { background: "var(--dt-surface-base)" },
  subtle: { background: "var(--dt-surface-subtle)" },
  brand: { background: "var(--dt-surface-brand)", ...onFill("var(--dt-text-on-brand)") },
  "brand-muted": { background: "var(--dt-surface-brand-muted)", ...onFill("var(--dt-text-on-brand-muted)") },
  secondary: { background: "var(--dt-surface-brand-secondary)", ...onFill("var(--dt-text-on-brand-secondary)") },
  "secondary-muted": { background: "var(--dt-surface-brand-secondary-muted)", ...onFill("var(--dt-text-on-brand-secondary-muted)") },
};

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
  const pad = SPACING[spacing] || SPACING.default;

  return (
    <Tag
      className={[scoped ? "dark" : null, className].filter(Boolean).join(" ") || undefined}
      style={{
        position: "relative",
        overflow: photo ? "hidden" : undefined,
        ...surface,
        background: fill,
        color: surface.color || "var(--dt-text-primary)",
        display: photo ? "flex" : undefined,
        flexDirection: photo ? "column" : undefined,
        justifyContent: photo ? ALIGN[align] || ALIGN.bottom : undefined,
        minHeight: minHeight || (photo ? "min(70vh, var(--dt-dim-container-sm))" : undefined),
        paddingBlock: pad,
        ...style,
      }}
      {...rest}
    >
      {photo && <img src={media} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      {photo && scrim !== "none" && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: scrimImage(scrim, align) }} />}
      <div
        style={{
          position: photo ? "relative" : undefined,
          width: "100%",
          maxWidth: WIDTHS[width] || WIDTHS.default,
          marginInline: "auto",
          paddingInline: "var(--dt-space-gutter)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </Tag>
  );
}
```
