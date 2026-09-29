# Stack

Vertical layout primitive. It owns the space between its children, so nothing inside needs a margin.

## Use it when
- Anything stacks vertically: form fields, card contents, page sections.
- You would otherwise write `margin-bottom` on every child but the last.

## Don't use it when
- The layout is horizontal. Use `Inline`.
- Children need to wrap onto multiple rows. Use `Grid`.

## Example
```jsx
<Stack gap="lg">
  <Heading>Billing</Heading>
  <Card>…</Card>
</Stack>
```

## Layers and spacing
`gap` picks a step of the stack scale. `layer` says instead how closely the things either side of the gap belong together, and lets the layout's character decide the distance:

```jsx
<Stack layer="section" spacing="open">
  <Stack layer="group">…</Stack>
  <Stack layer="group">…</Stack>
</Stack>
```

- `related`: parts of one thing, such as a label and its value.
- `group`: members of a set, such as the fields in a form.
- `block`: one unit from the next, such as a card from a card.
- `section`: a theme from the next within a region.

For text, `eyebrow` sets the gap between an eyebrow and its heading, `subcopy` between a heading and the lead under it, and `paragraph` between one paragraph and the next. Nest them: an `eyebrow` stack of the eyebrow and heading, inside a `subcopy` stack with the lead.

`spacing="tight"` pulls the layers together for a technical screen; `open` leaves related things close and moves the layers apart. It sets `data-layout` on the stack, so everything inside follows. See Foundations, Layout.

## Composition
Nests freely inside `Inline`, `Grid`, and itself. `as` lets it render as `section`, `ul`, or `form` without a wrapper.

## Tokens
`--dt-space-stack-*` for `gap`, and `--dt-layout-stack-*` and `--dt-layout-text-*` for `layer`, multiplied by `--dt-layout-scale` (1 on a page). The context layer retunes `xl` and `2xl`, so a marketing page gets more air than a dashboard from the same prop.

## Content
None. Stack renders no text of its own.
