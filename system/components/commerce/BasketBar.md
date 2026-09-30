# BasketBar

The full-width bar at the foot of a phone ordering screen that says how many things are in the basket and what they come to, and opens it: "3 · View basket · $42.50". It renders nothing while the basket is empty.

## Use it when
- A phone menu or store page needs a way into the basket that stays in reach while the reader scrolls.

## Don't use it when
- It is a wide web page with a basket panel beside the menu. Show the `OrderSummary` there.
- It is the checkout's pay button. Use `Button` with the amount in its label.
- It is a header shortcut. Use an `IconButton` with a badge count in its label.

## Example
```jsx
<BasketBar
  count={3}
  total={42.5}
  locale="en-US"
  onClick={() => setScreen("basket")}
  style={{ position: "sticky", bottom: "var(--dt-space-inset-sm)" }}
/>
```

## Placing it
It has no position of its own, so it can sit wherever the screen needs it. Pass `style`:
- In an `AppShell` with a `BottomNav`: pass both in `bottomNav` (`<><BasketBar … /><BottomNav … /></>`), with an inline margin on the bar. The shell's footer is sticky, so the bar floats above the nav while the menu scrolls behind it.
- In any other scrolling column: `position: "sticky"` and a `bottom`.
- Over a whole page: `position: "fixed"` with `insetInline` and `bottom`, and pad the page's end so the last dish is not covered.
Leave it out of the tree, or pass `count={0}`, when the basket is empty.

## Variants
| Prop | What it is for |
|---|---|
| `label` | The words in the middle. "View basket" by default; "View order" or "Checkout" where that is the next step. |
| `itemsLabel` | The count in words, for the accessible name and translations. |
| `disabled` | A store that has just closed: the bar stays, greyed, so the basket is not lost. |

## Composition
Pair it with `MenuBlock` or `MenuItem`s. Your basket holds the count and computes the total; nothing is added up here.

## Tokens
None of its own. It reads Button's primary tokens (`--dt-button-primary-bg`, `-bg-hover`, `-bg-active`, `-fg`, `-border`, `--dt-button-radius`, `--dt-button-transition`, and the disabled pair), so it follows every retheme of `Button`. It is `--dt-size-control-lg` tall with `--dt-elevation-3`. The count sits in a pill tinted from the text colour; the total is a `Price` in the bar's text colour.

## Accessibility
- A native `<button>`, named "View basket, 3 items, $42.50": the visible label comes first, so voice control finds it by what it says.
- The visible count, label and price are hidden from assistive technology, since the name already says them.
- It is at least a touch target tall and keeps the focus ring. Its colour change on press is instant under reduced motion.

## Content
- Label is a verb phrase, sentence case, two or three words.
- The total is what the basket costs before delivery; say so on the basket screen, not in the bar.
