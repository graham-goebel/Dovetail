# Scaffolding an app around Dovetail

For a folder with no app yet. Ask which they want; default to Vite when they have no deployment target in mind, because it's the smaller setup and the theme wiring is the same three imports.

## Vite + React + TypeScript

Six files. Create them, then `npm install`. Keep the app's own dependencies explicit: `react` and `react-dom` in `dependencies`, the tooling in `devDependencies`.

`package.json`

```json
{
  "name": "my-app",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc --noEmit && vite build", "preview": "vite preview" },
  "dependencies": { "@dovetail-ds/react": "^0.5.0", "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": { "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.0", "typescript": "^5.6.0", "vite": "^6.0.0" }
}
```

Use React 19 and its types instead if the team is on 19; Dovetail's declarations work with both.

`index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`, with the three stylesheets already in order (drop the `fonts.css` line if the theme doesn't use Geist; the theme import comes once the theme exists):

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import "@dovetail-ds/react/fonts.css";
import "@dovetail-ds/react/styles.css";
import "./styles/dovetail-theme.css";
import { Button, Heading, Section, Stack, Text } from "@dovetail-ds/react";

function App() {
  return (
    <Section>
      <Stack gap="md">
        <Heading level={1}>My app</Heading>
        <Text variant="lead">Built with Dovetail.</Text>
        <Button variant="primary">Get started</Button>
      </Stack>
    </Section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
```

`src/vite-env.d.ts` (without it, TypeScript rejects the CSS imports):

```ts
/// <reference types="vite/client" />
```

`vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx", "moduleResolution": "bundler", "strict": true, "skipLibCheck": true, "noEmit": true
  },
  "include": ["src"]
}
```

Add `node_modules/` and `dist/` to `.gitignore`. Then `npm run dev` serves it and `npm run build` type-checks and bundles.

## Next.js, App Router

Let Next scaffold itself, then add Dovetail:

```sh
npx create-next-app@latest my-app --typescript --app --no-tailwind --eslint --src-dir --import-alias "@/*"
cd my-app
npm install @dovetail-ds/react
```

`react` and `react-dom` are already in its `package.json`. Wire the stylesheets in `src/app/layout.tsx` per `wiring.md`, and put the starter page in `src/app/page.tsx` using the same components as above. Dovetail's interactive components carry `"use client"`, so the page itself can stay a server component.

## Either way

Once the scaffold installs, go back to the theme steps. The theme file lands at `src/styles/dovetail-theme.css` (Vite) or `src/app/dovetail-theme.css` (Next), and the imports above already expect it there.
