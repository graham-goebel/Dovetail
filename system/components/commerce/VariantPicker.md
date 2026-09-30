# VariantPicker

Choose one variant of a product, such as a size, a colour or a material: a radio group of chips or colour swatches, or the system `Select` for a long list.

## Use it when
- A product comes in options and the customer picks one before adding it to the cart.
- Some options are out of stock but should stay visible, so people know they exist.
- Colours are best shown as colours: `variant="swatches"`.

## Don't use it when
- More than one can be chosen, such as toppings or add-ons. Use `CheckboxGroup`.
- It is a filter on a product list, which usually allows several values. Use `Tag`s or a `CheckboxGroup`.
- The choice is not about a product, such as a plan or a setting. Use `RadioGroup`.

## Example
```jsx
const [size, setSize] = React.useState();
<VariantPicker
  label="Size"
  value={size}
  onChange={setSize}
  options={[
    { value: "s", label: "S" },
    { value: "m", label: "M" },
    { value: "l", label: "L", note: "Low stock" },
    { value: "xl", label: "XL", disabled: true },
  ]}
/>

<VariantPicker
  label="Colour"
  variant="swatches"
  value={colour}
  onChange={setColour}
  options={[
    { value: "fern", label: "Fern", color: "#5b7a6a" },
    { value: "chalk", label: "Chalk", color: "#ffffff" },
    { value: "linen", label: "Linen", image: "/img/linen-swatch.jpg" },
  ]}
/>

<VariantPicker label="Waist" variant="select" value={waist} onChange={setWaist} options={waists} />
```

## Variants
| Variant | What it is for |
|---|---|
| `chips` | Default. Labelled buttons at least 44px square, for sizes, materials and anything with a short text label. A `note` shows as a second line. |
| `swatches` | 44px circles of each option's `color` or `image`, for colours and fabrics. The chosen one has a ring. The label is the accessible name and a tooltip, and the legend shows it ("Colour: Chalk"). |
| `select` | The system `Select`, for a long list (more than about a dozen) or long labels. `showSelected` doesn't apply: the select shows its value. |

Unavailable options (`disabled: true`) stay in place. A chip is struck through with a dashed border; a swatch is crossed. `showSelected` (on by default) prints the chosen label after the legend: "Size: M".

## Composition
- On a product page, one picker per dimension, stacked under the price and above the quantity and the add button.
- Swatch colours come from product data. They are content, not design tokens, so a literal colour value in `options` is right.
- `select` renders `Select`, and so `Field` for its label. In that variant, extra props go to the native `<select>`; in the others they go to the root.
- The picker only reports a choice; which variants are in stock, and what the price becomes, is your app's state.

## Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-variant-bg` (`--dt-surface-base`), `--dt-variant-bg-hover` (`--dt-surface-subtle`), `--dt-variant-fg` (`--dt-text-primary`), `--dt-variant-border` (`--dt-border-default`): a resting chip. The border also marks a hovered swatch.
- `--dt-variant-selected-bg` (`--dt-surface-selected`), `--dt-variant-selected-fg` (`--dt-text-on-selected`), `--dt-variant-selected-border` (`--dt-border-selected`): the chosen chip.
- `--dt-variant-unavailable-fg` (`--dt-text-disabled`), `--dt-variant-unavailable-border` (`--dt-border-disabled`): an unavailable chip.
- `--dt-variant-note-color` (`--dt-text-secondary`): a chip's note.
- `--dt-swatch-ring` (`--dt-border-selected`): the ring around the chosen swatch.
- `--dt-swatch-border` (`--dt-border-strong`): the hairline around every swatch, so a white one shows on a white surface.

Sizes come from `--dt-size-touch-target` (44px), type from `--dt-text-label-md-*`, and the transition from `--dt-motion-micro`, which is instant under reduced motion.

## Accessibility
- Chips and swatches are a `role="radiogroup"` named by the visible `label`, with a `role="radio"` button per option and `aria-checked` on the chosen one.
- One tab stop (roving tabindex): the chosen option, or the first available one when nothing is chosen. Arrow keys move to the next available option and choose it, skipping unavailable ones and wrapping; Home and End go to the first and last available. Space and Enter choose the focused option. Arrows follow the reading direction in right-to-left pages.
- An unavailable option has `aria-disabled="true"` and is named with "unavailable" ("XL, unavailable"; `unavailableLabel` translates it). It can't be chosen, and the arrows pass over it.
- A note is part of the name: "L, Low stock".
- Focus shows the system focus ring. Every option is at least 44px square.
- In `select`, the native select does the keyboard work. `Select` can't disable an option, so an unavailable one reads "XL (unavailable)" and is ignored if picked: the controlled value stays.
- The chosen label in the legend is hidden from assistive technology, since the checked radio already says it.

## Content
- `label` is the dimension, sentence case and short: "Size", "Colour", "Material".
- Option labels are as short as the product allows: "M", "EU 42", "Fern".
- A `note` is two or three words: "Low stock", "+$8", "Ships in 2 weeks".
