# SocialPost

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [SocialPost.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/SocialPost.jsx), [SocialPost.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/SocialPost.d.ts), [SocialPost.md](https://graham-goebel.github.io/Dovetail/system/components/content/SocialPost.md).

Live page: https://graham-goebel.github.io/Dovetail/components/SocialPost.html

## Guidelines

A social post drawn on an artboard at the format's native pixel size and scaled to fit wherever it is shown: an Instagram story (9:16, 1080 × 1920) or a grid post (4:5, 1080 × 1350, or 1:1, 1080 × 1080). A screenshot of the artboard at full size is ready to publish.

### Use it when
- Making a set of stories or grid posts that should read as one brand.
- Previewing social assets beside the product they announce, themed by the same tokens.

### Don't use it when
- Showing someone else's post in a feed. That is a `Card` in the social context.

### Layouts
Ten layouts share one frame: the brand and an optional `counter` along the top, the `handle` and a `cta` pill along the bottom, and one editorial type scale between.

| On a tone | Around a photograph |
|---|---|
| `headline`: a big line with eyebrow and body | `cover`: full-bleed photo, headline on a scrim |
| `quote`: an oversized quote mark, the quote and `meta` | `split`: photo above, copy below |
| `stat`: one huge number, what it counts, a qualifier | `framed`: the photo as a card inside the tone, caption under |
| `list`: a title over up to five numbered `items` | `card`: full-bleed photo with a frosted card of copy |
| `announcement`: centred, with a `badge` and a date | `poster`: one word, as large as its length allows |

### Example
```jsx
<SocialPost layout="headline" tone="brand" format="story" brand="High Route" handle="@highroute"
  eyebrow="Summer 2026" title="Walk the high route." body="Four to nine days between huts." cta="Link in bio" />

<SocialPost layout="cover" format="portrait" image="/img/alpine.jpg" eyebrow="Route 04" title="Above the tree line" />
```

### Keeping a set cohesive
Keep one `brand` and `handle`, alternate tone and pictured layouts down a carousel, and number it with `counter`. Every size and colour comes from tokens, so changing the theme rebrands the whole set.

### Tokens
`--dt-social-*` in `tokens/component/social.css`: the artboard width and heights, padding, gap and radius, alias `--dt-size-artboard-*` and `--dt-space-artboard*`; the type sizes alias the `--dt-text-artboard-*` roles, drawn for a 1080px canvas and never retuned by a context; the colours alias the ordinary surface and text roles, and `--dt-text-on-scrim-strong` on photographs.

### Accessibility
The post is exposed as one image (`role="img"`) named by `label`, or by its eyebrow, title and body. When you publish it, write the same text into the platform's alt text.

## Props

```ts
import * as React from "react";

/**
 * A social post drawn on an artboard at the format's native pixel size
 * (1080 wide) and scaled to fit its container: an Instagram story (9:16) or a
 * grid post (4:5 or 1:1). Ten layouts share one frame and type scale, half on
 * a plain tone and half on a photograph.
 */
export interface SocialPostProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * headline, quote, stat, list and announcement sit on a tone; cover, split,
   * framed, card and poster are built around `image`.
   * @default "headline"
   */
  layout?: "headline" | "quote" | "stat" | "list" | "announcement" | "cover" | "split" | "framed" | "card" | "poster";
  /** story is 1080 × 1920; portrait 1080 × 1350; square 1080 × 1080. @default "story" */
  format?: "story" | "portrait" | "square";
  /** The plain background, for layouts that have one. ink is dark in both colour modes. @default "brand" */
  tone?: "brand" | "brand-muted" | "secondary" | "paper" | "ink";
  /** Image URL for the pictured layouts. Decorative: say what matters in the text. */
  image?: string;
  /** CSS object-position for the image. @default "center" */
  imagePosition?: string;
  /** A few words above the title, set in mono capitals. */
  eyebrow?: React.ReactNode;
  /** The big editorial line: a headline, the quote, the number, or the poster's one word. */
  title?: React.ReactNode;
  /** One or two sentences under the title. */
  body?: React.ReactNode;
  /** A byline, attribution or date. */
  meta?: React.ReactNode;
  /** The numbered lines of the list layout. Five at most reads best. */
  items?: React.ReactNode[];
  /** A pill above the announcement's title, such as "New". */
  badge?: React.ReactNode;
  /** The brand name in the top corner. @default "Dovetail" */
  brand?: React.ReactNode;
  /** A mark before the brand name; defaults to a dot in the text colour. */
  mark?: React.ReactNode;
  /** The account handle along the bottom. */
  handle?: React.ReactNode;
  /** A short call to action in a pill at the bottom right: "Swipe", "Link in bio". */
  cta?: React.ReactNode;
  /** A carousel counter in the top corner: "03/10". */
  counter?: React.ReactNode;
  /** The accessible name of the post as an image. Defaults to its eyebrow, title and body. */
  label?: string;
}

export declare function SocialPost(props: SocialPostProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-social-bg` | component | `var(--dt-surface-base)` |
| `--dt-social-body-line` | component | `var(--dt-text-artboard-body-line)` |
| `--dt-social-body-size` | component | `var(--dt-text-artboard-body-size)` |
| `--dt-social-display-family` | component | `var(--dt-text-artboard-display-family)` |
| `--dt-social-display-line` | component | `var(--dt-text-artboard-display-line)` |
| `--dt-social-display-size` | component | `var(--dt-text-artboard-display-size)` |
| `--dt-social-display-tracking` | component | `var(--dt-text-artboard-display-tracking)` |
| `--dt-social-display-weight` | component | `var(--dt-text-artboard-display-weight)` |
| `--dt-social-fg` | component | `var(--dt-text-primary)` |
| `--dt-social-gap` | component | `var(--dt-space-artboard-gap)` |
| `--dt-social-height-portrait` | component | `var(--dt-size-artboard-portrait)` |
| `--dt-social-height-square` | component | `var(--dt-size-artboard-square)` |
| `--dt-social-height-story` | component | `var(--dt-size-artboard-story)` |
| `--dt-social-meta-size` | component | `var(--dt-text-artboard-meta-size)` |
| `--dt-social-meta-tracking` | component | `var(--dt-text-artboard-meta-tracking)` |
| `--dt-social-muted` | component | `var(--dt-text-secondary)` |
| `--dt-social-on-image` | component | `var(--dt-text-on-scrim-strong)` |
| `--dt-social-on-image-muted` | component | `var(--dt-text-on-scrim)` |
| `--dt-social-padding` | component | `var(--dt-space-artboard)` |
| `--dt-social-radius` | component | `calc(var(--dt-radius-overlay) * 2)` |
| `--dt-social-rule` | component | `var(--dt-border-default)` |
| `--dt-social-title-line` | component | `var(--dt-text-artboard-title-line)` |
| `--dt-social-title-size` | component | `var(--dt-text-artboard-title-size)` |
| `--dt-social-width` | component | `var(--dt-size-artboard-width)` |
| `--dt-backdrop-glass` | semantic | `saturate(1.6) blur(var(--dt-blur-glass))` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-radius-media` | semantic | `var(--dt-radius-raw-12)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-scrim-bottom` | semantic | `linear-gradient(to top, color-mix(in oklab, var(--dt-color-neutral-950) 80%, transparent), color-mix(in oklab, var(--dt-color-neutral-950) 40%, transparent) 45%, transparent)` |
| `--dt-scrim-top` | semantic | `linear-gradient(to bottom, color-mix(in oklab, var(--dt-color-neutral-950) 80%, transparent), color-mix(in oklab, var(--dt-color-neutral-950) 40%, transparent) 45%, transparent)` |
| `--dt-surface-brand` | semantic | `var(--dt-color-primary-600)` |
| `--dt-surface-brand-muted` | semantic | `var(--dt-color-primary-050)` |
| `--dt-surface-brand-secondary` | semantic | `var(--dt-color-secondary-600)` |
| `--dt-surface-glass-inverse` | semantic | `color-mix(in oklab, var(--dt-color-neutral-950) 58%, transparent)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-family-mono` | primitive | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |
| `--dt-font-family-sans` | primitive | `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--dt-font-weight-semibold` | primitive | `600` |
| `--dt-tracking-tight` | primitive | `-0.02em` |

## Source

```jsx
import React from "react";

/* A social post: an Instagram story (9:16) or grid post (4:5 or 1:1), drawn on
   an artboard at the format's native pixel size and scaled to fit its
   container. A screenshot of it at full size is ready to publish.

   Ten layouts share one frame so a set of posts reads as one voice: a mark and
   an optional counter along the top, a handle and a call to action along the
   bottom, and one type scale for everything between. Half the layouts sit on
   a plain tone and half on a photograph. */

const RATIO = { story: "9 / 16", portrait: "4 / 5", square: "1 / 1" };
/* The fallbacks are the artboard sizes themselves, so a page whose copy of the
   tokens predates this component still draws a post rather than a blank. */
const NATIVE_WIDTH = 1080;
const WIDTH = `var(--dt-social-width, ${NATIVE_WIDTH}px)`;
const HEIGHT = {
  story: "var(--dt-social-height-story, 1920px)",
  portrait: "var(--dt-social-height-portrait, 1350px)",
  square: "var(--dt-social-height-square, 1080px)",
};
/* The display size steps down as the format gets shorter. */
const SCALE = { story: 1, portrait: 0.86, square: 0.74 };

function fill(bg, fg) {
  return { background: bg, color: fg, "--dt-social-fg": fg, "--dt-social-muted": `color-mix(in oklab, ${fg} 76%, transparent)`, "--dt-social-rule": `color-mix(in oklab, ${fg} 24%, transparent)` };
}
const TONES = {
  paper: { style: { background: "var(--dt-social-bg)", color: "var(--dt-social-fg)" } },
  ink: { dark: true, style: { background: "var(--dt-social-bg)", color: "var(--dt-social-fg)" } },
  brand: { style: fill("var(--dt-surface-brand)", "var(--dt-text-on-brand)") },
  "brand-muted": { style: fill("var(--dt-surface-brand-muted)", "var(--dt-text-on-brand-muted)") },
  secondary: { style: fill("var(--dt-surface-brand-secondary)", "var(--dt-text-on-brand-secondary)") },
};
const PICTURED = { cover: true, split: true, framed: true, card: true, poster: true };

function useScale(ref) {
  const [scale, setScale] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const native = parseFloat(getComputedStyle(el).getPropertyValue("--dt-social-width")) || NATIVE_WIDTH;
      setScale(el.clientWidth / native);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

const meta = {
  fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-social-meta-size)",
  letterSpacing: "var(--dt-social-meta-tracking)", textTransform: "uppercase", lineHeight: 1.2,
};
const body = { margin: 0, maxWidth: "none", fontSize: "var(--dt-social-body-size)", lineHeight: "var(--dt-social-body-line)", color: "var(--dt-social-muted)", textWrap: "pretty" };

function display(format, factor = 1) {
  const k = SCALE[format] * factor;
  return {
    margin: 0,
    color: "inherit",
    fontFamily: "var(--dt-social-display-family)",
    fontSize: `calc(var(--dt-social-display-size) * ${k})`,
    lineHeight: `calc(var(--dt-social-display-line) * ${k})`,
    fontWeight: "var(--dt-social-display-weight)",
    letterSpacing: "var(--dt-social-display-tracking)",
    textWrap: "balance",
  };
}
function title(format, factor = 1) {
  const k = SCALE[format] * factor;
  return {
    margin: 0,
    color: "inherit",
    fontFamily: "var(--dt-social-display-family)",
    fontSize: `calc(var(--dt-social-title-size) * ${k})`,
    lineHeight: `calc(var(--dt-social-title-line) * ${k})`,
    fontWeight: "var(--dt-social-display-weight)",
    letterSpacing: "var(--dt-social-display-tracking)",
    textWrap: "balance",
  };
}

function Picture({ image, position, label, style }) {
  return image ? (
    <img src={image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position, display: "block", ...style }} />
  ) : (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--dt-surface-sunken)", color: "var(--dt-text-tertiary)", ...meta, ...style }}>{label || "Image"}</div>
  );
}

export function SocialPost({
  layout = "headline",
  format = "story",
  tone = "brand",
  image,
  imagePosition = "center",
  eyebrow,
  title: heading,
  body: text,
  meta: byline,
  items = [],
  badge,
  brand = "Dovetail",
  mark,
  handle,
  cta,
  counter,
  label,
  style,
  ...rest
}) {
  const box = React.useRef(null);
  const scale = useScale(box);
  const t = TONES[tone] || TONES.brand;
  const pictured = !!PICTURED[layout];
  const onImage = layout === "cover" || layout === "poster" || layout === "card";

  const frame = {
    position: "absolute", inset: 0, zIndex: 2,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "var(--dt-social-padding)", gap: "var(--dt-social-gap)",
    color: onImage ? "var(--dt-social-on-image)" : undefined,
    "--dt-social-muted": onImage ? "var(--dt-social-on-image-muted)" : undefined,
  };
  const top = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-social-gap)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "calc(var(--dt-social-gap) / 2)", fontSize: "var(--dt-social-body-size)", fontWeight: "var(--dt-font-weight-semibold)", letterSpacing: "var(--dt-tracking-tight)" }}>
        {mark || <span aria-hidden="true" style={{ width: "calc(var(--dt-social-meta-size) * 1.1)", height: "calc(var(--dt-social-meta-size) * 1.1)", borderRadius: "var(--dt-radius-pill)", background: "currentColor" }} />}
        {brand}
      </span>
      {counter && <span style={meta}>{counter}</span>}
    </div>
  );
  const bottom = (handle || cta) && (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-social-gap)", ...meta }}>
      <span>{handle}</span>
      {cta && <span style={{ padding: "calc(var(--dt-social-gap) / 2.5) calc(var(--dt-social-gap) / 1.4)", border: "var(--dt-border-width-strong, 2px) solid currentColor", borderRadius: "var(--dt-radius-pill)" }}>{cta}</span>}
    </div>
  );
  const eyebrowEl = eyebrow && <p style={{ margin: 0, ...meta, color: "var(--dt-social-muted)" }}>{eyebrow}</p>;

  let content = null;
  let background = null;

  if (layout === "headline") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <h2 style={display(format)}>{heading}</h2>
        {text && <p style={body}>{text}</p>}
      </div>
    );
  } else if (layout === "quote") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        <span aria-hidden="true" style={{ ...display(format, 1.6), lineHeight: 0.6, height: "calc(var(--dt-social-display-size) * 0.5)" }}>“</span>
        <blockquote style={{ margin: 0, ...title(format) }}>{heading}</blockquote>
        {byline && <p style={{ margin: 0, ...meta }}>{byline}</p>}
      </div>
    );
  } else if (layout === "stat") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <p style={{ ...display(format, 1.9), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{heading}</p>
        {text && <p style={{ ...body, fontSize: "calc(var(--dt-social-body-size) * 1.2)", color: "inherit" }}>{text}</p>}
        {byline && <p style={{ margin: 0, ...meta, color: "var(--dt-social-muted)" }}>{byline}</p>}
      </div>
    );
  } else if (layout === "list") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <h2 style={title(format)}>{heading}</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, maxWidth: "none" }}>
          {items.map((it, i) => (
            <li key={i} style={{ display: "flex", gap: "var(--dt-social-gap)", alignItems: "baseline", padding: "calc(var(--dt-social-gap) * 0.6) 0", borderTop: "var(--dt-border-width-strong, 2px) solid var(--dt-social-rule)", fontSize: "calc(var(--dt-social-body-size) * 1.1)", lineHeight: "var(--dt-social-body-line)" }}>
              <span style={{ ...meta, color: "var(--dt-social-muted)", minWidth: "2.4em" }}>{String(i + 1).padStart(2, "0")}</span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  } else if (layout === "announcement") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "var(--dt-social-gap)" }}>
        {badge && <span style={{ ...meta, padding: "calc(var(--dt-social-gap) / 2.5) calc(var(--dt-social-gap) / 1.2)", borderRadius: "var(--dt-radius-pill)", border: "var(--dt-border-width-strong, 2px) solid currentColor" }}>{badge}</span>}
        <h2 style={display(format)}>{heading}</h2>
        {text && <p style={{ ...body, maxWidth: "80%" }}>{text}</p>}
        {byline && <p style={{ margin: 0, ...meta }}>{byline}</p>}
      </div>
    );
  } else if (layout === "cover") {
    background = (
      <>
        <Picture image={image} position={imagePosition} label={label} />
        <div style={{ position: "absolute", inset: 0, background: "var(--dt-scrim-bottom)" }} />
        <div style={{ position: "absolute", inset: "0 0 auto", height: "30%", background: "var(--dt-scrim-top)", opacity: 0.6 }} />
      </>
    );
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <h2 style={display(format, 0.9)}>{heading}</h2>
        {text && <p style={body}>{text}</p>}
      </div>
    );
  } else if (layout === "poster") {
    background = (
      <>
        <Picture image={image} position={imagePosition} label={label} />
        <div style={{ position: "absolute", inset: 0, background: "var(--dt-scrim-top)" }} />
        <div style={{ position: "absolute", inset: "auto 0 0", height: "40%", background: "var(--dt-scrim-bottom)" }} />
      </>
    );
    content = null;
  } else if (layout === "card") {
    background = (
      <>
        <Picture image={image} position={imagePosition} label={label} />
        <div style={{ position: "absolute", inset: "0 0 auto", height: "30%", background: "var(--dt-scrim-top)", opacity: 0.6 }} />
      </>
    );
    content = (
      <div className="dark" style={{
        display: "flex", flexDirection: "column", gap: "calc(var(--dt-social-gap) * 0.6)",
        padding: "var(--dt-social-gap)", borderRadius: "var(--dt-social-radius)",
        background: "var(--dt-surface-glass-inverse)", color: "var(--dt-social-on-image)",
        backdropFilter: "var(--dt-backdrop-glass, blur(24px))", WebkitBackdropFilter: "var(--dt-backdrop-glass, blur(24px))",
      }}>
        {eyebrowEl}
        <h2 style={title(format, 0.9)}>{heading}</h2>
        {text && <p style={{ ...body, color: "var(--dt-social-on-image-muted)" }}>{text}</p>}
      </div>
    );
  }

  const inner = (() => {
    if (layout === "split") {
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", flex: format === "square" ? "0 0 48%" : "0 0 56%" }}>
            <Picture image={image} position={imagePosition} label={label} />
            <div style={{ position: "absolute", inset: "0 0 auto", height: "40%", background: "var(--dt-scrim-top)", opacity: 0.6 }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "var(--dt-social-padding)", gap: "var(--dt-social-gap)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "calc(var(--dt-social-gap) * 0.6)" }}>
              {eyebrowEl}
              <h2 style={title(format)}>{heading}</h2>
              {text && format !== "square" && <p style={body}>{text}</p>}
            </div>
            {bottom}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "var(--dt-social-padding)", color: "var(--dt-social-on-image)" }}>{top}</div>
        </div>
      );
    }
    if (layout === "framed") {
      return (
        <div style={frame}>
          {top}
          <div style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: "var(--dt-social-radius)", overflow: "hidden" }}>
            <Picture image={image} position={imagePosition} label={label} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "calc(var(--dt-social-gap) * 0.5)" }}>
            {eyebrowEl}
            <h2 style={title(format, 0.85)}>{heading}</h2>
          </div>
          {bottom}
        </div>
      );
    }
    if (layout === "poster") {
      return (
        <div style={frame}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
            {top}
            {/* One word, set as large as its length allows without breaking it. */}
            <h2 style={{ ...display(format, Math.min(1.9, 9 / Math.max(4, String(heading || "").length))), lineHeight: 0.86, whiteSpace: "nowrap" }}>{heading}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
            {text && <p style={body}>{text}</p>}
            {bottom}
          </div>
        </div>
      );
    }
    return (
      <div style={{ ...frame, justifyContent: "space-between" }}>
        {top}
        {content}
        {bottom || <span />}
      </div>
    );
  })();

  return (
    <div
      ref={box}
      role="img"
      aria-label={label || [eyebrow, typeof heading === "string" ? heading : null, typeof text === "string" ? text : null].filter(Boolean).join(". ")}
      style={{ position: "relative", width: "100%", aspectRatio: RATIO[format] || RATIO.story, overflow: "hidden", borderRadius: "var(--dt-radius-media)", ...style }}
      {...rest}
    >
      <div
        className={t.dark ? "dark" : undefined}
        style={{
          position: "absolute", top: 0, left: 0,
          width: WIDTH, height: HEIGHT[format] || HEIGHT.story,
          transform: `scale(${scale})`, transformOrigin: "0 0", visibility: scale ? "visible" : "hidden",
          overflow: "hidden", fontFamily: "var(--dt-font-family-sans)",
          ...(pictured && layout !== "framed" && layout !== "split" ? { background: "var(--dt-surface-sunken)", color: "var(--dt-social-on-image)" } : t.style),
        }}
      >
        {background}
        {inner}
      </div>
    </div>
  );
}
```
