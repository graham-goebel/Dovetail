---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On the Builder page (`builder.html`), what's added from My components is now a linked instance. Edit an instance in place, then **Update component from this** (in the inspector, under the title) to make it the component's new revision: every other instance on the page follows, keeping its own changes (a different text, a hidden layer), and the project's other pages are updated as they're saved. **Reset** puts an instance back to the component; **Detach from component** keeps what's there and takes the link off. An instance behind its component offers **Update**. Instances show a brand-coloured outline on the canvas and a component icon in Layers. The layout keeps the link as `inst: { of, rev }` on the instance's root. Design note: docs/instances.md.
