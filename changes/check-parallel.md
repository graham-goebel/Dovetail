---
type: changed
bump: none
area: tooling
components: []
tokens: []
visual: false
---
The builder check (`npm run check:builder`) runs its steps side by side, half as many at once as the machine has cores (`BUILDER_WORKERS` sets it); the first ten share one page and keep their order (so `ONLY=` on one of them runs the steps before it too), and the Performance step runs on its own. Each step prints its lines together when it ends, with how long it took.
