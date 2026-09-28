# Link

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Actions family. Files: [Link.jsx](https://graham-goebel.github.io/Dovetail/system/components/actions/Link.jsx), [Link.d.ts](https://graham-goebel.github.io/Dovetail/system/components/actions/Link.d.ts), [Link.md](https://graham-goebel.github.io/Dovetail/system/components/actions/Link.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Link.html

## Guidelines

Navigation. The rule: if it changes the page, it is a Link; if it changes data, it is a Button.

### Use it when
- Navigating within the app or out to another site.

### Don't use it when
- It performs an action. Use `Button variant="ghost"`. A link that deletes something is a trap.

### Example
```jsx
<Link href="/settings">Account settings</Link>
<Link href="https://example.com" external>Read the spec</Link>
```

### Variants
`underline="always"` is the default and is correct inside prose, because colour alone is not a sufficient signal. `underline="hover"` is acceptable in navigation lists where position already marks the links.

### Accessibility
`external` adds `rel="noopener noreferrer"` and a visible icon, so a new tab is never a surprise.

### Content
Link text describes the destination. "Account settings", not "click here" or a bare URL.

## Props

```ts
import * as React from "react";

/** Navigation. If it changes the page, it is a Link; if it changes data, it is a Button. */
export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Opens in a new tab, adds rel="noopener noreferrer" and a visible indicator icon. */
  external?: boolean;
  /** "always" is correct for links in prose. @default "always" */
  underline?: "always" | "hover" | "never";
  /** "inherit" for links inside a coloured block where the primary colour would clash. @default "primary" */
  tone?: "primary" | "inherit";
  children?: React.ReactNode;
}

export declare function Link(props: LinkProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-neutral-700)` |

## Source

```jsx
import React from "react";

export function Link({ href, external = false, underline = "always", tone = "primary", children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const color = tone === "inherit" ? "inherit" : hover ? "var(--dt-text-link-hover)" : "var(--dt-text-link)";
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color,
        textDecoration: underline === "never" ? "none" : underline === "hover" ? (hover ? "underline" : "none") : "underline",
        textUnderlineOffset: 2,
        textDecorationThickness: hover ? 2 : 1,
        display: external ? "inline-flex" : undefined,
        alignItems: external ? "center" : undefined,
        gap: external ? "var(--dt-space-inline-2xs)" : undefined,
        transition: "color var(--dt-motion-micro)",
        ...style,
      }}
      {...rest}
    >
      {children}
      {external && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      )}
    </a>
  );
}
```
