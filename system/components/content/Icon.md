# Icon

One glyph from Dovetail Icons, the system's own library of 320 icons, to mark an action, a status or a kind of thing.

Use it next to text, or on its own when its meaning is clear.

## Use it when
- A label, list row or heading reads faster with a mark beside it.
- A control needs a glyph: pass `<Icon />` to a component's icon slot, such as Button's.
- A feature row or empty state wants a picture smaller than an illustration.

## Don't use it when
- The picture carries the message. Use Image or an illustration.
- It would be the only way to tell two things apart. Pair it with text.
- You need a brand mark. Upload it and place it as an Image.

## Example
```jsx
<Icon name="search" />
<Icon name="bell" size="sm" />
<Icon name="success" tone="success" label="Saved" />
```

## Sizes
| size | px | drawing |
| --- | --- | --- |
| `xs` | 12 | 16 grid, 1px strokes |
| `sm` | 16 | 16 grid, 1px strokes |
| `md` | 20 | 24 grid, 1.5px strokes |
| `lg` | 24 | 24 grid, 1.5px strokes (the default) |
| `xl` | 32 | 24 grid, 1.5px strokes |

The size picks the drawing, so a 16px icon is its own drawing, not a shrunken 24px one.
Sizes follow `--dt-size-icon-*`, so a context that re-points those tokens resizes icons too.

## The library
`Icon.names` lists every name and `Icon.groups` lists them by category. The SVGs, 16 and 24, and
a sprite sheet for each size are in `system/assets/icons/dovetail/`. Sprite ids are
`dt-NAME-16` and `dt-NAME-24`.

## Composition
Inline: it sits on the text baseline and doesn't stretch in a row. Put it inside Button,
Inline, list rows, Badge or Card. It takes no children.

## Tokens
`--dt-size-icon-xs` to `--dt-size-icon-xl` for its box. Colour is `currentColor` by default, so it
takes the text colour around it. `tone` sets one of the text roles instead (`--dt-text-brand`,
`--dt-text-success` and so on); never give an icon a raw colour.

## Accessibility
Without `label` the icon is decorative: `aria-hidden`, and skipped by screen readers. With
`label` it is `role="img"` with that name. In an icon-only button, label the button and leave
the icon unlabelled.

## Content
Labels are short nouns or states in sentence case: "Saved", "Unread messages".
