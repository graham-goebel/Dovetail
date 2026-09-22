# Headless integration

Dovetail components take content as props. They never fetch, never import a CMS client,
and never assume a shape beyond their own prop contract. That is what lets the same
component render from React state, Sanity, Contentful, or a JSON file on disk.

Three layers, from most generic to most specific.

## 1. Components are content-agnostic

```jsx
<Card
  eyebrow="Changelog"
  title="Dovetail 1.0"
  body="Token architecture, two demo themes, and the first component set."
  action={{ label: "Read the notes", href: "/changelog" }}
/>
```

No component holds copy. No component knows where its copy came from. If you find
yourself writing `if (source === 'sanity')` inside a component, the coupling is in the
wrong place.

**Rich text** goes through `Prose`, which accepts either an HTML string or a portable-text
style node array. Everything else (headings, links, lists, code) is rendered with
Dovetail's own type roles, so CMS-authored content matches hand-built pages.

## 2. BlockRenderer maps data to components

The layer that makes any headless source work. Give it an array of blocks and a registry.

```jsx
const registry = { hero: Hero, cardGrid: CardGrid, prose: Prose, cta: CTASection };

<BlockRenderer blocks={page.blocks} registry={registry} />
```

Each block is `{ _type, _key, ...props }`. `BlockRenderer` looks up `_type` in the
registry and spreads the rest as props. An unknown `_type` renders nothing in production
and a visible warning in development: a missing block should be loud in review and silent
for the user.

This is the whole integration surface. Sanity, Contentful, Storyblok, Payload, and a static
JSON file all produce the same array shape once their client has resolved.

## 3. Adapters

An adapter's only job is turning a CMS payload into that array. It lives in
`integrations/<source>/`, never inside a component.

### Sanity

`integrations/sanity/` ships:

- **Schema definitions** whose field names are the component prop names, so a `card`
  document in Sanity Studio produces exactly the props `Card` expects. They are written
  by hand today and nothing checks them against the `.d.ts` files, so a prop change and
  a schema change belong in the same commit. Generating them from the types is the next
  thing to build here.
- **A PortableText serializer** mapping Sanity's block types to Dovetail components:
  `h2` to a `heading-md` role, `code` to `Code`, `blockquote` to `Quote`.
- **GROQ fragments** for the common queries.

```js
import { dovetailSchemas } from "./integrations/sanity/schemas";

export default defineConfig({
  schema: { types: [...dovetailSchemas, ...yourSchemas] },
});
```

### Anything else

Write a function that returns the block array. That is the entire contract.

```js
export function toBlocks(contentfulEntry) {
  return contentfulEntry.fields.sections.map((s) => ({
    _type: s.sys.contentType.sys.id,
    _key: s.sys.id,
    ...s.fields,
  }));
}
```

## Why this order matters

The temptation is to build the Sanity integration first and generalise later. That
produces components with Sanity's data model baked in, and the second CMS becomes a
rewrite.

Building the generic renderer first costs one extra indirection and makes every subsequent
source a small adapter file.

## Server components and rendering

Dovetail components are presentational. Most have no state and work unchanged as React
Server Components. The ones that need interactivity, such as Dialog, Combobox, Tabs and Toast,
are marked in their `.md` files and need a client boundary.

Styling is CSS custom properties, not runtime CSS-in-JS, so there is no style hydration
step and no flash of unstyled content.
