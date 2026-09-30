# Spacer

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [Spacer.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/Spacer.jsx), [Spacer.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/Spacer.d.ts), [Spacer.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/Spacer.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Spacer.html

## Guidelines

Empty space as an element. It exists for one job: pushing siblings apart inside a flex container.

### Use it flexible, rarely fixed

With no \`size\`, Spacer absorbs the remaining space: the clean way to push a trailing action to the far end of a toolbar without \`margin-left: auto\` scattered through the markup.

\`\`\`jsx
<Inline align="center">
  <Heading>Members</Heading>
  <Spacer />
  <Button variant="primary">Invite</Button>
</Inline>
\`\`\`

A fixed \`size\` is almost always the wrong tool. If two children need a gap, set \`gap\` on the \`Stack\` or \`Inline\` that holds them; the container should own the rhythm, not a sibling wedged between them. Reach for a fixed Spacer only when one gap in a set genuinely differs and you do not want to split the container in two.

Spacer is \`aria-hidden\`. It never carries content.

## Props

```ts
import * as React from "react";

/** Flexible or fixed empty space inside a flex container. */
export interface SpacerProps extends React.HTMLAttributes<HTMLElement> {
  /** Fixed size from the space scale. Omit to absorb all remaining space. */
  size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** @default "vertical" */
  axis?: "vertical" | "horizontal";
}

export declare function Spacer(props: SpacerProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-stack-2xl` | semantic | `var(--dt-dim-16)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-xl` | semantic | `var(--dt-dim-10)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |

## Source

```jsx
import React from "react";

const SIZES = { "2xs": "var(--dt-space-stack-2xs)", xs: "var(--dt-space-stack-xs)", sm: "var(--dt-space-stack-sm)", md: "var(--dt-space-stack-md)", lg: "var(--dt-space-stack-lg)", xl: "var(--dt-space-stack-xl)", "2xl": "var(--dt-space-stack-2xl)" };

export function Spacer({ size, axis = "vertical", style, ...rest }) {
  if (size === undefined) {
    return <div aria-hidden="true" style={{ flex: 1, ...style }} {...rest} />;
  }
  const value = SIZES[size] || SIZES.md;
  return <div aria-hidden="true" style={{ flex: "none", width: axis === "horizontal" ? value : undefined, height: axis === "vertical" ? value : undefined, ...style }} {...rest} />;
}
```
