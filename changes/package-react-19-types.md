---
type: fixed
bump: patch
area: components
components: []
tokens: []
visual: false
---
The type declarations work with React 19: every `.d.ts` uses `React.JSX` instead of the global `JSX` namespace, which `@types/react` 19 removed. With React 19 types, every component's declaration previously failed with "Cannot find namespace 'JSX'". The package check now type-checks against `@types/react` 18 and 19.
