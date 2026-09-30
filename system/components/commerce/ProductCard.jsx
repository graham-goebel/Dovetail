import React from "react";
import { Card } from "../display/Card.jsx";
import { Image } from "../content/Image.jsx";
import { Badge } from "../display/Badge.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { Price } from "./Price.jsx";
import { Rating } from "./Rating.jsx";

/* Product photography ratios. AspectRatio names the square "square" and
   has no 4:5, so both are mapped here; a number passes straight through. */
const RATIOS = { "1:1": "square", "4:5": 4 / 5, "3:4": "3:4", "4:3": "4:3" };

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

/* Colour dots, display only. One accessible name lists every colour, the
   ones past the limit included, so "+3" is never all a screen reader gets. */
function Swatches({ swatches, max }) {
  const shown = swatches.slice(0, max);
  const extra = swatches.length - shown.length;
  return (
    <span
      role="img"
      aria-label={`Colours: ${swatches.map((s) => s.name).join(", ")}`}
      style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)" }}
    >
      {shown.map((s, i) => (
        <span
          key={`${i}-${s.name}`}
          title={s.name}
          style={{
            display: "block", flex: "none", boxSizing: "border-box",
            width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)",
            borderRadius: "var(--dt-radius-pill)",
            background: s.color,
            border: "var(--dt-border-width-default) solid var(--dt-swatch-border)",
          }}
        />
      ))}
      {extra > 0 && (
        <span style={{ ...role("body-xs"), color: "var(--dt-product-subtitle-color)", fontVariantNumeric: "tabular-nums" }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

export function ProductCard({
  name,
  href,
  image,
  ratio = "1:1",
  price,
  compareAt,
  currency,
  locale,
  rating,
  badge,
  subtitle,
  swatches,
  maxSwatches = 5,
  soldOut = false,
  soldOutLabel = "Sold out",
  action,
  onQuickAdd,
  quickAddLabel,
  layout = "vertical",
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const horizontal = layout === "horizontal";
  const linked = !!href;
  const r = typeof ratio === "number" ? ratio : RATIOS[ratio] || RATIOS["1:1"];
  const corner = "var(--dt-space-inset-xs)";

  /* A string badge becomes a solid neutral Badge, which reads on any photo;
     pass a Badge of your own for another tone. Sold out takes its place. */
  const flag = soldOut
    ? <Badge tone="neutral">{soldOutLabel}</Badge>
    : typeof badge === "string" || typeof badge === "number"
      ? <Badge tone="neutral" variant="solid">{badge}</Badge>
      : badge;

  /* A sold-out product can't be added: the consumer's action is disabled
     when it is an element that takes a disabled prop, such as Button. */
  const act = soldOut && React.isValidElement(action) ? React.cloneElement(action, { disabled: true }) : action;

  /* The photo comes after the text in the source and before it on screen
     (order -1), so a screen reader meets the name first and the quick-add
     button after the link. */
  const media = (
    <div style={{ position: "relative", minWidth: 0, order: -1 }}>
      {image && image.src ? (
        <Image src={image.src} alt={image.alt} ratio={r} radius="media" />
      ) : (
        <Image alt="" placeholder={name} ratio={r} radius="media" aria-hidden="true" />
      )}
      {soldOut && (
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, borderRadius: "var(--dt-radius-media)", background: "var(--dt-product-soldout-overlay)" }}
        />
      )}
      {flag && (
        <div style={{ position: "absolute", insetBlockStart: corner, insetInlineStart: corner, display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)" }}>
          {flag}
        </div>
      )}
      {onQuickAdd && (
        <IconButton
          label={quickAddLabel || `Add ${name} to cart`}
          variant="solid"
          size="md"
          disabled={soldOut}
          onClick={onQuickAdd}
          style={{
            position: "absolute", insetBlockEnd: corner, insetInlineEnd: corner, zIndex: 1,
            borderRadius: "var(--dt-radius-pill)", boxShadow: soldOut ? "none" : "var(--dt-elevation-2)",
          }}
        >
          <PlusIcon />
        </IconButton>
      )}
    </div>
  );

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", minWidth: 0, flex: horizontal ? undefined : 1 }}>
      <span
        style={{
          ...role("label-lg"), color: "var(--dt-card-fg)",
          display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
        }}
      >
        {linked ? (
          <a href={href} style={{ color: "inherit", textDecoration: hover ? "underline" : "none", textUnderlineOffset: "0.2em" }}>{name}</a>
        ) : name}
      </span>
      {subtitle && <span style={{ ...role("body-sm"), color: "var(--dt-product-subtitle-color)" }}>{subtitle}</span>}
      <Price amount={price} compareAt={compareAt} currency={currency} locale={locale} />
      {rating && <Rating value={rating.value} count={rating.count} locale={locale} size="sm" style={{ alignSelf: "flex-start" }} />}
      {swatches && swatches.length > 0 && <Swatches swatches={swatches} max={maxSwatches} />}
      {act && (
        <div style={{ marginTop: horizontal ? "var(--dt-space-stack-xs)" : "auto", paddingTop: horizontal ? undefined : "var(--dt-space-stack-xs)", position: "relative", zIndex: 1 }}>
          {act}
        </div>
      )}
    </div>
  );

  return (
    <Card
      href={href}
      onMouseEnter={(e) => { setHover(true); if (onMouseEnter) onMouseEnter(e); }}
      onMouseLeave={(e) => { setHover(false); if (onMouseLeave) onMouseLeave(e); }}
      style={{
        padding: "var(--dt-space-inset-sm)",
        height: "100%", boxSizing: "border-box", minWidth: 0,
        boxShadow: linked && hover ? "var(--dt-card-elevation-hover)" : "var(--dt-card-elevation)",
        ...style,
      }}
      {...rest}
    >
      <div
        style={horizontal
          ? { display: "grid", gridTemplateColumns: "min(33%, calc(var(--dt-size-avatar-xl) * 2.5)) minmax(0, 1fr)", gap: "var(--dt-space-inline-md)", alignItems: "start", flex: 1 }
          : { display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)", flex: 1 }}
      >
        {body}
        {media}
      </div>
    </Card>
  );
}
