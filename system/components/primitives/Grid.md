# Grid

Equal-width column layout. Tracks use `minmax(0, 1fr)` so a long word in one cell cannot blow out the row.

## Use it when
- Card grids, feature rows, dashboard tiles, any repeating set.

## Don't use it when
- There are two or three items in a row that should size to content. Use `Inline`.

## Example
```jsx
<Grid minColumnWidth="240px" gap="lg">
  {plans.map((p) => <Card key={p.id} title={p.name} />)}
</Grid>
```

Prefer `minColumnWidth` over `columns`. It is responsive without a media query, and it degrades to one column on a phone automatically.

## Tokens
`--dt-space-inline-*`.
