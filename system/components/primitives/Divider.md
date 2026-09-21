# Divider

A rule between content groups.

## Use it when
- Separating sections inside a card or menu where whitespace alone is ambiguous.
- Splitting alternative paths, with `label="or"`.

## Don't use it when
- Space would do the job. Reach for `Stack` with a larger gap first; a divider is visual debt.
- Between every row of a list. Use one border on the container instead.

## Example
```jsx
<Divider />
<Divider label="or" />
<Divider orientation="vertical" />
```

## Accessibility
Renders `role="separator"`, with `aria-orientation` on the vertical variant.

## Tokens
`--dt-border-subtle` by default; `--dt-border-default` and `--dt-border-strong` via `tone`.
