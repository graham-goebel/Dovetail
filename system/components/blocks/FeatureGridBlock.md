# FeatureGridBlock

A header over a grid of features: an icon on a brand tint, a title and a sentence each. Columns drop as the width runs out, down to one on a phone.

## Use it when
- Three to eight parallel reasons, capabilities or steps.

## Don't use it when
- One idea with a picture. Use `SplitBlock`.

## Example
```jsx
<FeatureGridBlock
  eyebrow="Why it holds"
  title="Three tiers, referenced one way"
  tone="subtle"
  items={[
    { icon: <PaletteIcon />, title: "Primitives name values", description: "Nothing here knows what it is for." },
    { icon: <LayersIcon />, title: "Semantics name jobs", description: "The only tier a component reads." },
    { icon: <BlocksIcon />, title: "Components name parts", description: "Retuned per context." },
  ]}
/>
```

## Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

## Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

## Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.
