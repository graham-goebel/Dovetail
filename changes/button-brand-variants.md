---
type: added
bump: minor
area: components
components: [Button, Section]
tokens: [--dt-surface-action-brand-secondary, --dt-surface-action-brand-secondary-hover, --dt-surface-action-brand-secondary-active, --dt-text-on-action-brand-secondary, --dt-button-brand-bg, --dt-button-brand-secondary-bg]
visual: true
---
`Button` has two new variants, `brand` and `brand-secondary`, which fill it with the primary or secondary brand colour and set text that passes on it. They read the new `--dt-button-brand-*` and `--dt-button-brand-secondary-*` tokens. Those resolve to `--dt-surface-action-brand*` and the new `--dt-surface-action-brand-secondary*` roles, with `--dt-text-on-action-brand` and the new `--dt-text-on-action-brand-secondary`.

Inside a `Section` toned `brand-muted`, a primary `Button` now takes the brand colour and a secondary one the secondary brand colour. Inside `secondary-muted`, the two swap. To keep the ink buttons on a tinted band, set `--dt-button-primary-bg` and `--dt-button-secondary-bg` (and their `-fg`, `-hover`, `-active` and `-border` pairs) back to the action roles in a style or theme on that band.
