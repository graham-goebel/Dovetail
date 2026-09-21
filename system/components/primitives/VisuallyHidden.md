# VisuallyHidden

Text that screen readers announce and sighted users never see.

## Use it when
- A heading is needed for document structure but would be visual noise.
- A table's action column needs a header.
- Live-region status text accompanies a purely visual change.

## Don't use it when
- You want to hide something from everyone. Use `display: none`.
- An icon-only button needs a name. Those take a required `label` prop already.

## Example
```jsx
<VisuallyHidden as="h2">Account settings</VisuallyHidden>
```

## Accessibility
Uses the clip-path technique rather than `display: none` or zero dimensions, both of which remove content from the accessibility tree.
