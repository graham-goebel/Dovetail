---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On the Builder page (`builder.html`), a link can go to one of the project's pages. Any `href` prop (a Link, a Card, a Navbar or Sidebar item, a feature grid item) gets a **Link to** control in the inspector: None, a web address, or a page by name. In Play, pressing the link opens that page's frame on the same screen, a Back button (or Backspace) retraces, and closing Play returns to the page it started on. The exported code writes a relative address made from the page's name: the first page is `./index.html`, "About us" is `./about-us.html`. A page link is kept in the layout as `#page:<id>`.
