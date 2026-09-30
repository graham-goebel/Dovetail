# AspectRatio

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [AspectRatio.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/AspectRatio.jsx), [AspectRatio.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/AspectRatio.d.ts), [AspectRatio.md](https://graham-goebel.github.io/Dovetail/system/components/content/AspectRatio.md).

Live page: https://graham-goebel.github.io/Dovetail/components/AspectRatio.html

## Guidelines

Reserves a fixed proportion of space before its content loads. Use it around every image, video, and map. Without it the page reflows when media arrives, which costs you layout stability and reads as a broken load.

### Ratios

The system ships seven. Pick by role, not by taste.

| Ratio | Use for |
|---|---|
| \`square\` | Avatars, product tiles, gallery grids |
| \`4:3\` | Editorial photography, screenshots |
| \`3:2\` | Standard camera output, blog headers |
| \`16:9\` | Video, hero imagery, cards. The default. |
| \`21:9\` | Full-bleed banners and page headers |
| \`3:4\` / \`9:16\` | Portrait and mobile-first placements |

A raw number is allowed for a one-off crop, but prefer a named ratio so a template stays consistent when its content changes.

### Rules

Give it a width; it derives its own height. Never set a height on an AspectRatio; that defeats the reservation. Children are absolutely positioned against it, so a single child with \`inset: 0\` fills it exactly. That is what \`Image\` does.

## Props

```ts
import * as React from "react";

/** Reserves a fixed proportion of space before its content loads, so media never shifts the layout. */
export interface AspectRatioProps extends React.HTMLAttributes<HTMLElement> {
  /** Named ratio from the system scale, or a raw width/height number. @default "16:9" */
  ratio?: "square" | "4:3" | "3:2" | "16:9" | "21:9" | "3:4" | "9:16" | number;
  /** Element to render. @default "div" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function AspectRatio(props: AspectRatioProps): React.JSX.Element;
```

## Source

```jsx
import React from "react";

const RATIOS = { square: 1, "4:3": 4 / 3, "3:2": 3 / 2, "16:9": 16 / 9, "21:9": 21 / 9, "3:4": 3 / 4, "9:16": 9 / 16 };

export function AspectRatio({ ratio = "16:9", as: Tag = "div", children, style, ...rest }) {
  const value = typeof ratio === "number" ? ratio : RATIOS[ratio] || RATIOS["16:9"];
  return (
    <Tag style={{ position: "relative", width: "100%", aspectRatio: String(value), overflow: "hidden", ...style }} {...rest}>
      {children}
    </Tag>
  );
}
```
