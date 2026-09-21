# Tag

An interactive chip. If it cannot be clicked or removed, it is a `Badge`.

## Use it when
- Filter chips the user toggles.
- Values the user entered and can remove: recipients, labels, applied filters.

## Don't use it when
- It is read-only status. Use `Badge`.
- It is a set of mutually exclusive options in a form. Use `Radio`.

## Example
```jsx
<Inline gap="xs">
  <Tag selected onClick={() => toggle("open")}>Open</Tag>
  <Tag onClick={() => toggle("closed")}>Closed</Tag>
  <Tag onRemove={() => clear("priority")}>Priority: high</Tag>
</Inline>
```

## Accessibility
With an `onClick`, Tag becomes `role="button"` with `aria-pressed` and a tab stop. The remove button gets its own label derived from the tag text.

## Content
Sentence case. Applied filters read as "Field: value".
