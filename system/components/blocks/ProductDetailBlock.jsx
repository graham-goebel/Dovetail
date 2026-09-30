import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Stack } from "../primitives/Stack.jsx";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { Button } from "../actions/Button.jsx";
import { Accordion } from "../content/Accordion.jsx";
import { ProductGallery } from "../commerce/ProductGallery.jsx";
import { VariantPicker } from "../commerce/VariantPicker.jsx";
import { Price } from "../commerce/Price.jsx";
import { Rating } from "../commerce/Rating.jsx";
import { QuantityStepper } from "../commerce/QuantityStepper.jsx";

/* A column is at least this wide before the two stack: a gallery any
   narrower loses its thumbnails, and a buy box its one-line price. */
const MIN_COLUMN = "calc(var(--dt-size-media-min) * 1.25)";
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;

/* The top of a product page: the gallery on the left, the buy box on the
   right, stacked gallery first on a narrow screen. The block holds no state;
   the variants, the quantity and whether the product can be added are the
   consumer's, passed in as props. */
export function ProductDetailBlock({
  images = [],
  galleryLabel,
  ratio = "1:1",
  name,
  subtitle,
  price,
  compareAt,
  currency,
  locale,
  rating,
  description,
  variants = [],
  quantity,
  onQuantityChange,
  maxQuantity,
  onAddToCart,
  addToCartLabel = "Add to cart",
  canAddToCart = true,
  addToCartNote,
  soldOut = false,
  soldOutLabel = "Sold out",
  details = [],
  badges,
  level = 1,
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const uid = React.useId();
  const noteId = `${uid}-note`;
  const disabled = soldOut || !canAddToCart;
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div
        style={{
          display: "grid", alignItems: "start",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MIN_COLUMN}), 1fr))`,
          columnGap: scaled("--dt-layout-inline-section"), rowGap: "var(--dt-layout-module-gap)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <ProductGallery images={images} label={galleryLabel || `Images of ${name}`} ratio={ratio} />
        </div>

        <Stack layer="group" style={{ minWidth: 0 }}>
          {badges && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-xs)" }}>{badges}</div>}
          <Stack layer="eyebrow">
            <Heading level={level} size="heading-lg" measure="wide" style={{ overflowWrap: "break-word" }}>{name}</Heading>
            {subtitle && <Text tone="secondary">{subtitle}</Text>}
          </Stack>
          {rating && <Rating value={rating.value} count={rating.count} locale={locale} size="sm" style={{ alignSelf: "flex-start" }} />}
          <Price amount={price} compareAt={compareAt} currency={currency} locale={locale} size="lg" />
          {description && (typeof description === "string" ? <Text tone="secondary">{description}</Text> : <div style={{ color: "var(--dt-text-secondary)" }}>{description}</div>)}

          {variants.length > 0 && (
            <Stack layer="group">
              {variants.map((v, i) => <VariantPicker key={v.label || i} {...v} />)}
            </Stack>
          )}

          <Stack layer="related" style={{ marginBlockStart: "var(--dt-space-stack-xs)" }}>
            {onQuantityChange && (
              <QuantityStepper
                label={`Quantity, ${name}`}
                value={quantity == null ? 1 : quantity}
                onChange={onQuantityChange}
                max={maxQuantity}
                disabled={soldOut}
                style={{ alignSelf: "flex-start" }}
              />
            )}
            <Button
              size="lg"
              fullWidth
              disabled={disabled}
              onClick={disabled ? undefined : onAddToCart}
              aria-describedby={addToCartNote ? noteId : undefined}
            >
              {soldOut ? soldOutLabel : addToCartLabel}
            </Button>
            {addToCartNote && <Text id={noteId} variant="small" tone="secondary">{addToCartNote}</Text>}
          </Stack>

          {details.length > 0 && (
            <Accordion
              label={`About ${name}`}
              allowMultiple
              items={details.map((d, i) => ({ id: `${uid}-detail-${i}`, title: d.title, content: d.content }))}
              style={{ marginBlockStart: "var(--dt-space-stack-sm)" }}
            />
          )}
        </Stack>
      </div>
    </Section>
  );
}
