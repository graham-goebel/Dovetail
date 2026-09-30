# Wiring Dovetail into an app

Three stylesheets, loaded once at the app's root, in this order:

1. `@dovetail-ds/react/fonts.css`, only if the theme uses Geist or Geist Mono (the build or check report says so).
2. `@dovetail-ds/react/styles.css`, the whole token stack and the component styles.
3. The theme file, which must come after `styles.css` so its overrides win.

Then load any Google Fonts URL the report gave, and decide how dark mode switches.

## Next.js, App Router

`app/layout.tsx`:

```tsx
import "@dovetail-ds/react/fonts.css"; // only if the report says so
import "@dovetail-ds/react/styles.css";
import "../src/styles/dovetail-theme.css"; // wherever you wrote it

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* only if the report gave a Google Fonts URL */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=..." />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Dovetail's interactive components ship with `"use client"`, and its layout and type components render on the server, so no wrapper is needed. `next/font` works too if the team prefers self-hosting. Give each font the exact family name the theme uses (for example `Inter`), or set `--dt-font-family-sans` to the `next/font` variable in the theme instead.

## Next.js, Pages Router

`pages/_app.tsx`: the same three imports at the top. The font `<link>` goes in `pages/_document.tsx` inside `<Head>`.

## Vite, Create React App, and other client apps

`src/main.tsx` (or `src/index.tsx`): the same three imports, before the app's own CSS so the app can still override. The font `<link>` goes in `index.html`'s `<head>`.

## Remix and React Router

`app/root.tsx`: import each stylesheet with `?url` and return them from `links()` in order. Include the Google Fonts URL as another `{ rel: "stylesheet", href }` entry.

## A plain HTML page

Use `<link rel="stylesheet">` tags in the same order, pointing at the files under `node_modules/@dovetail-ds/react/dist/` (or a CDN copy). The package README has an import-map recipe for the components.

## Dark mode

Dovetail's dark theme applies wherever the `dark` class is set:

- on `<html>` for the whole page;
- on any element (a `Section` has a `dark` prop) for one band inside a light page.

It does not follow the operating system on its own. To follow it, run this before the app paints (in `<head>`, or in Next's root layout as an inline `<script>`):

```html
<script>
  (function () {
    var m = window.matchMedia("(prefers-color-scheme: dark)");
    var set = function () { document.documentElement.classList.toggle("dark", m.matches); };
    set();
    m.addEventListener("change", set);
  })();
</script>
```

If the app already has a theme switch (next-themes, a settings toggle), point it at the `dark` class on `<html>` instead. next-themes does this with `attribute="class"`.

## After wiring

- Run the project's type check or build. A wrong CSS path fails there.
- Render a Dovetail `Button`. With `actions: "brand"` its background is the brand colour; with the default (`ink`) it's near-black in light mode and near-white in dark.
- If a component looks unstyled, `styles.css` isn't loaded. If it looks like default Dovetail, the theme is loading before `styles.css`, or not at all.
