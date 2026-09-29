---
type: fixed
bump: patch
area: components
components: [Callout, Cover, Media, Quote, Card, EmptyState, Alert, Banner, Drawer, Toast, Tooltip, Input, Select, AppShell, Pagination, Tabs]
tokens: []
visual: false
---
Sixteen components' type declarations no longer clash with the native HTML attribute of the same name. `title` (a rich `ReactNode`), `content`, `role`, `size` and `onChange` (with the component's own signature) are left out of the inherited HTML props, so the declarations type-check under TypeScript with `@types/react` 18, and `<Tabs onChange={(id) => …}>` or `<Input size="lg">` no longer reads as an error. No runtime change.
