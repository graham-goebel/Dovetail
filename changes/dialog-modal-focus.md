---
type: fixed
bump: minor
area: components
components: [Dialog, Drawer]
tokens: []
visual: false
---
`Dialog` behaves as a modal: it is named by its `title` (`aria-labelledby`) and described by its `description`, focus moves into it when it opens, Tab and Shift+Tab stay inside, the page behind stops scrolling, and focus returns to the opener on close. A new `label` prop names a dialog with no visible title, and `style` and other `div` attributes pass through to the panel. `Drawer` gains the same focus trap and scroll lock, and is named by its title whatever type it is.

Before this, a screen reader announced the dialog with no name, focus stayed on the opener, and Tab after the last button left the modal. Consumer audits of 0.2.0 found all three.
