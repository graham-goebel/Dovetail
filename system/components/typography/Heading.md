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
`tone` defaults to `headline`, which reads `--dt-text-headline`. That role is ink until a theme or Configure's Headline colour sets it to a brand colour, and then every heading follows at once. A brand, photo or dark `Section` re-points it for its own surface, so a heading in a band still reads correctly without a prop.

`brand` and `brand-secondary` set a single heading in a brand colour, through `--dt-text-brand` and `--dt-text-brand-secondary`, while the rest stay as they are. Both are text roles, tuned for text contrast in light and dark mode. `inherit` takes the parent's colour, for a heading inside a coloured block you built by hand rather than with `Section`.

```jsx
<Heading level={1} size="display-md" tone="brand">Built for the trail</Heading>
```

## Tokens
`--dt-text-{size}-family`, `-size`, `-line`, `-weight`, `-tracking`, `--dt-text-headline`, `--dt-text-brand`, `--dt-text-brand-secondary`, and `--dt-measure-*` when `measure` is set. A display face and a headline colour chosen in Configure reach every heading through these roles.
