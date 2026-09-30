import React from "react";

/* A star on the 24-unit icon grid, filled and stroked with round joins so its
   points are softened the way the rest of the system's icons are. */
const STAR =
  "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";

/* The star, the box an input star sits in (a comfortable hit area), and the
   count's type role. */
const SIZES = {
  sm: { star: "var(--dt-size-icon-sm)", box: "var(--dt-size-control-xs)", text: "body-xs" },
  md: { star: "var(--dt-size-icon-md)", box: "var(--dt-size-control-sm)", text: "body-sm" },
  lg: { star: "var(--dt-size-icon-lg)", box: "var(--dt-size-control-md)", text: "body-md" },
};

function Glyph({ size }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: size, height: size, maxWidth: "none" }}
    >
      <path d={STAR} />
    </svg>
  );
}

/* fill is 0, 0.5 or 1. A half star lays the filled glyph over the empty one
   and clips it to its inline-start half, so it needs no SVG ids, follows the
   colour tokens into a dark band, and fills from the right in RTL. */
function Star({ fill, size }) {
  return (
    <span style={{ position: "relative", display: "block", flex: "none", width: size, height: size }}>
      <span style={{ display: "block", color: fill === 1 ? "var(--dt-rating-color)" : "var(--dt-rating-empty-color)", transition: "color var(--dt-motion-micro)" }}>
        <Glyph size={size} />
      </span>
      {fill === 0.5 && (
        <span style={{ position: "absolute", insetBlockStart: 0, insetInlineStart: 0, width: "50%", height: "100%", overflow: "hidden", color: "var(--dt-rating-color)" }}>
          <Glyph size={size} />
        </span>
      )}
    </span>
  );
}

const fillFor = (shown, n) => (shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0);

export function Rating({ value = 0, max = 5, count, size = "md", onChange, label, locale, style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(null);
  const refs = React.useRef([]);
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const num = React.useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);

  if (!onChange) {
    const rounded = Math.round(Math.min(Math.max(value, 0), max) * 2) / 2;
    const reviews = typeof count === "number" ? `, ${num.format(count)} ${count === 1 ? "review" : "reviews"}` : "";
    return (
      <span
        role="img"
        aria-label={label || `${num.format(rounded)} out of ${max} stars${reviews}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", verticalAlign: "middle", ...style }}
        {...rest}
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {stars.map((n) => <Star key={n} fill={fillFor(rounded, n)} size={s.star} />)}
        </span>
        {typeof count === "number" && (
          <span
            style={{
              fontFamily: `var(--dt-text-${s.text}-family)`, fontSize: `var(--dt-text-${s.text}-size)`,
              lineHeight: `var(--dt-text-${s.text}-line)`, color: "var(--dt-rating-count-color)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ({num.format(count)})
          </span>
        )}
      </span>
    );
  }

  /* Input: a radio group of whole stars. The checked star is the one tab
     stop (the first when nothing is chosen yet); arrows move and select. */
  const selected = Math.min(Math.max(Math.round(value), 0), max);
  const shown = hover != null ? hover : selected;
  const tabStop = selected || 1;

  const choose = (n) => {
    const next = Math.min(Math.max(n, 1), max);
    if (next !== selected) onChange(next);
    const el = refs.current[next];
    if (el) el.focus();
  };

  const onKeyDown = (e, n) => {
    const rtl = !!(e.currentTarget.closest && e.currentTarget.closest('[dir="rtl"]'));
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === fwd || e.key === "ArrowUp") next = n >= max ? 1 : n + 1;
    else if (e.key === back || e.key === "ArrowDown") next = n <= 1 ? max : n - 1;
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = max;
    else if (e.key === " " || e.key === "Enter") next = n;
    if (next == null) return;
    e.preventDefault();
    choose(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHover(null)}
      style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", ...style }}
      {...rest}
    >
      {stars.map((n) => (
        <span
          key={n}
          ref={(el) => { refs.current[n] = el; }}
          role="radio"
          aria-checked={n === selected}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          tabIndex={n === tabStop ? 0 : -1}
          onClick={() => choose(n)}
          onKeyDown={(e) => onKeyDown(e, n)}
          onMouseEnter={() => setHover(n)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: s.box, height: s.box, borderRadius: "var(--dt-radius-control)", cursor: "pointer",
          }}
        >
          <Star fill={fillFor(shown, n)} size={s.star} />
        </span>
      ))}
    </div>
  );
}
