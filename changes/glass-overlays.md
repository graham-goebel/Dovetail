---
type: added
bump: minor
area: components
components: [Dialog, Sheet, Drawer, Popover, Toast]
tokens: []
visual: false
---
`Dialog`, `Sheet`, `Drawer`, `Popover` and `Toast` take `surface="glass"` or `"glass-strong"`, as `Card` already does. Glass lets what's behind show through, blurred: `--dt-surface-glass` (or `-strong`) with `--dt-border-glass` and `--dt-backdrop-glass`. Dialog and Sheet re-point their own `--dt-dialog-bg` and `--dt-dialog-border-color`, so every part of them follows, including the Sheet's sticky header. The default stays `"raised"`.
