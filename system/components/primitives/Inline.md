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

## Tokens
`--dt-space-inline-*`.
