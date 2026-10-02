# SplitBlock

Copy beside media: a picture, a video, a product shot or a live component. The two sit side by side on a wide screen and stack on a phone; `points` become a checked list.

## Use it when
- One idea that needs a picture to land.
- Alternating down a page: flip `reverse` on every other one.

## Don't use it when
- Several parallel ideas. Use `FeatureGridBlock`.

## Example
```jsx
<SplitBlock
  eyebrow="See it run"
  title="Retheme a whole product in one pass"
  body="Pick a colour, a type family and a radius. Every screen follows."
  points={["Light and dark from the same roles", "Contrast checked on every pairing"]}
  media={<Video label="Walkthrough" />}
  actions={<Button variant="secondary">Watch the tour</Button>}
/>
```

## Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

## Title size
Set `titleSize` to move the title along the type scale, from `display-lg` down to `heading-md`. It defaults to `heading-lg`. Only its size changes: the heading level stays what the block renders.

## Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

## Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.
