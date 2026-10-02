# HeroBlock

The top of a page. `split` sets the copy beside a picture and stacks them on a phone, `centered` centres it over the picture, and `background` turns the block into a photo band with the copy on a scrim.

## Use it when
- The first section of a landing or product page.

## Don't use it when
- Anywhere but the top. A second hero competes with the first; use `SplitBlock`.

## Example
```jsx
<HeroBlock
  eyebrow="Design system infrastructure"
  title="One component set. Every brand you ship."
  lead="Components read tokens, tokens read a theme."
  actions={<><Button>Start free</Button><Button variant="secondary">Read the docs</Button></>}
  media={<Image alt="The product" ratio="4:3" />}
/>
```

## Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

## Title size
Set `titleSize` to move the title along the type scale, from `display-lg` down to `heading-md`. It defaults to `display-sm`. Only its size changes: the heading level stays what the block renders.

## Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

## Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.
