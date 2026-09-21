# Card

A content container. Card is the clearest demonstration of the context system: the same component is a bordered, flat panel in product and a borderless, softly raised content block in marketing.

## Use it when
- Grouping related content that could stand alone: a plan, a setting group, a dashboard panel, a feature block.

## Don't use it when
- Everything on the page is a card. Nesting cards inside cards means neither is doing any work — use `Stack` and a `Divider`.
- It is a list of similar rows. Use one container with row borders.

## Example
```jsx
<Card
  eyebrow="Best value"
  title="Team"
  description="Everything in Starter, plus shared workspaces."
  footer={<Button fullWidth>Choose Team</Button>}
/>
```

## Product vs marketing
Set by the context, not by a prop.

| | Product | Marketing |
|---|---|---|
| Padding | 16px | 32px |
| Border | 1px | none |
| Elevation | 0, raising to 1 | 0, raising to 2 |
| Radius | container (8px) | overlay (12px) |

If a card needs different treatment inside one context, that is a Tier 3 override on a wrapper, not a new prop.

## Tokens
`--dt-card-*`. Override these to restyle every card; override `--dt-surface-raised` to move all raised surfaces together.

## Accessibility
`interactive` is visual only. A clickable card needs a real control inside it, or `as="button"` with an accessible name — a div with onClick is not keyboard operable.

## Content
Eyebrow is two or three words. Title is a noun phrase. Description is one sentence.
