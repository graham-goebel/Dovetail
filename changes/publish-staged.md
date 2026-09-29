---
type: changed
bump: none
area: tooling
components: []
tokens: []
visual: false
---
The Release workflow stages each version on npm with a stage-only token (`npm stage publish`, npm 12) instead of publishing it outright; a maintainer approves the staged version with 2FA, and that approval is the publish. The publish job also runs when the workflow is started by hand on `main`, so a version that is tagged but not yet on npm can be staged, and it skips a version npm already has.
