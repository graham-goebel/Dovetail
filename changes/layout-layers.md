---
type: added
bump: minor
area: tokens
components: [Stack, Inline]
tokens: [--dt-layout-stack-related, --dt-layout-stack-group, --dt-layout-stack-block, --dt-layout-stack-section, --dt-layout-inline-related, --dt-layout-inline-group, --dt-layout-inline-block, --dt-layout-inline-section]
visual: false
---
Four layout layers say how closely the two things either side of a gap belong together: `related`, `group`, `block` and `section`, each with a stack and an inline gap (`--dt-layout-stack-*`, `--dt-layout-inline-*`). `Stack` and `Inline` take them as `layer`, which wins over `gap`.

A layout character moves the layers as one: `tight` for a technical screen, `balanced` (the default), or `open` for room to breathe, where what is related stays close and the layers move apart. Set it on any region with `data-layout`, or with the new `spacing` prop on `Stack` and `Inline`; the layer tokens are re-declared under each value, so a region set inside a page of another character returns to its own. No existing token or prop changes.

The Space foundation page is now Layout (`foundations/layout.html`, with the old address forwarding), and gains a Layers card.
