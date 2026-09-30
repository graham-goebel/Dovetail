# ProductGallery

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [ProductGallery.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/ProductGallery.jsx), [ProductGallery.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/ProductGallery.d.ts), [ProductGallery.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/ProductGallery.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ProductGallery.html

## Guidelines

The images on a product page: a main image with previous and next buttons, a strip of thumbnails that choose it, and a counter.

### Use it when
- A product page shows several photos of one product: angles, details, the product in use.
- You need a controlled image index, for example to jump to a colour's photo when `VariantPicker` changes.

### Don't use it when
- There is one image and nothing to navigate. Use `Image`, or pass one image and the gallery drops its controls.
- The images are content in an article. Use `Figure` or `Media`.
- The slides are not images of one product, such as a carousel of promotions. That is a different pattern with different announcements.

### Example
```jsx
<ProductGallery
  label="Images of the stoneware mug"
  images={[
    { src: "/img/mug-front.jpg", alt: "Mug in fern glaze, handle to the right" },
    { src: "/img/mug-top.jpg", alt: "Mug from above" },
    { src: "/img/mug-glaze.jpg", alt: "Close-up of the glaze" },
  ]}
/>

// Controlled: show the chosen colour's first photo.
<ProductGallery label="Images of the tote" images={images} value={index} onChange={setIndex} thumbnails="left" ratio="4:5" />
```

### Variants
| Prop | What it is for |
|---|---|
| `thumbnails="bottom"` | Default. A row of thumbnails under the image, scrolling sideways when there are more than fit. |
| `thumbnails="left"` | A column beside the image, for a wide product column. When the gallery itself is narrower than `collapseBelow` (480px by default) it moves under the image. This is measured on the gallery with `ResizeObserver`, so it acts as a container query: a gallery in a narrow column collapses even on a wide screen. Until the first measurement (and on the server) it lays out as `left`. |
| `thumbnails="none"` | No thumbnails; the counter always shows on the image. For small spaces and quick views. |
| `ratio` | `"1:1"` by default; `"4:5"` for apparel, `"3:4"`, `"4:3"` or a number. The thumbnails share it. |
| `value` / `onChange` | Controlled index. Leave `value` out and use `defaultIndex` for an uncontrolled gallery; `onChange` still reports each change. |

The counter ("2 / 5") shows over the image when the gallery is narrower than `collapseBelow` or has no thumbnails. Screen readers always get the position, from a polite live region.

### Composition
- The main image and each thumbnail are `Image`s, so the frame keeps its ratio while the file loads. The first image loads eagerly, the rest lazily.
- Previous and next are `IconButton`s over the image's sides, in a glass surface.
- Put it in the first column of a product page, beside a stack of `Heading`, `Price`, `Rating`, `VariantPicker` and the add button.
- It fills the width it is given; constrain the column, not the gallery.

### Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-gallery-control-bg` (`--dt-surface-glass-strong`) and `--dt-gallery-control-bg-hover` (`--dt-surface-overlay`): the previous and next buttons and the counter.
- `--dt-gallery-control-fg` (`--dt-text-primary`): their icons and text.
- `--dt-gallery-thumb-border` (`--dt-border-subtle`) and `--dt-gallery-thumb-selected-border` (`--dt-border-selected`): each thumbnail's frame, and the shown one's.

It also reads `--dt-radius-media`, `--dt-radius-pill`, `--dt-size-avatar-xl` for the thumbnail width, `--dt-backdrop-glass`, `--dt-elevation-1` and `--dt-motion-micro`.

### Accessibility
- The gallery is a `role="region"` named by the required `label`.
- The main image's alt is the shown image's `alt`.
- Previous and next are buttons named "Previous image" and "Next image" (`previousLabel`, `nextLabel`). They wrap around at the ends, so they are never disabled and focus is never dropped.
- The thumbnails are a group named "Thumbnails" with one tab stop, the shown image's, marked `aria-current="true"`. Arrow keys (Left and Right, or Up and Down) move to the next thumbnail and show it at once, as tabs do; Home and End jump to the ends. Arrows follow the reading direction in right-to-left pages.
- Each thumbnail is named by its image's alt and position: "Close-up of the glaze (4 of 5)".
- Every change is announced politely as "Image 2 of 5" (`counterLabel`). The visible "2 / 5" is hidden from assistive technology so it is not read twice.
- On touch or pen, a horizontal swipe on the image moves to the next or previous image; vertical swipes scroll the page. Changes are instant, with no slide, so there is no motion to reduce.

### Content
- `label` names what the images are of: "Images of the stoneware mug".
- Each `alt` says what that image shows that the others don't: "From above", "Close-up of the glaze", "Worn with the strap shortened". Don't repeat the product name in every one.

## Props

```ts
import * as React from "react";

/** One image in the gallery. */
export interface ProductGalleryImage {
  /** URL of the image. */
  src: string;
  /** What this image shows, e.g. "Back view, strap detail". It names the image and its thumbnail. */
  alt: string;
}

/** The images on a product page: a main image with previous and next buttons, and a strip of thumbnails. */
export interface ProductGalleryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** The images, in order. At least one; with one there are no buttons, thumbnails or counter. */
  images: ProductGalleryImage[];
  /** Accessible name of the gallery region, e.g. "Images of the canvas tote". */
  label: string;
  /** The shown image's index, for a controlled gallery. Leave it out for an uncontrolled one. */
  value?: number;
  /** Called with the next index when the buttons, a thumbnail, the arrow keys or a swipe change the image. */
  onChange?: (index: number) => void;
  /** The index an uncontrolled gallery starts on. @default 0 */
  defaultIndex?: number;
  /** Shape of the main image and the thumbnails. A number is width / height. @default "1:1" */
  ratio?: "1:1" | "4:5" | "3:4" | "4:3" | number;
  /**
   * Where the thumbnails sit. "left" moves them under the image when the gallery itself is
   * narrower than collapseBelow; "none" hides them and always shows the counter. @default "bottom"
   */
  thumbnails?: "bottom" | "left" | "none";
  /**
   * Width in CSS pixels of the gallery (not the viewport) under which "left" thumbnails move
   * below and the "2 / 5" counter shows on the image. Measured with ResizeObserver. @default 480
   */
  collapseBelow?: number;
  /** Accessible name of the previous button. @default "Previous image" */
  previousLabel?: string;
  /** Accessible name of the next button. @default "Next image" */
  nextLabel?: string;
  /** Accessible name of the thumbnail group. @default "Thumbnails" */
  thumbnailsLabel?: string;
  /** Builds the position announced to screen readers, from a 1-based number and the total. @default (n, total) => `Image ${n} of ${total}` */
  counterLabel?: (n: number, total: number) => string;
}

export declare function ProductGallery(props: ProductGalleryProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-gallery-control-bg` | component | `var(--dt-surface-glass-strong)` |
| `--dt-gallery-control-bg-hover` | component | `var(--dt-surface-overlay)` |
| `--dt-gallery-control-fg` | component | `var(--dt-text-primary)` |
| `--dt-gallery-thumb-border` | component | `var(--dt-border-subtle)` |
| `--dt-gallery-thumb-selected-border` | component | `var(--dt-border-selected)` |
| `--dt-backdrop-glass` | semantic | `saturate(1.6) blur(var(--dt-blur-glass))` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-elevation-1` | semantic | `var(--dt-shadow-raw-1)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-media` | semantic | `var(--dt-radius-raw-12)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-avatar-xl` | semantic | `var(--dt-dim-16)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |

## Source

```jsx
import React from "react";
import { Image } from "../content/Image.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Product photography ratios. AspectRatio names the square "square" and
   has no 4:5, so both are mapped here; a number passes straight through. */
const RATIOS = { "1:1": "square", "4:5": 4 / 5, "3:4": "3:4", "4:3": "4:3" };

const CHEVRONS = { prev: "m15 18-6-6 6-6", next: "m9 18 6-6-6-6" };

function Chevron({ dir }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }}
    >
      <path d={CHEVRONS[dir]} />
    </svg>
  );
}

/* The gallery's own width, not the viewport's: a gallery usually sits in a
   column of a product page, so this acts as a container query. It reads
   false while server rendering and until the first measurement, so the
   server's markup and the first client render match. */
function useNarrow(ref, below) {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setNarrow(el.getBoundingClientRect().width < below);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, below]);
  return narrow;
}

const defaultCounter = (n, total) => `Image ${n} of ${total}`;

export function ProductGallery({
  images = [],
  label,
  value,
  onChange,
  defaultIndex = 0,
  ratio = "1:1",
  thumbnails = "bottom",
  collapseBelow = 480,
  previousLabel = "Previous image",
  nextLabel = "Next image",
  thumbnailsLabel = "Thumbnails",
  counterLabel = defaultCounter,
  style,
  ...rest
}) {
  const total = images.length;
  const controlled = typeof value === "number";
  const [inner, setInner] = React.useState(defaultIndex);
  const raw = controlled ? value : inner;
  const index = total ? Math.min(Math.max(Math.round(raw) || 0, 0), total - 1) : 0;
  const current = images[index] || { src: undefined, alt: "" };
  const multi = total > 1;

  const root = React.useRef(null);
  const thumbs = React.useRef([]);
  const moved = React.useRef(false);
  const swipe = React.useRef(null);
  const [rtl, setRtl] = React.useState(false);
  const [hover, setHover] = React.useState(null);
  const narrow = useNarrow(root, collapseBelow);
  const r = typeof ratio === "number" ? ratio : RATIOS[ratio] || RATIOS["1:1"];

  const strip = !multi || thumbnails === "none" ? "none" : thumbnails === "left" && !narrow ? "left" : "bottom";
  const counterShown = multi && (narrow || strip === "none");

  React.useEffect(() => {
    const el = root.current;
    setRtl(!!(el && el.closest && el.closest('[dir="rtl"]')));
  }, []);

  /* Bring the chosen thumbnail into view after a change the user made, never
     on mount, so a gallery low on the page does not scroll it. */
  React.useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const el = thumbs.current[index];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);

  const select = (n, focus) => {
    if (!total) return;
    const next = ((n % total) + total) % total;
    moved.current = true;
    if (next !== index) {
      if (!controlled) setInner(next);
      if (onChange) onChange(next);
    }
    if (focus) {
      const el = thumbs.current[next];
      if (el) el.focus();
    }
  };

  /* Selection follows focus, the way tabs do: the arrows move and show. */
  const onThumbKey = (e, i) => {
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === fwd || e.key === "ArrowDown") next = i + 1;
    else if (e.key === back || e.key === "ArrowUp") next = i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = total - 1;
    if (next == null) return;
    e.preventDefault();
    select(next, true);
  };

  /* A horizontal swipe on touch or pen changes the image; a mouse drag and a
     mostly vertical swipe do not. The change is instant, so there is no
     motion to reduce. */
  const onPointerDown = (e) => {
    if (!multi || e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.offsetWidth };
  };
  const onPointerUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < s.w * 0.15 || Math.abs(dx) < Math.abs(dy)) return;
    select(index + ((dx < 0) !== rtl ? 1 : -1));
  };

  const control = (kind) => {
    const prev = kind === "prev";
    const onStart = prev !== rtl;
    return (
      <IconButton
        label={prev ? previousLabel : nextLabel}
        size="md"
        onClick={() => select(index + (prev ? -1 : 1))}
        onMouseEnter={() => setHover(kind)}
        onMouseLeave={() => setHover(null)}
        style={{
          position: "absolute", insetBlockStart: "50%", transform: "translateY(-50%)",
          [onStart ? "left" : "right"]: "var(--dt-space-inset-xs)",
          borderRadius: "var(--dt-radius-pill)",
          background: hover === kind ? "var(--dt-gallery-control-bg-hover)" : "var(--dt-gallery-control-bg)",
          color: "var(--dt-gallery-control-fg)",
          backdropFilter: "var(--dt-backdrop-glass)", WebkitBackdropFilter: "var(--dt-backdrop-glass)",
          boxShadow: "var(--dt-elevation-1)",
        }}
      >
        <Chevron dir={onStart ? "prev" : "next"} />
      </IconButton>
    );
  };

  const main = (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { swipe.current = null; }}
      style={{ position: "relative", minWidth: 0, touchAction: "pan-y", gridColumn: strip === "left" ? 2 : undefined, gridRow: strip === "left" ? 1 : undefined }}
    >
      <Image src={current.src} alt={current.alt} ratio={r} radius="media" loading={index === 0 ? "eager" : "lazy"} />
      {multi && control("prev")}
      {multi && control("next")}
      {counterShown && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute", insetBlockEnd: "var(--dt-space-inset-xs)", left: "50%", transform: "translateX(-50%)",
            padding: "var(--dt-space-inset-2xs) var(--dt-space-inset-xs)", borderRadius: "var(--dt-radius-pill)",
            background: "var(--dt-gallery-control-bg)", color: "var(--dt-gallery-control-fg)",
            backdropFilter: "var(--dt-backdrop-glass)", WebkitBackdropFilter: "var(--dt-backdrop-glass)",
            fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
            lineHeight: "var(--dt-text-label-sm-line)", fontWeight: "var(--dt-text-label-sm-weight)",
            fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
          }}
        >
          {index + 1} / {total}
        </span>
      )}
    </div>
  );

  const left = strip === "left";
  /* The strip keeps a little inset so the focus ring of a thumbnail is not
     clipped by the scroll container. */
  const pad = "var(--dt-space-inset-2xs)";
  const thumbSize = "var(--dt-size-avatar-xl)";
  const list = strip === "none" ? null : (
    <div
      role="group"
      aria-label={thumbnailsLabel}
      style={{
        display: "flex", flexDirection: left ? "column" : "row", gap: "var(--dt-space-inline-xs)",
        padding: pad, overflowX: left ? "hidden" : "auto", overflowY: left ? "auto" : "hidden",
        ...(left ? { position: "absolute", inset: 0 } : null),
      }}
    >
      {images.map((img, i) => {
        const on = i === index;
        return (
          <button
            key={`${i}-${img.src}`}
            ref={(el) => { thumbs.current[i] = el; }}
            type="button"
            aria-label={img.alt ? `${img.alt} (${i + 1} of ${total})` : counterLabel(i + 1, total)}
            aria-current={on ? "true" : undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => onThumbKey(e, i)}
            style={{
              flex: "none", display: "block", width: thumbSize, padding: 0, margin: 0,
              border: `var(--dt-border-width-strong) solid ${on ? "var(--dt-gallery-thumb-selected-border)" : "var(--dt-gallery-thumb-border)"}`,
              borderRadius: "var(--dt-radius-media)", background: "none", cursor: "pointer", overflow: "hidden",
              transition: "border-color var(--dt-motion-micro)",
            }}
          >
            <Image src={img.src} alt="" ratio={r} radius="none" loading="lazy" />
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={root}
      role="region"
      aria-label={label}
      style={{
        display: left ? "grid" : "flex", flexDirection: left ? undefined : "column",
        gridTemplateColumns: left ? `calc(${thumbSize} + ${pad} * 2) minmax(0, 1fr)` : undefined,
        gap: "var(--dt-space-stack-sm)", minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {main}
      {list && (left ? <div style={{ position: "relative", gridColumn: 1, gridRow: 1 }}>{list}</div> : list)}
      {multi && <VisuallyHidden aria-live="polite" aria-atomic="true">{counterLabel(index + 1, total)}</VisuallyHidden>}
    </div>
  );
}
```
