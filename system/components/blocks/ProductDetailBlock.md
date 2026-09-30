# ProductDetailBlock

The top of a product page: a `ProductGallery` on the left and a buy box on the right with the name, price, rating, description, variant pickers, quantity, a full-width add button and collapsible details. The two stack on a narrow screen, gallery first.

## Use it when
- A page sells one product and the buyer needs to choose options before adding it.

## Don't use it when
- Showing several products. Use `ProductGridBlock`.
- A dish with modifiers in a food order. Use `MenuItem` and `ModifierGroup` in a `Sheet`.
- A quick-view overlay with no gallery: compose `Price`, `VariantPicker` and a `Button` in a `Dialog` instead.

## Example
```jsx
const [colour, setColour] = React.useState("fern");
const [size, setSize] = React.useState();
const [qty, setQty] = React.useState(1);

<ProductDetailBlock
  images={images}
  name="Stoneware mug"
  subtitle="Glazed by hand"
  price={size === "large" ? 28 : 24}
  rating={{ value: 4.5, count: 128 }}
  description="A heavy, straight-sided mug with a wide handle."
  variants={[
    { label: "Colour", variant: "swatches", value: colour, onChange: setColour, options: colours },
    { label: "Size", value: size, onChange: setSize, options: sizes },
  ]}
  quantity={qty}
  onQuantityChange={setQty}
  canAddToCart={!!size}
  addToCartNote={size ? "Free shipping over $75." : "Choose a size to add it to your cart."}
  onAddToCart={() => addToCart({ colour, size, qty })}
  details={[
    { title: "Materials and care", content: "Stoneware. Dishwasher safe." },
    { title: "Shipping", content: "Ships in 1–2 working days." },
    { title: "Returns", content: "Free returns within 30 days." },
  ]}
/>
```

## Variants
| State | How |
| --- | --- |
| A required variant unset | `canAddToCart={false}` disables the button. The block does not know which variants are required: work it out from your selection. Say what is missing in `addToCartNote`. |
| Sold out | `soldOut` disables the button and the stepper, and the button reads `soldOutLabel` ("Sold out"). Use `addToCartNote` for when it is back. |
| On sale | `compareAt` greater than `price`: `Price` shows the sale. |
| No quantity | Leave out `onQuantityChange` and the stepper is not shown. |

## Composition
A `Section` with two columns: `ProductGallery`, then a buy box of `Badge`s (`badges`), a `Heading`, `Rating`, `Price`, the description, one `VariantPicker` per entry of `variants` (spread, so each takes every `VariantPicker` prop), a `QuantityStepper`, a full-width `Button`, and an `Accordion` of `details` that allows several open. The block holds no state: the selection, the quantity and the price of the chosen variant are the page's.

## Tokens
Has none of its own. The column gap is `--dt-layout-inline-section` and the rows are `Stack` layers (`group`, `related`, `eyebrow`), all drawn at `--dt-layout-scale`, so the Configure sheet's layout reaches it. Everything else comes through the components it composes.

## Accessibility
- The name is the page's `h1` by default (`level`); set it to 2 when the page has another h1.
- The gallery is a named region (`galleryLabel`, default "Images of {name}").
- `addToCartNote` is linked to the button with `aria-describedby`, so a disabled button's reason is read with it.
- The stepper is named "Quantity, {name}"; each `VariantPicker` is a radio group named by its label.
- The accordion's buttons carry `aria-expanded` and control their panels.

## Content
- Button: a verb, "Add to cart" (or "Add to bag"). Don't swap it for "Loading…".
- Notes are one short sentence: "Choose a size", "Back in November".
- Details titles are nouns: "Materials and care", "Shipping", "Returns".
