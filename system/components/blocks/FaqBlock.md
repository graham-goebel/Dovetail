# FaqBlock

Questions before someone commits, in an `Accordion`. `split` puts the header beside the answers on a wide screen; `stacked` centres it above them.

## Use it when
- The four to eight questions sales or support hear most.

## Don't use it when
- Documentation. Link to it from an answer instead.

## Example
```jsx
<FaqBlock
  eyebrow="Questions"
  title="Before you adopt it"
  items={[
    { question: "Can we keep our own brand?", answer: "That is the point." },
    { question: "Does it work outside React?", answer: "The tokens do." },
  ]}
/>
```

## Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

## Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

## Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.
