# Contributing

## Before you add a component

Answer these three. If you cannot, the component is not ready.

1. **Does an existing component do this with a prop?** A new variant is cheaper than a new
   component, and a system with two components that overlap teaches people to guess.
2. **Will it be used in at least three places?** Twice is a coincidence. Once is a
   one-off that belongs in the product, not the system.
3. **Can it be described without naming a specific screen?** "A card with the billing
   summary" is a product component. "A card with an eyebrow, title, and action" is a
   system component.

## What ships with every component

Four files, in the same directory.

```
components/<group>/
  Name.jsx        Named PascalCase export. React only — no npm packages, no CSS-in-JS.
  Name.d.ts       Props interface with JSDoc on every prop.
  Name.md         Agent-facing guidelines. See the template below.
  <group>.card.html   One per directory, tagged @dsCard, showing all key states.
```

### The `.md` file

This is the file an AI agent reads before using the component, and the one a designer
reads to understand intent. It is not API documentation — the `.d.ts` is that.

```md
# Name

One sentence: what it is and when to reach for it.

## Use it when
- …

## Don't use it when
- … (and say what to use instead)

## Example
```jsx
<Name variant="primary">Save changes</Name>
```

## Variants
Table or list. What each is for, not just that it exists.

## Composition
What it nests inside, what nests inside it.

## Tokens
Which semantic tokens it reads. Which Tier 3 tokens it exposes, if any.

## Accessibility
Keyboard contract, required labels, ARIA roles it sets.

## Content
Copy rules specific to this component — casing, length, verb form.
```

## Code rules

- **No literal values.** Every colour, dimension, radius, shadow, and duration is a token.
  A hard-coded `12px` is a bug even when it happens to match a token.
- **Read semantic tokens**, or this component's own Tier 3 tokens. Never a primitive.
- **No npm dependencies.** React and the platform. A component that needs a date library
  is a product component.
- **Props for content, never children for structured content.** `children` is for a single
  slot of arbitrary content, not for four positional slots.
- **Required accessible labels are typed as required.** Make the type system enforce it.
- **Forward refs and spread the rest.** `...rest` onto the root element so consumers can
  pass `data-*`, `aria-*`, and event handlers without a wrapper.

## Adding a token

See `tokens.md`. Short version: JSON first, correct tier, semantic values must be
references, port to CSS, add to a spec card, check contrast.

## Changing an existing token

Renaming a token is a breaking change. Treat it as one.

1. Add the new name pointing at the same value.
2. Keep the old name as an alias of the new one, with a comment marking it deprecated and
   the date.
3. Update every internal usage.
4. Remove the alias no sooner than one minor version later.

Atlassian migrated thousands of tokens to semantic names with codemods, and it was a
project. Naming a token correctly the first time is a meeting.

## Review checklist

- [ ] Four files present, `.md` complete
- [ ] No literal values anywhere in the JSX
- [ ] Works in light and dark
- [ ] Works under `theme-editorial` and `theme-mono`
- [ ] Keyboard operable, visible focus, labels required in the types
- [ ] All states shown in the directory's `@dsCard` HTML
- [ ] Copy is sentence case, verb-first on actions
- [ ] `check_design_system` passes
