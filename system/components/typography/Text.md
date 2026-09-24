# Text

Running text in one of the system's type roles: an eyebrow, a lead paragraph, body copy, small print, fine print, a label. It replaces the hand-written `.eyebrow`, `.lead` and `.fine` classes every brand otherwise writes for itself.

## Use it when
- Any paragraph or line of text outside `Prose` that belongs to a type role.
- A price, a count or a value that should line up: `variant="label" numeric`.

## Don't use it when
- It is long-form content from a CMS. Use `Prose`, which styles plain elements.
- It is a heading. Use `Heading`.

## Variants
| variant | role | tag | default tone |
| --- | --- | --- | --- |
| `eyebrow` | eyebrow, uppercase | span | secondary |
| `lead` | body-lg | p | secondary |
| `body` | body-md | p | inherit |
| `small` | body-sm | p | inherit |
| `fine` | body-xs | p | tertiary |
| `label` | label-md | span | inherit |

## Example
```jsx
<Stack gap="xs">
  <Text variant="label" weight="semibold" numeric>$48.00</Text>
  <Text variant="fine">Tax calculated at checkout.</Text>
</Stack>
```

Paragraph variants are bounded at `--dt-measure-default` so a line never runs wider than it can be read; pass `measure="none"` inside a narrow column where the bound does nothing.

## Tone
Every tone is a semantic role, so a `Text` inside a brand or photo `Section` follows the section: the section re-points `--dt-text-primary`, `-secondary` and `-tertiary` for its own surface.

## Tokens
`--dt-text-{role}-*`, `--dt-text-primary`, `-secondary`, `-tertiary`, `-link`, `--dt-measure-*`, `--dt-font-weight-*`. The eyebrow and label roles read `--dt-font-family-secondary`, so a secondary face set in Configure reaches them.
