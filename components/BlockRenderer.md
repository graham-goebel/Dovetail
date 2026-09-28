# BlockRenderer

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [BlockRenderer.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/BlockRenderer.jsx), [BlockRenderer.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/BlockRenderer.d.ts), [BlockRenderer.md](https://graham-goebel.github.io/Dovetail/system/components/content/BlockRenderer.md).

Live page: https://graham-goebel.github.io/Dovetail/components/BlockRenderer.html

## Guidelines

Renders an array of content blocks through a registry of components. This is the whole
integration surface for a headless source: Sanity, Contentful, Storyblok, Payload and a
JSON file on disk all produce the same array once their client has resolved.

### Use it when
- A page's structure comes from content rather than from code.

### Don't use it when
- The page is a fixed composition. Write the JSX; an indirection that never varies is
  just harder to read.

### Example
```jsx
const registry = { hero: Hero, cardGrid: CardGrid, prose: Prose, cta: CTASection };

<BlockRenderer blocks={page.blocks} registry={registry} />
```

Each block is `{ _type, _key, ...props }`. The `_type` is looked up in the registry and
the rest is spread as props, so a block's shape is the component's prop contract and
nothing else.

### Unknown types
A `_type` with no component renders a visible warning when `debug` is on, and nothing when
it is off: loud in review, silent for the reader. `debug` defaults to true under a
non-production `NODE_ENV` and false when there is no bundler to tell it apart, so a plain
script tag in a browser stays quiet. Pass `onUnknown` to report the miss either way.

### Composition
Keep the registry outside the component that renders it, so it is one object rather than
one per render. Registry values are ordinary components: Dovetail components, your own
compositions, or a mix.

### Accessibility
BlockRenderer adds no markup of its own; it returns a fragment. Whatever the blocks
render is the whole output, so heading order is the content's responsibility.

### Tradeoffs
An unknown block is the price of letting content drive structure. Keeping the registry
small and reviewed is cheaper than a renderer that guesses.

## Props

```ts
import * as React from "react";

export interface Block {
  /** Looked up in the registry. Everything else is spread onto the component. */
  _type: string;
  /** Stable key from the source. Falls back to the array index. */
  _key?: string;
  [prop: string]: any;
}

export type BlockRegistry = Record<string, React.ComponentType<any>>;

/** Maps an array of content blocks onto components. The whole integration surface for any headless source. */
export interface BlockRendererProps {
  blocks?: Block[];
  registry?: BlockRegistry;
  /** Show a visible warning for a `_type` with no component. Defaults to true under a non-production NODE_ENV, false otherwise. */
  debug?: boolean;
  /** Called for every unknown `_type`, whether or not the warning renders. Wire it to your error reporter. */
  onUnknown?: (type: string, block: Block) => void;
}

export declare function BlockRenderer(props: BlockRendererProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-danger` | semantic | `var(--dt-color-red-200)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-danger-subtle` | semantic | `var(--dt-color-red-050)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

/* The layer that makes any headless source work. A block is `{ _type, _key, ...props }`;
   the registry maps a `_type` to a component. Nothing here knows about a CMS, which is
   the point: an adapter turns a payload into this array and stops. */

export function BlockRenderer({ blocks = [], registry = {}, debug, onUnknown, ...rest }) {
  const loud = debug === undefined ? isDevelopment() : debug;

  return (
    <React.Fragment {...rest}>
      {blocks.map((block, i) => {
        if (!block || !block._type) return null;
        const { _type, _key, ...props } = block;
        const Component = registry[_type];

        if (!Component) {
          if (onUnknown) onUnknown(_type, block);
          /* A missing block is loud in review and silent for the reader: shipping a
             red box to production would be a worse failure than the missing block. */
          return loud ? <UnknownBlock key={_key || i} type={_type} /> : null;
        }

        return <Component key={_key || i} {...props} />;
      })}
    </React.Fragment>
  );
}

function isDevelopment() {
  try {
    return typeof process !== "undefined" && !!process.env && process.env.NODE_ENV !== "production";
  } catch (e) {
    /* No bundler, no process: a plain script tag in a browser. Stay quiet. */
    return false;
  }
}

function UnknownBlock({ type }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--dt-space-stack-2xs)",
        padding: "var(--dt-space-inset-md)",
        background: "var(--dt-surface-danger-subtle)",
        border: `var(--dt-border-width-default) dashed var(--dt-border-danger)`,
        borderRadius: "var(--dt-radius-container)",
        fontFamily: "var(--dt-text-body-sm-family)",
        fontSize: "var(--dt-text-body-sm-size)",
        lineHeight: "var(--dt-text-body-sm-line)",
        color: "var(--dt-text-danger)",
      }}
    >
      <strong style={{ fontWeight: "var(--dt-font-weight-semibold)" }}>No component for “{type}”</strong>
      <span style={{ color: "var(--dt-text-secondary)" }}>
        Add it to the registry you pass to BlockRenderer, or remove the block from the content.
      </span>
    </div>
  );
}
```
