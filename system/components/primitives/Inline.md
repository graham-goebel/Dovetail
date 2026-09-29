# Inline

Horizontal layout primitive. Wraps by default, because a row of buttons that overflows on a phone is the most common responsive bug in a design system.

## Use it when
- Laying out buttons, chips, avatars, icons with labels, toolbar items.

## Don't use it when
- You need a fixed column structure. Use `Grid`.
- It is a run of text with inline links. Use ordinary flow.

## Example
```jsx
<Inline gap="xs" justify="flex-end">
  <Button variant="secondary">Cancel</Button>
  <Button>Save changes</Button>
</Inline>
```

## Variants
Set `wrap={false}` only when overflow is handled another way, such as a scrolling toolbar.

## Layers and spacing
`layer` sets the gap by how closely the neighbours belong together (`related`, `group`, `block` or `section`) instead of by step, and the layout's character moves it: `spacing="tight"` for a technical toolbar, `open` for room to breathe. It wins over `gap`. Where each layer sits in both directions is on Foundations, Layout.

```jsx
<Inline layer="related">
  <Icon name="clock" />
  <Text>4 days</Text>
</Inline>
```

## Tokens
`--dt-space-inline-*` for `gap`, and `--dt-layout-inline-*` for `layer`.
