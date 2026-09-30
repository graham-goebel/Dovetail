# VisuallyHidden

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Primitives family. Files: [VisuallyHidden.jsx](https://graham-goebel.github.io/Dovetail/system/components/primitives/VisuallyHidden.jsx), [VisuallyHidden.d.ts](https://graham-goebel.github.io/Dovetail/system/components/primitives/VisuallyHidden.d.ts), [VisuallyHidden.md](https://graham-goebel.github.io/Dovetail/system/components/primitives/VisuallyHidden.md).

Live page: https://graham-goebel.github.io/Dovetail/components/VisuallyHidden.html

## Guidelines

Text that screen readers announce and sighted users never see.

### Use it when
- A heading is needed for document structure but would be visual noise.
- A table's action column needs a header.
- Live-region status text accompanies a purely visual change.

### Don't use it when
- You want to hide something from everyone. Use `display: none`.
- An icon-only button needs a name. Those take a required `label` prop already.

### Example
```jsx
<VisuallyHidden as="h2">Account settings</VisuallyHidden>
```

### Accessibility
Uses the clip-path technique rather than `display: none` or zero dimensions, both of which remove content from the accessibility tree.

## Props

```ts
import * as React from "react";

/** Content available to screen readers but not shown. Never use it to hide something from everyone. */
export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLElement> {
  /** @default "span" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function VisuallyHidden(props: VisuallyHiddenProps): React.JSX.Element;
```

## Source

```jsx
import React from "react";

export function VisuallyHidden({ as: Tag = "span", children, ...rest }) {
  return (
    <Tag
      style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```
