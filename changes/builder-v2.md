---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) is easier to work in.

- **Assets panel:** one category at a time behind icon filters, with search across all of them. Each tile shows a live preview of the component and its name, in a grid or list view.
- **Layers panel:**
  - Drag rows to reorder or nest. Rows collapse, a filter narrows the list, and a lock marks components whose own layout is fixed.
  - Shift-select siblings and group them (Ctrl/Cmd+G) into a flex Group. The Group has direction, wrap, alignment and a gap from the space tokens.
  - Ctrl/Cmd+↑ and ↓ move the selection.
- **Canvas:** press anywhere on a component and drag it to move it.
- **Inspector:**
  - Content and props come first.
  - Custom dropdowns show colour swatches and radius, shadow and spacing previews. Icon selectors set alignment and direction, and switches set on/off props.
  - New Size (width, min height) and Spacing (padding, vertical and horizontal margin) sections take tokens only.
- **Toolbar:** icon toggles for viewport and light or dark, which are gone from the sidebar.
- **Saving:** work saves as you go, the toolbar shows when it last saved, and starting from a template asks first and keeps a backup.
