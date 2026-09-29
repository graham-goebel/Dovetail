# TestimonialBlock

What customers say. One quote is set large and centred; several sit in a grid on the card surface.

## Use it when
- Real quotes from named people.

## Don't use it when
- Invented quotes. Leave the block out until you have real ones.

## Example
```jsx
<TestimonialBlock
  quotes={[{ quote: "Tokens made the redesign a config change.", name: "Ada Lovelace", role: "Design Systems Lead, Northwind" }]}
/>
```

## Stacking blocks
Blocks are Sections, so a page is a list of them. Alternate `tone` (base, subtle, base, brand) so one band ends where the next begins, keep one `HeroBlock` at the top and one `CtaBlock` at the end, and let everything between be the argument. Pass `dark` to scope dark mode to a single block.

## Tokens
Reads the section, typography and card tokens through `Section`, `Heading` and `Text`; it has none of its own. Retheme it by retheming those.

## Accessibility
Each block is a `<section>`. Give the page one `h1` (the HeroBlock's title) and let every other block's title be an `h2`, which is what they render.
