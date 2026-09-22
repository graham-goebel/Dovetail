# BlockRenderer

Renders an array of content blocks through a registry of components. This is the whole
integration surface for a headless source: Sanity, Contentful, Storyblok, Payload and a
JSON file on disk all produce the same array once their client has resolved.

## Use it when
- A page's structure comes from content rather than from code.

## Don't use it when
- The page is a fixed composition. Write the JSX; an indirection that never varies is
  just harder to read.

## Example
```jsx
const registry = { hero: Hero, cardGrid: CardGrid, prose: Prose, cta: CTASection };

<BlockRenderer blocks={page.blocks} registry={registry} />
```

Each block is `{ _type, _key, ...props }`. The `_type` is looked up in the registry and
the rest is spread as props, so a block's shape is the component's prop contract and
nothing else.

## Unknown types
A `_type` with no component renders a visible warning when `debug` is on, and nothing when
it is off: loud in review, silent for the reader. `debug` defaults to true under a
non-production `NODE_ENV` and false when there is no bundler to tell it apart, so a plain
script tag in a browser stays quiet. Pass `onUnknown` to report the miss either way.

## Composition
Keep the registry outside the component that renders it, so it is one object rather than
one per render. Registry values are ordinary components: Dovetail components, your own
compositions, or a mix.

## Accessibility
BlockRenderer adds no markup of its own; it returns a fragment. Whatever the blocks
render is the whole output, so heading order is the content's responsibility.

## Tradeoffs
An unknown block is the price of letting content drive structure. Keeping the registry
small and reviewed is cheaper than a renderer that guesses.
