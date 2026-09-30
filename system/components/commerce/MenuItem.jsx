import React from "react";
import { Badge } from "../display/Badge.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { Price } from "./Price.jsx";
import { QuantityStepper } from "./QuantityStepper.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

const ICONS = {
  plus: ["M5 12h14", "M12 5v14"],
  flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
  thumb: ["M7 10v12", "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"],
};

function Icon({ name, size }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: size, height: size }}
    >
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/* Each tag kind reads its own pair of tokens. Spicy and popular carry an
   icon as well; every kind always shows its label. */
const KINDS = ["vegetarian", "vegan", "spicy", "gluten-free", "popular", "new", "default"];
const TAG_ICON = { spicy: "flame", popular: "thumb" };

function DishTag({ label, kind }) {
  const k = KINDS.includes(kind) ? kind : "default";
  return (
    <Badge
      style={{
        background: `var(--dt-dietary-${k}-bg)`,
        color: `var(--dt-dietary-${k}-fg)`,
        border: "var(--dt-border-width-default) solid transparent",
      }}
    >
      {TAG_ICON[k] && <Icon name={TAG_ICON[k]} size="var(--dt-size-icon-xs)" />}
      {label}
    </Badge>
  );
}

const defaultQuantityLabel = (n) => `${n} in basket`;

export function MenuItem({
  name,
  description,
  price,
  compareAt,
  currency = "USD",
  locale,
  image,
  tags = [],
  soldOut = false,
  quantity = 0,
  onAdd,
  onQuantityChange,
  onSelect,
  layout = "list",
  headingLevel = 3,
  addLabel,
  soldOutLabel = "Sold out",
  quantityLabel = defaultQuantityLabel,
  style,
  ...rest
}) {
  const metaId = React.useId();
  const [hover, setHover] = React.useState(false);
  const [ring, setRing] = React.useState(false);
  const grid = layout === "grid";
  const level = Math.min(Math.max(Math.round(headingLevel) || 3, 1), 6);
  const H = `h${level}`;
  const inBasket = quantity > 0;
  const showStepper = inBasket && !!onQuantityChange && !soldOut;
  const showAdd = !!onAdd && !soldOut;
  const selectable = !!onSelect;
  const dim = soldOut ? "var(--dt-menu-item-soldout-color)" : null;

  /* The row's focus ring is drawn on the whole item, not on the name, so a
     keyboard user sees the target the stretched button covers. */
  const onFocus = (e) => {
    let visible = true;
    try { visible = e.currentTarget.matches(":focus-visible"); } catch (err) { visible = true; }
    setRing(visible);
  };

  const title = selectable ? (
    <button
      type="button"
      onClick={onSelect}
      onFocus={onFocus}
      onBlur={() => setRing(false)}
      aria-describedby={metaId}
      style={{
        appearance: "none", background: "none", border: 0, margin: 0, padding: 0,
        font: "inherit", color: "inherit", letterSpacing: "inherit", textAlign: "start",
        cursor: "pointer", outline: "none", position: "static",
        textDecoration: hover && !grid ? "underline" : "none",
        textUnderlineOffset: "var(--dt-border-width-strong)",
      }}
    >
      {/* The stretched target: positioned against the item and stacked over
          its text, price and picture, so a press anywhere on the row is a
          press of this button. The add button and stepper sit above it. */}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
      {name}
    </button>
  ) : name;

  return (
    <div
      onMouseEnter={selectable ? () => setHover(true) : undefined}
      onMouseLeave={selectable ? () => setHover(false) : undefined}
      style={{
        position: "relative", isolation: "isolate", boxSizing: "border-box",
        display: "flex", alignItems: "flex-start", gap: "var(--dt-menu-item-gap)",
        minWidth: 0, height: grid ? "100%" : undefined,
        padding: grid ? "var(--dt-menu-item-padding)" : "var(--dt-menu-item-padding) 0",
        borderRadius: "var(--dt-radius-container)",
        border: grid ? "var(--dt-border-width-default) solid var(--dt-menu-item-card-border)" : undefined,
        background: grid ? (hover ? "var(--dt-menu-item-bg-hover)" : "var(--dt-menu-item-card-bg)") : undefined,
        outline: ring ? "var(--dt-focus-ring-width) solid var(--dt-focus-ring-color)" : "none",
        outlineOffset: "var(--dt-focus-ring-offset)",
        cursor: selectable ? "pointer" : undefined,
        transition: "background var(--dt-motion-micro)",
        ...(soldOut ? { "--dt-price-color": "var(--dt-menu-item-soldout-color)", "--dt-price-sale-color": "var(--dt-menu-item-soldout-color)" } : null),
        ...style,
      }}
      {...rest}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
        <H style={{ ...role("label-lg"), margin: 0, overflowWrap: "anywhere", color: dim || "var(--dt-text-primary)" }}>{title}</H>
        {description && (
          <p
            style={{
              ...role("body-sm"), margin: 0,
              color: dim || "var(--dt-menu-item-description-color)",
              display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {description}
          </p>
        )}
        <div id={metaId} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)", minWidth: 0 }}>
          <Price amount={price} compareAt={compareAt} currency={currency} locale={locale} size="sm" />
          {soldOut && <Badge tone="neutral">{soldOutLabel}</Badge>}
          {inBasket && !soldOut && <Badge tone="primary">{quantityLabel(quantity)}</Badge>}
        </div>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)", minWidth: 0 }}>
            {tags.map((t) => <DishTag key={t.label} label={t.label} kind={t.kind} />)}
          </div>
        )}
        {showStepper && (
          <div style={{ position: "relative", zIndex: 2, marginTop: "var(--dt-space-stack-2xs)", alignSelf: "flex-start" }}>
            <QuantityStepper
              size="sm"
              value={quantity}
              min={1}
              onChange={onQuantityChange}
              onRemove={() => onQuantityChange(0)}
              label={`Quantity, ${name}`}
              removeLabel={`Remove ${name}`}
            />
          </div>
        )}
      </div>

      {(image || showAdd) && (
        <div style={{ position: "relative", flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {image && (
            <span
              style={{
                display: "block", position: "relative", overflow: "hidden",
                width: "var(--dt-menu-thumb-size)", height: "var(--dt-menu-thumb-size)",
                borderRadius: "var(--dt-menu-thumb-radius)", background: "var(--dt-menu-thumb-bg)",
              }}
            >
              {image.src && (
                <img
                  src={image.src}
                  alt={image.alt || ""}
                  loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", filter: soldOut ? "grayscale(1)" : undefined }}
                />
              )}
            </span>
          )}
          {showAdd && (
            <IconButton
              label={addLabel || `Add ${name}`}
              variant="solid"
              size="sm"
              onClick={onAdd}
              style={{
                position: image ? "absolute" : "relative", zIndex: 2,
                insetBlockEnd: image ? "var(--dt-space-inset-2xs)" : undefined,
                insetInlineEnd: image ? "var(--dt-space-inset-2xs)" : undefined,
                borderRadius: "var(--dt-radius-pill)",
                boxShadow: image ? "var(--dt-elevation-2)" : undefined,
              }}
            >
              <Icon name="plus" size="var(--dt-size-icon-sm)" />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}
