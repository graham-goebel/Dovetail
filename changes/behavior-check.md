---
type: changed
bump: none
area: tooling
components: []
tokens: []
visual: false
---
`npm run check:behavior` drives the built package in Chromium, with no bundler and no network, and asserts what the consumer audits of 0.2.0 found broken: the Dialog's accessible name, description, initial focus, focus trap and focus return; the Drawer's focus trap; and Tabs skipping disabled tabs from the keyboard. It runs in `npm run check` and in CI.
