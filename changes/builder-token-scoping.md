---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
On the Builder page (`builder.html`), every size and spacing list offers only what suits the layer it's for.

- **Component sizes stay on their components.** Control sizes are offered on Buttons and other controls, icon sizes on Icons and shapes, and avatar sizes on Avatars. A Text, a Group or a mixed selection no longer sees them.
- **The right axis.** The page widths are offered for width, never for height or min height.
- **Section-level spacing stays on sections.** Section padding, the page gutter, the module steps and the layout layers are offered on Sections, blocks and containers, never on a Button, a Text or an Image. A module step pads above and below, never a side.
- **Artboard sizes only appear on a social frame.**
- **A mixed selection** is offered what its layers have in common.
- **The same rule everywhere.** It applies to the inspector, the Variables panel, and the sizes the canvas snaps to when a layer is resized, swapped or set to Fixed. Resizing a Text box no longer writes an avatar or control size onto it.
- **A value already set stays listed** where the rule would hide it, so it can still be seen and changed.
- **Steps of the size grid** read "step × n" from the new `--dt-size-step`.
