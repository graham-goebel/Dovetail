# IconButton

A button whose only content is an icon. `label` is a required prop and the type system enforces it.

## Use it when
- Space is genuinely tight and the icon is unambiguous: close, search, more, edit, delete.

## Don't use it when
- The icon needs explaining. If you would add a caption, use a `Button` with `iconStart`.
- It is the primary action in a form or dialog. Those get words.

## Example
```jsx
<IconButton label="Close dialog" onClick={close}>
  <X size={20} />
</IconButton>
```

## Variants
`ghost` (default) for toolbars and table rows. `solid` for a floating or primary action.

## Accessibility
`label` becomes both `aria-label` and the native tooltip. On touch surfaces use `size="md"` or larger: `xs` and `sm` fall below the 44px target and need a padded hit area around them.

## Content
Label is a verb phrase naming the action and its object: "Close dialog", not "Close" or "X".
