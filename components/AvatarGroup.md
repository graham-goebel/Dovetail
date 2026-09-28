# AvatarGroup

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [AvatarGroup.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/AvatarGroup.jsx), [AvatarGroup.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/AvatarGroup.d.ts), [AvatarGroup.md](https://graham-goebel.github.io/Dovetail/system/components/display/AvatarGroup.md).

Live page: https://graham-goebel.github.io/Dovetail/components/AvatarGroup.html

## Guidelines

Shows who is involved without spending a full row per person. Use it for project members,
shared documents, and assignee columns.

### Rules

- `label` is required. Screen readers announce the group, not each overlapping image.
- Keep `max` at 3–5. Past that the overlap stops being readable and the +N chip carries
  no useful information.
- Order matters: put the most relevant people first. Do not sort alphabetically unless
  the list is a directory.
- Do not make individual avatars in a group clickable. If a person needs an action,
  use a List instead.

### Tradeoffs

Overlap saves horizontal space but hides parts of each face. In a directory or a picker
where identification matters more than density, use a List with full avatars.

## Props

```ts
import * as React from "react";
import { AvatarProps } from "./Avatar";

/** Overlapping row of avatars with a count for the remainder. */
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** People to show, in display order. */
  people: Array<Pick<AvatarProps, "name" | "src">>;
  /** How many avatars render before the +N chip. @default 4 */
  max?: number;
  /** @default "md" */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Accessible group label, e.g. "Project members". Required. */
  label: string;
}

export declare function AvatarGroup(props: AvatarGroupProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";
import { Avatar } from "./Avatar.jsx";

const SIZES = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 };

export function AvatarGroup({ people = [], max = 4, size = "md", label, style, ...rest }) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;
  const px = SIZES[size] || SIZES.md;
  return (
    <span role="group" aria-label={label} style={{ display: "inline-flex", alignItems: "center", ...style }} {...rest}>
      {shown.map((p, i) => (
        <span key={p.name + i} style={{ marginLeft: i === 0 ? 0 : -(px * 0.3), borderRadius: "var(--dt-radius-pill)", boxShadow: "0 0 0 2px var(--dt-surface-base)", display: "inline-flex" }}>
          <Avatar {...p} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span style={{
          marginLeft: -(px * 0.3), width: px, height: px, borderRadius: "var(--dt-radius-pill)",
          background: "var(--dt-surface-sunken)", color: "var(--dt-text-secondary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
          fontWeight: "var(--dt-font-weight-medium)", boxShadow: "0 0 0 2px var(--dt-surface-base)",
          border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
        }}>+{overflow}</span>
      )}
    </span>
  );
}
```
