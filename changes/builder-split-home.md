---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's Home page (projects, files, their cards and menus, New, search and sort) moves out of the App into `assets/builder/app/Home.js` as a memoized component. The App still keeps the lists and does the work; Home draws them. Nothing changes on screen.
