import React from "react";
import { Price } from "./Price.jsx";
import { QuantityStepper } from "./QuantityStepper.jsx";
import { Button } from "../actions/Button.jsx";
import { Link } from "../actions/Link.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Each size is a thumbnail, the type roles for the name and the lines under
   it, the Price size, and the gap between the columns. */
const SIZES = {
  sm: { thumb: "var(--dt-cart-thumb-size-sm)", name: "label-md", detail: "body-xs", price: "sm", gap: "var(--dt-space-inline-sm)", pad: "var(--dt-space-stack-sm)" },
  md: { thumb: "var(--dt-cart-thumb-size-md)", name: "label-lg", detail: "body-sm", price: "md", gap: "var(--dt-space-inline-md)", pad: "var(--dt-space-stack-md)" },
};

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* Stands in for a product image that has no src yet, like Image's empty
   frame but small enough for a cart line: an icon, no caption. */
function Placeholder() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

export function CartLine({
  name,
  href,
  image,
  details = [],
  price,
  compareAt,
  quantity,
  onQuantityChange,
  onRemove,
  currency = "USD",
  locale,
  lineTotal,
  maxQuantity,
  note,
  readOnly = false,
  size = "md",
  divider = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const hasTotal = typeof lineTotal === "number";
  const money = { currency, locale };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: image ? `${s.thumb} minmax(0, 1fr)` : "minmax(0, 1fr)",
        columnGap: s.gap,
        alignItems: "start",
        paddingBlock: divider ? s.pad : undefined,
        borderBlockEnd: divider ? "var(--dt-border-width-default) solid var(--dt-cart-line-divider)" : undefined,
        ...style,
      }}
      {...rest}
    >
      {image && (
        <span
          style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            width: s.thumb, height: s.thumb, overflow: "hidden", boxSizing: "border-box",
            borderRadius: "var(--dt-cart-thumb-radius)",
            border: "var(--dt-border-width-default) solid var(--dt-cart-thumb-border)",
            background: "var(--dt-cart-thumb-bg)", color: "var(--dt-cart-thumb-fg)",
          }}
        >
          {image.src
            ? <img src={image.src} alt={image.alt || ""} loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
            : <Placeholder />}
        </span>
      )}

      {/* The text and the price share a wrapping row. The text keeps at least
          three large controls' width; when the price no longer fits beside
          it, the price drops under it instead of squeezing the name. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", columnGap: s.gap, rowGap: "var(--dt-space-stack-xs)", minWidth: 0 }}>
        <div style={{ flex: "1 1 calc(var(--dt-size-control-lg) * 3)", display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", minWidth: 0 }}>
          <span style={{ ...role(s.name), color: "var(--dt-text-primary)", overflowWrap: "anywhere" }}>
            {href ? <Link href={href} tone="inherit" underline="hover">{name}</Link> : name}
          </span>
          {details.length > 0 && (
            <span style={{ ...role(s.detail), color: "var(--dt-cart-detail-color)" }}>
              {details.map((d, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  {i > 0 && <VisuallyHidden>, </VisuallyHidden>}
                  <span style={{ whiteSpace: "nowrap" }}>{d}</span>
                </React.Fragment>
              ))}
            </span>
          )}
          {hasTotal && (
            <Price amount={price} compareAt={compareAt} unit="each" size="sm" {...money} />
          )}
          {note && (
            <span style={{ ...role(s.detail), color: "var(--dt-cart-note-color)" }}>{note}</span>
          )}
          {readOnly ? (
            <span style={{ ...role(s.detail), color: "var(--dt-cart-detail-color)", fontVariantNumeric: "tabular-nums" }}>
              <span aria-hidden="true">Qty {quantity}</span>
              <VisuallyHidden>{`Quantity ${quantity}`}</VisuallyHidden>
            </span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)", marginBlockStart: "var(--dt-space-stack-2xs)" }}>
              <QuantityStepper
                size="sm"
                label={`Quantity, ${name}`}
                decreaseLabel={`Decrease quantity, ${name}`}
                increaseLabel={`Increase quantity, ${name}`}
                removeLabel={`Remove ${name}`}
                value={quantity}
                max={maxQuantity}
                onChange={onQuantityChange}
                onRemove={onRemove}
              />
              {onRemove && (
                <Button variant="ghost" size="sm" aria-label={`Remove ${name}`} onClick={onRemove}>
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", textAlign: "end", marginInlineStart: "auto", maxWidth: "100%" }}>
          {hasTotal
            ? <Price amount={lineTotal} size={s.price} style={{ justifyContent: "flex-end" }} {...money} />
            : <Price amount={price} compareAt={compareAt} size={s.price} style={{ justifyContent: "flex-end" }} {...money} />}
        </div>
      </div>
    </div>
  );
}
