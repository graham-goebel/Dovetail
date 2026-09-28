# Avatar

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Display family. Files: [Avatar.jsx](https://graham-goebel.github.io/Dovetail/system/components/display/Avatar.jsx), [Avatar.d.ts](https://graham-goebel.github.io/Dovetail/system/components/display/Avatar.d.ts), [Avatar.md](https://graham-goebel.github.io/Dovetail/system/components/display/Avatar.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Avatar.html

## Guidelines

Identifies a person or entity at a glance. Use it in lists, tables, comment threads, and
account menus, anywhere a name alone reads slower than a face.

### Rules

- `name` is required even when `src` is set. It is the image alt text and the initials
  fallback. An avatar with no name is unlabelled to a screen reader.
- Use `xs` and `sm` inside dense rows, `md` as the default, `lg` and `xl` for profile
  headers only.
- `status` is presence, not role or state. Do not repurpose it as a notification dot;
  use Badge for that.
- Square avatars are for organisations and workspaces. Circles are for people.

### Tradeoffs

Initials collide often in large directories. If your data set has many shared initials,
supply images or add a secondary identifier next to the avatar.

## Props

```ts
import * as React from "react";

/** Person or entity thumbnail. Falls back to initials when no image is supplied. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name. Required — it is the accessible label and the initials source. */
  name: string;
  /** Image URL. When absent, initials render instead. */
  src?: string;
  /** @default "md" */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** @default "circle" */
  shape?: "circle" | "square";
  /** Presence indicator in the lower-right corner. */
  status?: "online" | "busy" | "away" | "offline";
}

export declare function Avatar(props: AvatarProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-strong` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-danger` | semantic | `var(--dt-color-red-600)` |
| `--dt-surface-success` | semantic | `var(--dt-color-green-600)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-warning` | semantic | `var(--dt-color-amber-500)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-border-width-thick` | none | not declared |

## Source

```jsx
import React from "react";

const SIZES = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 };
const TEXT = { xs: "var(--dt-text-label-sm-size)", sm: "var(--dt-text-label-sm-size)", md: "var(--dt-text-label-md-size)", lg: "var(--dt-text-label-lg-size)", xl: "var(--dt-text-heading-xs-size)" };

function initials(name) {
  if (!name) return "";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export function Avatar({ name, src, size = "md", shape = "circle", status, style, ...rest }) {
  const px = SIZES[size] || SIZES.md;
  const statusColor = { online: "var(--dt-surface-success)", busy: "var(--dt-surface-danger)", away: "var(--dt-surface-warning)", offline: "var(--dt-border-strong)" }[status];
  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "none", ...style }} {...rest}>
      <span
        aria-label={src ? undefined : name}
        role={src ? undefined : "img"}
        style={{
          width: px, height: px, borderRadius: shape === "circle" ? "var(--dt-radius-pill)" : "var(--dt-radius-control)",
          background: "var(--dt-surface-sunken)", color: "var(--dt-text-secondary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          fontFamily: "var(--dt-text-label-md-family)", fontSize: TEXT[size], fontWeight: "var(--dt-font-weight-medium)",
          border: "var(--dt-border-width-default) solid var(--dt-border-subtle)", userSelect: "none",
        }}
      >
        {src ? <img src={src} alt={name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
      </span>
      {status && (
        <span aria-label={status} role="img" style={{
          position: "absolute", right: -1, bottom: -1, width: Math.max(6, px * 0.28), height: Math.max(6, px * 0.28),
          borderRadius: "var(--dt-radius-pill)", background: statusColor,
          border: "var(--dt-border-width-thick, 2px) solid var(--dt-surface-base)",
        }} />
      )}
    </span>
  );
}
```
