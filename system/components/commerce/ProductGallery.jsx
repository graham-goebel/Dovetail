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
