---
type: changed
bump: none
area: tooling
components: []
tokens: []
visual: false
---
CI runs only the browser checks a pull request's files need. A changelog entry, a doc or the release runs none of them; a builder change runs the builder check; a component or token change runs all three. A skipped check still reports as passed, so branch protection can keep requiring it. The `run-all-checks` label runs everything, as every push to `main` does. `tools/check/changed.mjs <base>` prints the decision locally.
