# Dovetail — authoring rules (always apply)

Dovetail is white-label. Nothing in it may know a brand.

## Tokens

1. **Never write a literal value.** No hex, no px, no ms, no cubic-bezier. Every colour,
   dimension, radius, shadow, and duration is `var(--dt-*)`. If the value you need does
   not exist, add a token first — at the correct tier — then use it.
2. **Respect the tier direction: component → semantic → primitive.** Components and
   product code read semantic tokens. Only `--dt-viz-*` chart code may read a primitive,
   and it must say why in a comment.
3. **Never put a value word in a semantic or component token name.** No `surface-blue`,
   no `button-purple-bg`. Colour names live in Tier 1 only.
4. **Use background and foreground roles as pairs.** `--dt-surface-action` with
   `--dt-text-on-action`. Never mix a surface from one pair with text from another.
5. **All spacing is 4px-based, from `--dt-space-*`.** `--dt-dim-hair` and `--dt-dim-hair-2`
   are for borders and optical nudges only — never layout.

## Type

6. **Apply a complete type role**, not a loose font size: family, size, line-height,
   weight, and tracking from the same `--dt-text-<role>-*` set.
7. **Sentence case everywhere** — headings, buttons, labels, table headers. The eyebrow
   role is the only thing ever uppercased.

## Components

8. **Compose from `components/`.** Never re-implement Button, Input, Card, or any other
   primitive inside a screen or template.
9. **Every new component ships four files**: `Name.jsx`, `Name.d.ts` (props contract),
   `Name.md` (agent-facing guidelines), and an entry in its directory's `@dsCard` HTML.
10. **Accessible labels are required props, not optional.** An icon-only control without
    a label is a bug, not a style choice.
11. **Components take content as props.** No hard-coded copy, no fetching, no CMS
    coupling. A component must render identically from React state, Sanity, or a JSON file.

## Visual

12. **One primary action per view.** Everything else is secondary, ghost, or a link.
13. **Backgrounds are flat.** No gradients, textures, or patterns. Depth comes from
    `--dt-elevation-*` and surface hierarchy.
14. **Elevation is a level, not a shadow you picked.** Use `--dt-elevation-0` through `5`.
15. **Focus rings are system-owned.** `:focus-visible` with `--dt-focus-ring-*`. Never
    remove one, never restyle one per component.
16. **Motion uses a `--dt-motion-*` role.** 100–300ms. No bounces, no infinite loops,
    no motion that is purely decorative.
17. **Icons are Lucide**, 2px stroke, sized from `--dt-size-icon-*`, coloured
    `currentColor`. No emoji, no unicode glyphs, no hand-drawn SVG illustration.

## Writing

18. **Confident and educational.** State the rule, then the reason. Second person,
    active voice, present tense. Name tradeoffs instead of hiding them.
19. **No emoji, no exclamation points, no hype adjectives.** Nothing is powerful,
    seamless, or delightful.
20. **Buttons are verb-first, one to three words.** Errors say what happened and what
    to do next.

## Before you ship

21. **Verify in light and dark**, and under at least one demo theme. If it only works
    in the default theme, it is not finished.
22. **Self-audit against the Rules checklist in `readme.md`.**
