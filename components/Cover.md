# Cover

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [Cover.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/Cover.jsx), [Cover.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/Cover.d.ts), [Cover.md](https://graham-goebel.github.io/Dovetail/system/components/content/Cover.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Cover.html

## Guidelines

Text laid over a full-bleed image. A marketing hero, a lifestyle poster and a social
caption card are the same shape underneath: an image, a scrim so the text stays legible,
and a block of copy anchored to one edge. Cover is that shape, with a ratio and an anchor
instead of three separate components to keep in sync.

### Rules

- Give it an `alt`. Pass an empty string only when the title on top already says what the
  image shows; that is still a decision, not an omission.
- Keep `title` short. It is set at the heading-lg role over a photograph, not inside a
  measured column, and a photograph does not forgive a title that wraps four times.
- One primary action in `actions`. A hero with three buttons is a hero that has not
  decided what the page is for.
- `scrim="none"` is for an image you control the tone of, or a title short enough to
  live inside a `Badge` you place in `actions` instead of relying on contrast with the
  photo.

### Choosing align and scrim together

`align="bottom"` with `scrim="gradient"` is the marketing hero: the top of the image stays
clean for a person's eye to land on, and the gradient darkens only where the title sits.

`align="center"` switches the gradient to a flat wash automatically, because a caption in
the middle of a frame needs the whole photo dimmed, not one edge of it. Use it for a
poster or a pull-quote over a photo.

`scrim="solid"` is the social read: a flat band of colour behind a caption, legible against
anything behind it. Pair it with `align="bottom"` and a short `body` for a caption strip,
or `align="top"` for a name-and-handle bar over a portrait.

```jsx
<Cover
  src={hero}
  alt=""
  ratio="16:9"
  eyebrow="New season"
  title="Built for the trail, not the showroom"
  body="Four days, three huts, one pack that never left our shoulders."
  actions={<Button>Shop the collection</Button>}
/>
```

### Letting someone upload one

Pass `onFile` and the placeholder becomes a drop target, identical to Image's: a drag or
a picker hands you the browser's own `File`, and Cover does nothing else with it. The
text block still renders once a real `src` arrives, so a template can build the hero
copy first and wire the image in after.

### Tradeoffs

Cover owns the scrim and the anchor; it does not own layout beyond its own box. A grid of
Covers, a Cover beside a `Media` row, a full-viewport Cover as a page's opening
section: all of that is the page's decision, made with `Grid`, `Stack` or plain CSS
around it, the same way every other content primitive in this system stays out of the
page's own layout.

## Props

```ts
import * as React from "react";
import { AspectRatioProps } from "./AspectRatio";

/**
 * Text over a full-bleed image: a hero band, a lifestyle poster, a social
 * caption card. One component covers all three, because the difference
 * between them is a ratio and where the text sits, not a different piece of
 * markup. Renders Image's own upload-ready placeholder when \`src\` is absent.
 */
export interface CoverProps extends Omit<React.HTMLAttributes<HTMLElement>, "placeholder" | "title"> {
  /** Image URL. Omit to render the placeholder frame. */
  src?: string;
  /** Alternative text. Required; pass an empty string when the visible title already says what the image shows. */
  alt: string;
  /** @default "4:3" */
  ratio?: AspectRatioProps["ratio"];
  /** How the image fills its frame. @default "cover" */
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  /** @default "media" */
  radius?: "none" | "media" | "container" | "pill";
  /** Text shown in the placeholder frame. Falls back to \`alt\`. */
  placeholder?: string;
  /** Turns the placeholder into a drop target, exactly as Image's does. */
  onFile?: (file: File) => void;
  /**
   * none for an image bright or busy enough to carry text on its own, most
   * often paired with a badge in `actions` rather than body copy. gradient
   * fades from the anchored edge, the common case. solid washes the whole
   * frame in one flat tone, for a caption you want readable no matter what
   * is behind it. Ignored while the placeholder is showing.
   * @default "gradient"
   */
  scrim?: "none" | "gradient" | "solid";
  /**
   * Vertical anchor for both the text block and the direction a gradient
   * scrim fades from. bottom is the marketing-hero default; center is a
   * poster, and switches a gradient scrim to a flat wash, since a centred
   * caption needs the whole frame dimmed, not one edge of it.
   * @default "bottom"
   */
  align?: "top" | "center" | "bottom";
  /** @default "start" */
  justify?: "start" | "center" | "end";
  /** Short kicker above the title. Uppercased by the eyebrow role. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  body?: React.ReactNode;
  /** Buttons, links, or a Badge for a social-style tag. Keep to one primary action. */
  actions?: React.ReactNode;
}

export declare function Cover(props: CoverProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-radius-media` | semantic | `var(--dt-radius-raw-12)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-scrim-bottom` | semantic | `linear-gradient(to top, color-mix(in oklab, var(--dt-color-neutral-950) 80%, transparent), color-mix(in oklab, var(--dt-color-neutral-950) 40%, transparent) 45%, transparent)` |
| `--dt-scrim-full` | semantic | `color-mix(in oklab, var(--dt-color-neutral-950) 55%, transparent)` |
| `--dt-scrim-top` | semantic | `linear-gradient(to bottom, color-mix(in oklab, var(--dt-color-neutral-950) 80%, transparent), color-mix(in oklab, var(--dt-color-neutral-950) 40%, transparent) 45%, transparent)` |
| `--dt-size-icon-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-scrim` | semantic | `oklch(0.145 0.005 264 / 0.5)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |

## Source

```jsx
import React from "react";
import { AspectRatio } from "./AspectRatio.jsx";
import { UploadFrame } from "./Image.jsx";

const RADII = { none: "0", media: "var(--dt-radius-media)", container: "var(--dt-radius-container)", pill: "var(--dt-radius-pill)" };

const ALIGN = { top: "flex-start", center: "center", bottom: "flex-end" };
const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end" };
const TEXT_ALIGN = { start: "left", center: "center", end: "right" };

const PLACEHOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "var(--dt-size-icon-lg)", height: "var(--dt-size-icon-lg)" }} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

/* Which way a gradient scrim fades. It always fades toward the edge the
   content is anchored to, so the darkest part of the image sits behind the
   text and the rest is left alone. Centre gets a flat wash rather than a
   direction: text in the middle of a photo needs the whole frame dimmed, not
   one edge of it. */
function scrimImage(scrim, align) {
  if (scrim === "none") return "none";
  if (scrim === "solid" || align === "center") return "var(--dt-scrim-full, var(--dt-surface-scrim))";
  return align === "bottom"
    ? "var(--dt-scrim-bottom, linear-gradient(to top, var(--dt-surface-scrim), transparent 65%))"
    : "var(--dt-scrim-top, linear-gradient(to bottom, var(--dt-surface-scrim), transparent 65%))";
}

export function Cover({
  src,
  alt,
  ratio = "4:3",
  fit = "cover",
  radius = "media",
  placeholder,
  onFile,
  scrim = "gradient",
  align = "bottom",
  justify = "start",
  eyebrow,
  title,
  body,
  actions,
  style,
  ...rest
}) {
  const frame = { position: "relative", background: "var(--dt-surface-sunken)", borderRadius: RADII[radius] || RADII.media, ...style };
  const hasContent = eyebrow || title || body || actions;

  return (
    <AspectRatio ratio={ratio} style={frame} {...rest}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, display: "block" }} />
      ) : (
        <UploadFrame icon={PLACEHOLDER_ICON} label={placeholder || alt || "Cover image"} hint="Drop an image, or choose a file" accept="image/*" onFile={onFile} quiet={!!hasContent} />
      )}

      {/* The scrim and the text preview even before src arrives: the caption's
         weight is part of what a template is checking before the photo is
         wired in, the same reason Image's own placeholder reserves the ratio
         rather than collapsing to nothing. */}
      {scrim !== "none" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: scrimImage(scrim, align), borderRadius: "inherit" }} />
      )}

      {hasContent && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: ALIGN[align] || ALIGN.bottom,
            alignItems: JUSTIFY[justify] || JUSTIFY.start,
            textAlign: TEXT_ALIGN[justify] || TEXT_ALIGN.start,
            gap: "var(--dt-space-stack-xs)",
            padding: "var(--dt-space-inset-lg)",
            boxSizing: "border-box",
          }}
        >
          {eyebrow && (
            <span style={{ fontFamily: "var(--dt-text-eyebrow-family)", fontSize: "var(--dt-text-eyebrow-size)", letterSpacing: "var(--dt-text-eyebrow-tracking)", fontWeight: "var(--dt-text-eyebrow-weight)", textTransform: "uppercase", color: "var(--dt-text-on-scrim)" }}>
              {eyebrow}
            </span>
          )}
          {title && (
            <h2 style={{ margin: 0, maxWidth: "40ch", fontFamily: "var(--dt-text-heading-lg-family)", fontSize: "var(--dt-text-heading-lg-size)", lineHeight: "var(--dt-text-heading-lg-line)", fontWeight: "var(--dt-text-heading-lg-weight)", letterSpacing: "var(--dt-text-heading-lg-tracking)", color: "var(--dt-text-on-scrim)", textWrap: "pretty" }}>
              {title}
            </h2>
          )}
          {body && (
            <div style={{ maxWidth: "48ch", fontFamily: "var(--dt-text-body-md-family)", fontSize: "var(--dt-text-body-md-size)", lineHeight: "var(--dt-text-body-md-line)", color: "var(--dt-text-on-scrim-secondary)", textWrap: "pretty" }}>
              {body}
            </div>
          )}
          {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-sm)", justifyContent: JUSTIFY[justify] || JUSTIFY.start }}>{actions}</div>}
        </div>
      )}
    </AspectRatio>
  );
}
```
