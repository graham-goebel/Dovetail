---
type: added
bump: minor
area: tokens
components: []
tokens: [--dt-opacity-ghost, --dt-opacity-disabled, --dt-opacity-muted, --dt-opacity-strong]
visual: false
---
Opacity joins the token tiers. Four semantic roles say how see-through a layer is, by purpose: `--dt-opacity-ghost` (0.2) for watermarks and placeholders, `--dt-opacity-disabled` (0.4) for a control that can't be used right now, `--dt-opacity-muted` (0.6) for secondary art, and `--dt-opacity-strong` (0.8) for a layer over content that should still show what's beneath. They read the new primitives `--dt-opacity-0` to `--dt-opacity-100`, by tenths, which nothing else should read. Opaque stays the default and has no token. See the opacity section of the token reference.
