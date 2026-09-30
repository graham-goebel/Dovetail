---
type: changed
bump: patch
area: tooling
components: []
tokens: []
visual: false
---
`react` is the package's only peer dependency: `react-dom` is no longer required (nothing in the package imports it), and the published manifest has no `engines` field, so installs on any Node version stop warning. The npm description now describes the package rather than the repository.
