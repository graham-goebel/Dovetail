# Card

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Card.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Card.jsx), [Card.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Card.d.ts), [Card.md](https://graham-goebel.github.io/Dovetail/system/components/display/Card.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Card.html

## Guidelines

A content container. Card is the clearest demonstration of the context system: the same component is a bordered, flat panel in product and a borderless, softly raised content block in marketing.

### Use it when
- Grouping related content that could stand alone: a plan, a setting group, a dashboard panel, a feature block.

### Don't use it when
- Everything on the page is a card. Nesting cards inside cards means neither is doing any work. Use `Stack` and a `Divider`.
- It is a list of similar rows. Use one container with row borders.

### Example
```jsx
<Card
  eyebrow="Best value"
  title="Team"
  description="Everything in Starter, plus shared workspaces."
  footer={<Button fullWidth>Choose Team</Button>}
/>
```

### Product vs marketing
Set by the context, not by a prop.

| | Product | Marketing |
|---|---|---|
| Padding | 16px | 32px |
| Border | 1px | none |
| Elevation | 0, raising to 1 | 0, raising to 2 |
| Radius | container (8px) | overlay (12px) |

If a card needs different treatment inside one context, that is a Tier 3 override on a wrapper, not a new prop.

### Tokens
`--dt-card-*`. Override these to restyle every card; override `--dt-surface-raised` to move all raised surfaces together.

### As a link
Pass `href` and the whole card goes there. The title becomes the one link a screen reader announces and a keyboard reaches; a copy of it, hidden from assistive technology, stretches over the card so a click anywhere lands. Put a real button in `footer`: it sits above the stretched link and keeps its own click.

```jsx
<Card href="/trips/ridge" title="Ridge loop" description="Four days, three huts." footer={<Button size="sm" variant="secondary">Save</Button>} />
```

### Over other content
`surface="glass"` makes the card the overlay surface, translucent, with `--dt-backdrop-glass` blurring whatever is behind it: a feed scrolling under it, a map, a soft gradient. It follows the colour mode. `surface="glass-inverse"` is dark in both modes, for a card over a photograph, and puts the `dark` class on the card so its title, text and any buttons inside read light on dark. Check the text against the real image behind it, as `guidelines/accessibility.md` describes.

```jsx
<Card surface="glass-inverse" title="Recovery" description="Your body is ready for a harder session." />
```

### With a picture behind it
`background` fills the card with an image and `backgroundVideo` with a muted, looping video, which doesn't autoplay for someone who prefers reduced motion (they see `background` as its still). The card is then dark in both colour modes: it scopes `.dark`, holds at least `--dt-card-media-min-height`, and sets its content at the bottom over `scrim`.

- `scrim="gradient"` (the default) darkens from the bottom, where the text sits. `solid` darkens the whole card. `none` is only for a picture already dark where the text lands.
- `onMedia` sets the text: `light` is the scrim's near-white, `white` is pure white for large type that would read as grey, and `primary` sets the title in a light brand step. Secondary text stays a quieter light either way.

```jsx
<Card background="/img/ridge.jpg" eyebrow="Guide" title="Ridge loop" description="Four days, three huts." onMedia="white" />
<Card backgroundVideo="/video/surf.mp4" background="/img/surf.jpg" scrim="solid" title="Morning session" onMedia="primary" />
```

The picture is decorative: say what matters about it in the title or description. Measure the text against the real picture, as `guidelines/accessibility.md` describes; a scrim is a floor, not a guarantee.

Tokens: `--dt-card-media-fg`, `--dt-card-media-fg-secondary`, `--dt-card-media-fg-strong`, `--dt-card-media-fg-brand`, `--dt-card-media-border` and `--dt-card-media-min-height`, aliasing `--dt-text-on-scrim*` and `--dt-size-media-min`.

### Accessibility
`interactive` is visual only. A clickable card needs a real control inside it, `href`, or `as="button"` with an accessible name. A div with onClick is not keyboard operable.

### Content
Eyebrow is two or three words. Title is a noun phrase. Description is one sentence.

## Props

```ts
import * as React from "react";

/**
 * Content container. The most context-sensitive component in the system.
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Uppercase label above the title. */
  eyebrow?: string;
  title?: React.ReactNode;
  /** Secondary copy below the title. */
  description?: React.ReactNode;
  /** Image or media slot, rendered above everything. */
  media?: React.ReactNode;
  /** Action row at the bottom. */
  footer?: React.ReactNode;
  /** Raises elevation on hover and sets a pointer cursor. */
  /**
   * Makes the whole card a link. The title becomes the link a screen reader
   * hears, and a copy of it stretches over the card for a pointer. Buttons in
   * `footer` stay clickable above it; put interactive content there, not in
   * children. Implies the interactive hover lift.
   */
  /**
   * raised is the card surface. glass and glass-strong are the overlay made
   * translucent, blurring what is behind, for a card over a feed or a map;
   * they follow the colour mode. glass-inverse is dark in both modes, for a
   * card over a photograph, and scopes dark mode so its contents read light.
   * @default "raised"
   */
  surface?: "raised" | "glass" | "glass-strong" | "glass-inverse";
  /**
   * An image URL to fill the card behind its content. The card becomes dark
   * in both colour modes (it scopes `.dark`, like `glass-inverse`), holds at
   * least `--dt-card-media-min-height`, and sets its content at the bottom
   * over a scrim. The picture is decorative; put what it shows in the title
   * or description. Also the poster for `backgroundVideo`.
   */
  background?: string;
  /**
   * A video URL to fill the card instead: muted, looping and inline. It does
   * not autoplay for someone who prefers reduced motion; they see
   * `background` as a still.
   */
  backgroundVideo?: string;
  /** Which part of the picture stays in frame, as CSS `object-position`. @default "center" */
  backgroundPosition?: string;
  /**
   * The wash between the picture and the text. gradient darkens from the
   * bottom, where the text sits; solid darkens the whole card; none is for a
   * picture that is already dark where the text lands. Check the contrast
   * against the real picture either way.
   * @default "gradient"
   */
  scrim?: "gradient" | "solid" | "none";
  /**
   * The text colour over a picture. light is the scrim's near-white; white is
   * pure white, for large type that would otherwise read as grey; primary
   * sets the title in a light brand step. Secondary text stays a quieter
   * light in every case.
   * @default "light"
   */
  onMedia?: "light" | "white" | "primary";
  href?: string;
  interactive?: boolean;
  /** Primary-colour border and tinted background for a chosen option. */
  selected?: boolean;
  /** @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Card(props: CardProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-card-bg` | component | `var(--dt-surface-raised)` |
| `--dt-card-border-color` | component | `var(--dt-border-default)` |
| `--dt-card-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-card-elevation` | component | `var(--dt-elevation-0)` |
| `--dt-card-elevation-hover` | component | `var(--dt-elevation-1)` |
| `--dt-card-fg` | component | `var(--dt-text-primary)` |
| `--dt-card-gap` | component | `var(--dt-space-stack-sm)` |
| `--dt-card-media-border` | component | `var(--dt-border-glass-inverse)` |
| `--dt-card-media-fg` | component | `var(--dt-text-on-scrim)` |
| `--dt-card-media-fg-brand` | component | `var(--dt-text-on-scrim-brand)` |
| `--dt-card-media-fg-secondary` | component | `var(--dt-text-on-scrim-secondary)` |
| `--dt-card-media-fg-strong` | component | `var(--dt-text-on-scrim-strong)` |
| `--dt-card-media-min-height` | component | `var(--dt-size-media-min)` |
| `--dt-card-padding` | component | `var(--dt-space-inset-lg)` |
| `--dt-card-radius` | component | `var(--dt-radius-container)` |
| `--dt-card-selected-bg` | component | `var(--dt-surface-selected)` |
| `--dt-card-selected-border` | component | `var(--dt-border-selected)` |
| `--dt-card-transition` | component | `var(--dt-motion-micro)` |
| `--dt-backdrop-glass` | semantic | `saturate(1.6) blur(var(--dt-blur-glass))` |
| `--dt-border-glass` | semantic | `color-mix(in oklab, var(--dt-text-primary) 10%, transparent)` |
| `--dt-border-glass-inverse` | semantic | `color-mix(in oklab, var(--dt-color-neutral-050) 14%, transparent)` |
| `--dt-scrim-bottom` | semantic | `linear-gradient(to top, color-mix(in oklab, var(--dt-color-neutral-950) 80%, transparent), color-mix(in oklab, var(--dt-color-neutral-950) 40%, transparent) 45%, transparent)` |
| `--dt-scrim-full` | semantic | `color-mix(in oklab, var(--dt-color-neutral-950) 55%, transparent)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-glass` | semantic | `color-mix(in oklab, var(--dt-surface-overlay) 72%, transparent)` |
| `--dt-surface-glass-inverse` | semantic | `color-mix(in oklab, var(--dt-color-neutral-950) 58%, transparent)` |
| `--dt-surface-glass-strong` | semantic | `color-mix(in oklab, var(--dt-surface-overlay) 88%, transparent)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |

## Source

```jsx
import React from "react";

const GLASS = "var(--dt-backdrop-glass, saturate(1.4) blur(16px))";

/* Glass surfaces for a card that sits over other content. Glass follows the
   colour mode; inverse glass is dark in both, for a card over a photograph,
   and scopes dark mode so everything inside it reads light on dark. */
const SURFACES = {
  glass: { bg: "var(--dt-surface-glass)", bd: "var(--dt-border-glass)" },
  "glass-strong": { bg: "var(--dt-surface-glass-strong)", bd: "var(--dt-border-glass)" },
  "glass-inverse": { bg: "var(--dt-surface-glass-inverse)", bd: "var(--dt-border-glass-inverse)" },
};

/* A card over a photograph or a video. The scrim fades up from the bottom,
   where the text sits, or washes the whole card; "none" is for a picture
   that is already dark where the text lands. */
const SCRIMS = {
  gradient: "var(--dt-scrim-bottom)",
  solid: "var(--dt-scrim-full)",
  none: "none",
};

/* What the text over a picture is set in: the scrim's light text, pure white
   for large type that must not read as grey, or a light brand step on the
   title. Secondary text stays a quieter light in every case. */
const ON_MEDIA = {
  light: { fg: "var(--dt-card-media-fg)", title: "var(--dt-card-media-fg)" },
  white: { fg: "var(--dt-card-media-fg-strong)", title: "var(--dt-card-media-fg-strong)" },
  primary: { fg: "var(--dt-card-media-fg)", title: "var(--dt-card-media-fg-brand)" },
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Card({ eyebrow, title, description, media, footer, href, interactive = false, selected = false, surface = "raised", background, backgroundVideo, backgroundPosition = "center", scrim = "gradient", onMedia = "light", as: Tag = "div", className, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const linked = !!href;
  const lift = interactive || linked;
  const glass = SURFACES[surface];
  /* With a picture behind it the card is dark in both colour modes, so it
     scopes dark mode the way inverse glass does: a Button or Badge in the
     footer reads light on dark without being told. */
  const pictured = !!(background || backgroundVideo);
  const tone = ON_MEDIA[onMedia] || ON_MEDIA.light;
  if (pictured) {
    const text = { position: "relative", zIndex: 1 };
    return (
      <Tag
        className={["dark", className].filter(Boolean).join(" ")}
        onMouseEnter={() => lift && setHover(true)}
        onMouseLeave={() => lift && setHover(false)}
        style={{
          position: "relative", overflow: "hidden", isolation: "isolate",
          display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "var(--dt-card-gap)",
          minHeight: "var(--dt-card-media-min-height)",
          background: "var(--dt-surface-glass-inverse)",
          color: tone.fg,
          border: `var(--dt-card-border-width) solid ${selected ? "var(--dt-card-selected-border)" : "var(--dt-card-media-border)"}`,
          borderRadius: "var(--dt-card-radius)",
          padding: "var(--dt-card-padding)",
          boxShadow: hover ? "var(--dt-card-elevation-hover)" : "var(--dt-card-elevation)",
          transition: "box-shadow var(--dt-card-transition), border-color var(--dt-card-transition)",
          cursor: lift ? "pointer" : undefined,
          ...style,
        }}
        {...rest}
      >
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {backgroundVideo ? (
            <video src={backgroundVideo} poster={background} muted loop playsInline autoPlay={!prefersReducedMotion()} preload="metadata" tabIndex={-1}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: backgroundPosition, display: "block" }} />
          ) : (
            <img src={background} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: backgroundPosition, display: "block" }} />
          )}
          {scrim !== "none" && <div style={{ position: "absolute", inset: 0, background: SCRIMS[scrim] || SCRIMS.gradient }} />}
        </div>
        {media && <div style={text}>{media}</div>}
        {eyebrow && (
          <span style={{
            ...text,
            fontFamily: "var(--dt-text-eyebrow-family)", fontSize: "var(--dt-text-eyebrow-size)",
            lineHeight: "var(--dt-text-eyebrow-line)", fontWeight: "var(--dt-text-eyebrow-weight)",
            letterSpacing: "var(--dt-text-eyebrow-tracking)", textTransform: "uppercase",
            color: "var(--dt-card-media-fg-secondary)",
          }}>{eyebrow}</span>
        )}
        {title && (
          <span style={{
            ...text,
            fontFamily: "var(--dt-text-heading-sm-family)", fontSize: "var(--dt-text-heading-sm-size)",
            lineHeight: "var(--dt-text-heading-sm-line)", fontWeight: "var(--dt-text-heading-sm-weight)",
            letterSpacing: "var(--dt-text-heading-sm-tracking)", color: tone.title,
          }}>{linked ? <a href={href} style={{ color: "inherit", textDecoration: hover ? "underline" : "none", textUnderlineOffset: 2 }}>{title}</a> : title}</span>
        )}
        {description && (
          <span style={{
            ...text,
            fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
            lineHeight: "var(--dt-text-body-sm-line)", color: onMedia === "white" ? tone.fg : "var(--dt-card-media-fg-secondary)",
          }}>{description}</span>
        )}
        {children && <div style={text}>{children}</div>}
        {linked && <a href={href} aria-hidden="true" tabIndex={-1} style={{ position: "absolute", inset: 0, zIndex: 2, borderRadius: "inherit" }} />}
        {footer && <div style={{ marginTop: "var(--dt-space-stack-xs)", position: "relative", zIndex: 3 }}>{footer}</div>}
      </Tag>
    );
  }
  return (
    <Tag
      className={[surface === "glass-inverse" ? "dark" : null, className].filter(Boolean).join(" ") || undefined}
      onMouseEnter={() => lift && setHover(true)}
      onMouseLeave={() => lift && setHover(false)}
      style={{
        display: "flex", flexDirection: "column", gap: "var(--dt-card-gap)",
        background: selected ? "var(--dt-card-selected-bg)" : glass ? glass.bg : "var(--dt-card-bg)",
        backdropFilter: glass ? GLASS : undefined,
        WebkitBackdropFilter: glass ? GLASS : undefined,
        color: "var(--dt-card-fg)",
        border: `var(--dt-card-border-width) solid ${selected ? "var(--dt-card-selected-border)" : glass ? glass.bd : "var(--dt-card-border-color)"}`,
        borderRadius: "var(--dt-card-radius)",
        padding: "var(--dt-card-padding)",
        boxShadow: glass ? "none" : hover ? "var(--dt-card-elevation-hover)" : "var(--dt-card-elevation)",
        transition: "box-shadow var(--dt-card-transition), border-color var(--dt-card-transition)",
        cursor: lift ? "pointer" : undefined,
        position: linked ? "relative" : undefined,
        ...style,
      }}
      {...rest}
    >
      {media}
      {eyebrow && (
        <span style={{
          fontFamily: "var(--dt-text-eyebrow-family)", fontSize: "var(--dt-text-eyebrow-size)",
          lineHeight: "var(--dt-text-eyebrow-line)", fontWeight: "var(--dt-text-eyebrow-weight)",
          letterSpacing: "var(--dt-text-eyebrow-tracking)", textTransform: "uppercase",
          color: "var(--dt-text-secondary)",
        }}>{eyebrow}</span>
      )}
      {title && (
        <span style={{
          fontFamily: "var(--dt-text-heading-sm-family)", fontSize: "var(--dt-text-heading-sm-size)",
          lineHeight: "var(--dt-text-heading-sm-line)", fontWeight: "var(--dt-text-heading-sm-weight)",
          letterSpacing: "var(--dt-text-heading-sm-tracking)",
        }}>{linked ? <a href={href} style={{ color: "inherit", textDecoration: hover ? "underline" : "none", textUnderlineOffset: 2 }}>{title}</a> : title}</span>
      )}
      {description && (
        <span style={{
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)",
        }}>{description}</span>
      )}
      {children}
      {/* The title is the one link a screen reader hears. This copy stretches
          the same target over the whole card for a pointer, and sits under the
          footer so a real button there still gets its own click. */}
      {linked && <a href={href} aria-hidden="true" tabIndex={-1} style={{ position: "absolute", inset: 0, borderRadius: "inherit" }} />}
      {footer && <div style={{ marginTop: "var(--dt-space-stack-xs)", position: linked ? "relative" : undefined, zIndex: linked ? 1 : undefined }}>{footer}</div>}
    </Tag>
  );
}
```
