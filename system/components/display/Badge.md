# Badge

A small, non-interactive label. Badges report state; they never do anything.

## Use it when
- Status on a record: Active, Past due, Draft.
- A count or short piece of metadata beside a title.

## Don't use it when
- It is clickable or removable. Use `Tag`.
- The information needs a sentence. Use `Alert`.

## Example
```jsx
<Badge tone="success" dot>Active</Badge>
<Badge tone="danger">Past due</Badge>
<Badge tone="primary" variant="solid">New</Badge>
```

## Variants
`subtle` (default) for status in dense lists. `solid` sparingly: one solid badge draws the eye, five do not.

## Accessibility
Colour never carries the meaning alone; the text does. `dot` is decorative and aria-hidden.

## Content
One or two words, sentence case. "Past due", not "PAST DUE" or "This invoice is past due".
