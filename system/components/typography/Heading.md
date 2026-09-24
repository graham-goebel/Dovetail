# Heading

A heading whose level and size are two props. `level` sets the tag, so the document outline stays honest; `size` sets the type role, so the page can still look the way it should.

## Use it when
- Any heading on a page: a hero title, a section title, a card title that needs to be a real heading.
- The visual size and the outline disagree. A hero's one `h1` is often set at `display-md`; a product name inside a card is an `h3` set at `heading-sm`.

## Don't use it when
- The text is a label, not a heading. An eyebrow above a title is `Text variant="eyebrow"`, not a small heading.
- It sits inside `Prose`. Prose styles plain `h2` and `h3` itself.

## Example
```jsx
<Stack gap="sm">
  <Text variant="eyebrow">New season</Text>
  <Heading level={1} size="display-md">Built for the trail</Heading>
  <Text variant="lead">Four days, three huts, one pack.</Text>
</Stack>
```

One `h1` per page. Do not skip levels to get a smaller size; pick the right level and pass `size`.

## Tone
`tone` defaults to `inherit`, so a heading inside a brand, photo or dark `Section` takes that section's text colour without a prop. Pass `primary` or `secondary` only to override it.

## Tokens
`--dt-text-{size}-family`, `-size`, `-line`, `-weight`, `-tracking`, and `--dt-measure-*` when `measure` is set. A display face chosen in Configure reaches every heading through these roles.
