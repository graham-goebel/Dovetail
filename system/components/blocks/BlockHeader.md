# BlockHeader

The eyebrow, title, lead and actions every block opens with, so a page of blocks keeps one rhythm. Use it to start a block of your own.

## Use it when
- Opening a custom section in the same voice as the other blocks.

## Don't use it when
- A page title. Use `HeroBlock`, whose header is an `h1`.

## Example
```jsx
<BlockHeader eyebrow="Pricing" title="Pick a plan" lead="Every plan includes the full system." align="center" />
```

## Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

## Tokens
Reads the typography tokens through `Heading` and `Text`; it has none of its own.

## Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.
