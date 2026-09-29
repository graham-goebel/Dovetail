---
type: fixed
bump: patch
area: components
components: [SocialPost]
tokens: []
visual: false
---
Every component now renders on the server with `renderToString`, so a Next.js-style page no longer logs React warnings. `SocialPost` was the only one that didn't: its scale measurement used `useLayoutEffect`, which React warns about during a server render. It now falls back to `useEffect` where there is no `document`, and behaves as before in the browser. The other 75 components already rendered cleanly. `node tools/check/ssr.mjs` renders all 76 and fails on any throw, `console.error` or `console.warn`.
