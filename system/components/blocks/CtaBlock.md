# CtaBlock

The close of a page: one ask and its buttons, on the brand fill by default. With `media` the copy sits beside an illustration or product shot.

## Use it when
- The last block on a page.

## Don't use it when
- Mid-page. A call to action before the argument is made reads as pressure.

## Example
```jsx
<CtaBlock
  title="Ship your brand, not ours"
  lead="Free while you evaluate."
  actions={<><Button>Start free</Button><Button variant="secondary">Talk to us</Button></>}
/>
```

## Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

## Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

## Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.
