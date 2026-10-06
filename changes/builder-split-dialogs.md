---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's dialogs (Export, Paste a layout, Versions, Keyboard shortcuts, Create component, Play) move out of the App into `assets/builder/app/dialogs.js` as memoized components; `useEvent` in `config.js` gives their handlers one identity across renders. Nothing changes on screen.
