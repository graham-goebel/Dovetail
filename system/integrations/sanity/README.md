# Sanity adapter

An adapter's only job is turning a CMS payload into the block array `BlockRenderer`
takes. This one is three files and no dependency on Dovetail itself.

| File | What it is |
| --- | --- |
| `schemas.js` | Schema objects whose fields are the components' prop names |
| `portable-text.js` | A component map for `@portabletext/react`, using the system's type roles |
| `groq.js` | Fragments that resolve a page's blocks into props |

## Wiring it up

```js
// sanity.config.js
import { dovetailSchemas } from "./integrations/sanity/schemas";

export default defineConfig({
  schema: { types: [...dovetailSchemas, ...yourSchemas] },
});
```

```jsx
// the page
import { pageQuery } from "./integrations/sanity/groq";

const page = await client.fetch(pageQuery, { slug });

<BlockRenderer blocks={page.blocks} registry={registry} />
```

The registry is yours: map each `_type` to the component you want it to render. Nothing
in this folder imports a Dovetail component, so the two stay independent.

## What this does not do

**The schemas are written by hand.** They mirror the `.d.ts` contracts, and nothing
checks that they still do. Change a component's props and change the schema in the same
commit. Generating them from the types is the next thing to build here.

**Only the content-shaped components have schemas.** Card, Media, Quote, Callout,
Accordion, Figure and Prose. A button is not a content type; it is a prop on one.

**Images resolve to a URL and an alt string.** If you need Sanity's hotspot and crop, add
the fields to `imageFragment` and read them in your own registry entry. `Image` takes a
`position`, which is where a hotspot lands.
