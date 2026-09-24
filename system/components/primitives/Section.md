# Section

A page section: a column bounded by a container width, the section rhythm above and below, and an optional surface. With `media` it becomes a full-bleed photo band. It is the scaffold both example sites built for themselves before it existed.

## Use it when
- Every top-level band of a marketing or editorial page.
- A band should be a fixed brand colour, or a photograph with text over it.

## Don't use it when
- Inside an app shell. Product screens are panels and grids, not stacked bands; use `Stack` and `Grid`.
- The image is the content. A photo someone should look at is an `Image` or a `Cover`, with alt text.

## Example
```jsx
<Section tone="brand-muted" texture>
  <Stack gap="md">
    <Text variant="eyebrow">Why it holds</Text>
    <Heading level={2}>Three tiers, referenced one way</Heading>
  </Stack>
</Section>

<Section media="/img/ridge.webp" align="bottom" width="wide">
  <Heading level={2} size="display-sm">Quiet mornings</Heading>
  <Text variant="lead">Somewhere without a signal.</Text>
</Section>
```

## Tones
A tone is a surface and the text roles that go on it. `brand` and `secondary` are full fills; the `-muted` tones are the pale tint of the same hue. The section re-points `--dt-text-primary`, `-secondary` and `-tertiary` on itself, so everything inside that reads the semantic text roles, `Stat` and `Card` descriptions included, follows the band. That is also how to build a band that should not follow the page's light or dark mode: its colours come from the brand roles, not the page surface.

On a `brand` fill the primary button and the fill are the same colour. Use a secondary or ghost button there, or a `-muted` tone.

## Dark and photo bands
`dark` puts the `dark` class on the section, so the semantic tier and the component tier both re-resolve as dark inside it while the rest of the page stays light. A `media` band is scoped dark by default. Its text reads `--dt-text-on-scrim`, which stays light in both modes, because a scrim over a photograph is dark whatever the page is doing.

A scrim's alpha does not tell you the contrast over a specific photograph. Check it the way `guidelines/accessibility.md` describes: hide the text, sample the pixels behind where it sat, and take the worst case.

## Tokens
`--dt-size-container-*`, `--dt-space-section`, `--dt-space-section-compact`, `--dt-space-gutter`, `--dt-surface-brand*`, `--dt-text-on-brand*`, `--dt-surface-scrim`, `--dt-text-on-scrim*`, `--dt-surface-texture`.
