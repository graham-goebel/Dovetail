# ModifierGroup

A group of options for a dish, such as "Choose a size" or "Add extras": radios for one choice or checkboxes for several, in full-width rows with the price change on the right.

## Use it when
- A dish has options that change what is made or what it costs, usually in a `Sheet` opened from a `MenuItem`.
- One choice is required (a size) or several are allowed up to a limit (extras).

## Don't use it when
- It is a form field that is not about a product's options. Use `RadioGroup` or `CheckboxGroup`.
- The choice is a number of the same thing. Use `QuantityStepper`.
- There are two options without prices that switch a mode. Use `FulfilmentToggle` or `Switch`.

## Example
```jsx
<ModifierGroup
  title="Choose a size"
  mode="single"
  required
  options={[{ id: "regular", label: "Regular" }, { id: "large", label: "Large", price: 2 }]}
  value={size}
  onChange={setSize}
  error={tried && !size.length ? "Choose a size to continue." : undefined}
/>

<ModifierGroup
  title="Add extras"
  mode="multiple"
  max={3}
  options={[
    { id: "egg", label: "Fried egg", price: 2 },
    { id: "tofu", label: "Extra tofu", price: 1.5 },
    { id: "chicken", label: "Chicken", price: 2.5, disabled: true, note: "Sold out today" },
  ]}
  value={extras}
  onChange={setExtras}
/>
```

## Variants
| Prop | What it is for |
|---|---|
| `mode="single"` | Radios. `value` holds one id, or none until something is chosen. |
| `mode="multiple"` | Checkboxes. `value` holds every chosen id. |
| `required` | Shows the "Required" pill; a single-choice group is also `aria-required`. The group does not block anything itself: check it when the dish is added and set `error`. |
| `min`, `max` | Multiple mode. They write the hint ("Choose up to 3", "Choose 1 to 3", "Choose at least 2"). At `max` the unchosen options disable, and each adds ", limit of 3 reached" to its accessible name. `min` is not enforced; set `error`. |
| `error` | A message under the title, announced when it appears. It turns the pill the danger colour. |
| `options[].price` | The change in price: "+$1.50", "−$1.00" for a negative. 0 or no price shows nothing. |
| `options[].note` | A short second line: an allergen, "Sold out today". |
| `options[].disabled` | Greys the option out. Say why in `note`. |

## Composition
Usually two or three groups stacked in a `Sheet`, with a footer `Button` that adds the dish and shows the running total: "Add to basket · $14.50". The price deltas render with `Price`. Controlled: the choices and the total live in your app.

## Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- Rows: `--dt-modifier-row-min-height` (`--dt-size-touch-target`), `--dt-modifier-divider` (`--dt-border-subtle`).
- The drawn control: `--dt-modifier-control-size` (`--dt-size-icon-md`), `--dt-modifier-control-border` (`--dt-border-strong`), `--dt-modifier-control-bg` (`--dt-input-bg`), `--dt-modifier-control-accent` (`--dt-surface-action`), `--dt-modifier-control-mark` (`--dt-text-on-action`).
- `--dt-modifier-delta-color` and `--dt-modifier-hint-color` (`--dt-text-secondary`).
- The pill and error: `--dt-modifier-pill-bg` (`--dt-surface-sunken`), `--dt-modifier-pill-fg` (`--dt-text-secondary`), `--dt-modifier-error-color` (`--dt-text-danger`), `--dt-modifier-error-pill-bg` (`--dt-surface-danger-subtle`).

The title is `--dt-text-heading-xs-*`; option labels `--dt-text-body-md-*`. A disabled option reads `--dt-text-disabled`, `--dt-border-disabled` and `--dt-surface-disabled`.

## Accessibility
- A `<fieldset>` whose `<legend>` holds the title and the Required pill, so the group's name is "Choose a size Required".
- The controls are native radio and checkbox inputs, laid transparently over the drawn ones, so the keyboard works as it does everywhere: in single mode Tab reaches the group once and the arrow keys move and choose; in multiple mode each checkbox is a tab stop and Space toggles it. The focus ring is drawn on the visible control.
- Single mode sets `role="radiogroup"` on the fieldset, with `aria-required` and `aria-invalid` when they apply. The hint and the error are linked to the group with `aria-describedby`; the error is also a `role="alert"`, so it is announced when it appears. In multiple mode each checkbox is `aria-invalid` while there is an error.
- The price delta and the note are inside each option's label, so they are part of its name: "Large +$2.00".
- An option disabled because the limit is reached says so in its name, so a screen reader user knows why they can't choose it.
- Every row is at least a touch target tall and the whole row is the label.

## Content
- The title is a short instruction or a noun: "Choose a size", "Add extras", "Spice level".
- Option labels are nouns, sentence case: "Large", "Fried egg".
- The error says what to do: "Choose a size to continue."
- Notes are a few words: "Contains peanuts", "Sold out today".
