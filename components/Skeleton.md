# Skeleton

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Skeleton.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Skeleton.jsx), [Skeleton.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Skeleton.d.ts), [Skeleton.md](https://graham-goebel.github.io/Dovetail/system/components/display/Skeleton.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Skeleton.html

## Guidelines

Holds the shape of content that is still loading, so the layout does not jump when data
arrives.

### Rules

- Match the real content's dimensions. A skeleton that is the wrong size causes the
  reflow it exists to prevent.
- Skeletons are `aria-hidden`. Announce loading state on the container with
  `aria-busy`. A screen reader user gains nothing from grey rectangles.
- Use skeletons for content-shaped waits over roughly 300ms. Use Spinner for actions
  and indeterminate waits with no known shape.
- Do not skeleton an entire page. Show the chrome that is already known and skeleton
  only the parts that depend on the request.

### Tradeoffs

Skeletons make a wait feel shorter but a failed request feel longer, because the promise
of content never resolves. Pair every skeleton with an error state.

## Props

```ts
import * as React from "react";

/** Placeholder shape shown while content loads. */
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "text" */
  variant?: "text" | "rect" | "circle";
  width?: number | string;
  height?: number | string;
  /** Number of text lines. The last line is shortened. @default 1 */
  lines?: number;
  /** Override the variant's corner radius. */
  radius?: string;
}

export declare function Skeleton(props: SkeletonProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-6)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-motion-duration-slower` | none | not declared |
| `--dt-motion-easing-standard` | none | not declared |

## Source

```jsx
import React from "react";

export function Skeleton({ variant = "text", width, height, lines = 1, radius, style, ...rest }) {
  const base = {
    background: "var(--dt-surface-sunken)",
    borderRadius: radius || (variant === "circle" ? "var(--dt-radius-pill)" : variant === "text" ? "var(--dt-radius-control)" : "var(--dt-radius-container)"),
    animation: "dt-skeleton-pulse var(--dt-motion-duration-slower, 1400ms) var(--dt-motion-easing-standard) infinite",
  };
  if (variant === "text") {
    return (
      <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", width: width || "100%", ...style }} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} style={{ ...base, display: "block", height: height || "0.85em", width: i === lines - 1 && lines > 1 ? "62%" : "100%" }} />
        ))}
      </span>
    );
  }
  return <span aria-hidden="true" style={{ ...base, display: "block", width: width || (variant === "circle" ? 32 : "100%"), height: height || (variant === "circle" ? 32 : 80), ...style }} {...rest} />;
}
```
