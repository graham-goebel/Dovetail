# Button

The system's action control. Use exactly one `primary` button per view. If two things are equally important, neither is.

## Use it when
- The user performs an action: save, delete, add, continue.

## Don't use it when
- It navigates somewhere. Use `Link`, or `Button as="a"` only when a navigation genuinely needs button prominence (a hero CTA).
- It toggles a setting instantly. Use `Switch`.

## Example
```jsx
<Inline gap="xs" justify="flex-end">
  <Button variant="secondary">Cancel</Button>
  <Button loading={saving}>Save changes</Button>
</Inline>
```

## Variants
| Variant | For |
|---|---|
| `primary` | The one main action in the view |
| `secondary` | Everything else with equal visual weight to each other |
| `ghost` | Low-emphasis actions in toolbars and table rows |
| `danger` | Destructive actions, always behind a confirmation |

Sizes `sm` / `md` / `lg`. In marketing context `md` is already 48px, so `lg` is rarely needed.

## Product vs marketing
The same component. Context tokens change its height, padding, and font size: `dt-context-product` gives a 40px/14px toolbar button, `dt-context-marketing` a 48px/16px CTA. Do not hand-size buttons per surface.

## Tokens
Reads `--dt-button-*` (Tier 3), which resolve to `--dt-surface-action*` and `--dt-text-on-action*`. Override the Tier 3 tokens to restyle Button alone; override the semantic tokens to move every action surface together.

## As a link
`as="a"` with an `href` makes a real link that looks like a button. Button sets `text-decoration: none`, so the system's global link underline does not reach it; `Link` is the component that keeps the underline.

## Accessibility
`loading` sets `aria-busy` and blocks clicks while keeping the label readable. Disabled buttons set both `disabled` and `aria-disabled`. Focus ring comes from the system.

## Content
Verb-first, one to three words, sentence case. "Save changes", not "Submit" or "Click here". Never change the label to "Loading…"; the spinner says that already.
