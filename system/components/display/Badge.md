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
<Badge tone="brand">Members</Badge>
<Badge tone="brand" variant="solid">New</Badge>
```

## Variants
`subtle` (default) for status in dense lists. `solid` sparingly: one solid badge draws the eye, five do not.

## Brand
`tone="brand"` (and `"brand-secondary"`) is for marks that belong to the brand rather than a status: New, Members, a launch. `subtle` is the page's own surface with the brand as text and edge, so it reads on the page and on a brand fill alike, such as a brand `Navbar`. `solid` is the brand fill with `--dt-text-on-brand`.

## Accessibility
Colour never carries the meaning alone; the text does. `dot` is decorative and aria-hidden.

## Content
One or two words, sentence case. "Past due", not "PAST DUE" or "This invoice is past due".
