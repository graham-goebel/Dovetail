import React from "react";
import { AspectRatio } from "../content/AspectRatio.jsx";
import { Price } from "./Price.jsx";
import { Rating } from "./Rating.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)" }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* Items in a line with a middle dot between them. The dots are decoration,
   hidden from assistive technology, so the line reads as a list of facts.
   Every item leads with its dot, and the row is pulled back by one dot's
   width inside a clipping box, so the dot that starts a line (the first, or
   one after a wrap) is cut off and no line begins or ends with a stray dot. */
const SEP = "var(--dt-space-inline-md)";
function Dotted({ items }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div style={{ overflow: "hidden", minWidth: 0 }}>
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "center",
          rowGap: "var(--dt-space-stack-2xs)", marginInlineStart: `calc(-1 * ${SEP})`,
          ...role("body-sm"), color: "var(--dt-store-meta-color)",
        }}
      >
        {shown.map((node, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", minWidth: 0 }}>
            <span aria-hidden="true" style={{ flex: "none", width: SEP, textAlign: "center" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", minWidth: 0 }}>{node}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function StoreHeader({
  name,
  image,
  logo,
  rating,
  meta = [],
  deliveryTime,
  deliveryFee,
  currency = "USD",
  locale,
  status,
  actions,
  headingLevel = 1,
  freeDeliveryLabel = "Free delivery",
  deliveryFeeLabel = "delivery",
  style,
  ...rest
}) {
  const closed = !!status && status.open === false;
  const level = Math.min(Math.max(Math.round(headingLevel) || 1, 1), 6);
  const H = `h${level}`;
  const hasCover = !!image;
  const greyed = closed ? "grayscale(1)" : undefined;

  const fee = typeof deliveryFee === "number" ? (
    <Price
      amount={deliveryFee}
      currency={currency}
      locale={locale}
      size="sm"
      freeLabel={freeDeliveryLabel}
      unit={deliveryFee === 0 ? undefined : deliveryFeeLabel}
    />
  ) : null;

  const statusNode = status ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", color: closed ? "var(--dt-store-closed-color)" : "var(--dt-store-open-color)", fontWeight: "var(--dt-font-weight-medium)" }}>
      <span aria-hidden="true" style={{ flex: "none", width: "calc(var(--dt-size-icon-xs) / 2)", height: "calc(var(--dt-size-icon-xs) / 2)", borderRadius: "var(--dt-radius-pill)", background: "currentColor" }} />
      {status.label}
    </span>
  ) : null;

  const time = deliveryTime ? (
    <React.Fragment>
      <ClockIcon />
      {deliveryTime}
    </React.Fragment>
  ) : null;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)", minWidth: 0, color: "var(--dt-text-primary)", ...style }}
      {...rest}
    >
      {hasCover && (
        <AspectRatio
          ratio={3}
          style={{ maxHeight: "var(--dt-store-cover-max-height)", background: "var(--dt-store-cover-bg)", borderRadius: "var(--dt-store-cover-radius)" }}
        >
          {image.src && (
            <img
              src={image.src}
              alt={image.alt || ""}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", filter: greyed }}
            />
          )}
          {closed && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--dt-store-closed-scrim)" }} />}
        </AspectRatio>
      )}

      {logo && (
        <span
          style={{
            position: "relative", display: "block", flex: "none", overflow: "hidden", boxSizing: "content-box",
            width: "var(--dt-store-logo-size)", height: "var(--dt-store-logo-size)",
            marginTop: hasCover ? "calc(-0.5 * var(--dt-store-logo-size) - var(--dt-space-stack-sm))" : 0,
            marginInlineStart: hasCover ? "var(--dt-space-inset-md)" : 0,
            borderRadius: "var(--dt-store-logo-radius)",
            border: hasCover ? "var(--dt-border-width-strong) solid var(--dt-store-logo-ring)" : "var(--dt-border-width-default) solid var(--dt-border-subtle)",
            background: "var(--dt-store-logo-bg)",
          }}
        >
          {logo.src && (
            <img src={logo.src} alt={logo.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: greyed }} />
          )}
        </span>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)", minWidth: 0 }}>
        <H style={{ ...role("heading-md"), margin: 0, minWidth: 0, overflowWrap: "anywhere", color: "var(--dt-text-primary)" }}>{name}</H>
        {actions && <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", flex: "none" }}>{actions}</div>}
      </div>

      {(rating || meta.length > 0 || status || time || fee) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", minWidth: 0 }}>
          <Dotted
            items={[
              rating && typeof rating.value === "number" ? <Rating value={rating.value} count={rating.count} size="sm" locale={locale} /> : null,
              ...meta,
            ]}
          />
          <Dotted items={[statusNode, time, fee]} />
        </div>
      )}
    </div>
  );
}
