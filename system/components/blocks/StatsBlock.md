# StatsBlock

A few numbers that make the case, set large, each over a hairline, in a row that wraps on a phone.

## Use it when
- Two to four numbers a reader can check.

## Don't use it when
- Numbers without a source. A claim nobody can verify weakens the page.

## Example
```jsx
<StatsBlock
  eyebrow="Proof"
  title="The audit that took a week now runs in CI"
  stats={[
    { value: "63", label: "Components", caption: "across eight groups" },
    { value: "658", label: "Tokens", caption: "three tiers" },
  ]}
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
