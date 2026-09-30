---
type: added
bump: minor
area: tooling
components: []
tokens: []
visual: false
---
`require("@dovetail-ds/react")` works on Node 22.12 and later: the exports map uses the `default` condition, so a Node that can `require()` an ES module loads the package without a separate CommonJS build. Older Node versions still need `import`.
