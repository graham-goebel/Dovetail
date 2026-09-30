# QuantityStepper

A − value + control for choosing how many of something: a cart line, a menu item, a ticket count. The value can also be typed.

## Use it when
- The quantity is small and usually changes by one: cart lines, menu items, seats, tickets.
- A cart line should be removable from the same control: pass `onRemove`, and at the minimum the minus button becomes a remove button.

## Don't use it when
- The number is large or rarely nudged (an amount of money, a year). Use `Input` with `type="number"` or `inputMode="numeric"`.
- The value is approximate. Use `Slider`.
- There are a few named options (Small, Medium, Large). Use `RadioGroup` or `ButtonGroup`.

## Example
```jsx
<QuantityStepper label="Quantity" value={qty} onChange={setQty} max={10} />

{/* Cart line: at 1 the minus becomes a remove button */}
<QuantityStepper
  label="Quantity, oat latte"
  removeLabel="Remove oat latte"
  value={line.qty}
  onChange={(qty) => update(line.id, qty)}
  onRemove={() => remove(line.id)}
  size="sm"
/>
```

## Variants
| Prop | What it is for |
|---|---|
| `size="md"` | Default, 40px: product pages and menus, touch-first. |
| `size="sm"` | 32px: cart lines and dense lists. |
| `min` / `max` / `step` | Limits and increment. `min` defaults to 1 and `step` to 1; with no `max` there is no upper limit. Typed values are snapped to the step grid counted from `min`, then clamped. |
| `onRemove` | At `min`, the minus button shows a trash icon, is named `removeLabel` ("Remove") and calls `onRemove` instead of stepping. |
| `disabled` | Both buttons and the field are disabled. |

The stepper is controlled: it shows `value` and calls `onChange(next)` with a value already clamped and snapped. It never calls `onChange` with the current value.

## Composition
Inline. It sits at the end of a cart line or menu row, beside a `Price`, or under a product's options on a product page. For a visible label, put a `<label htmlFor>` pointing at `id` (the value field's id) or use it inside a `Field` with `htmlFor`.

## Tokens
No Tier 3 tokens of its own: it is a field, so it reads the input tokens and the ghost button tokens, and restyling those restyles it with the rest of the form.
- Frame: `--dt-input-height-sm|md`, `--dt-input-radius`, `--dt-input-border-width`, `--dt-input-border`, `--dt-input-bg`, and `--dt-input-border-disabled` / `--dt-input-bg-disabled` when disabled.
- Value: `--dt-input-fg` (`--dt-input-fg-disabled`), type from `--dt-text-label-md-*` (sm) or `--dt-text-label-lg-*` (md), tabular figures.
- Buttons: `--dt-button-ghost-bg`, `--dt-button-ghost-bg-hover`, `--dt-button-ghost-fg`, `--dt-button-transition`; `--dt-text-disabled` at a limit. Icons read `--dt-size-icon-sm|md`.

## Accessibility
- The value is an `<input role="spinbutton">` named by `label`, with `aria-valuenow`, `aria-valuemin` and (when `max` is set) `aria-valuemax`, and `inputMode="numeric"` for a number keypad on phones. The whole control is a `role="group"` with the same name.
- **Keyboard, in the field:** ArrowUp and ArrowDown add or take away one step; PageUp and PageDown ten steps; Home jumps to `min` and End to `max` (when set). Typing a number commits on Enter or on blur, clamped and snapped; Escape abandons what was typed. ArrowDown at the minimum never removes the line; removing takes the button.
- **Buttons:** named "Decrease quantity" and "Increase quantity" by default (`decreaseLabel`, `increaseLabel`). In a cart with several lines, pass names that include the item ("Increase oat latte") so a screen-reader user moving between buttons knows which line they are on. At a limit a button is `aria-disabled` rather than `disabled`, so the focus stays on it when a click reaches the limit instead of dropping to the page.
- The remove button is named `removeLabel`, "Remove" by default; pass the item name here too.
- `label` is required in the types. There is no visible label; the context (a cart line's title) is the visual one.

## Content
- `label` is sentence case and names the thing counted: "Quantity", "Tickets", "Quantity, oat latte".
- Button labels are verb-first: "Increase quantity", "Remove oat latte".
