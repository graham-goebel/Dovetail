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

## Composition
Nests freely inside `Inline`, `Grid`, and itself. `as` lets it render as `section`, `ul`, or `form` without a wrapper.

## Tokens
`--dt-space-stack-*`. The context layer retunes `xl` and `2xl`, so a marketing page gets more air than a dashboard from the same prop.

## Content
None. Stack renders no text of its own.
