# AppShell

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Navigation family. Files: [AppShell.jsx](https://graham-goebel.github.io/Dovetail/system/components/navigation/AppShell.jsx), [AppShell.d.ts](https://graham-goebel.github.io/Dovetail/system/components/navigation/AppShell.d.ts), [AppShell.md](https://graham-goebel.github.io/Dovetail/system/components/navigation/AppShell.md).

Live page: https://graham-goebel.github.io/Dovetail/components/AppShell.html

## Guidelines

The frame of a phone app: a top bar, a body that scrolls, and a bottom navigation. It honours the device's safe areas on every side, so nothing sits under the notch, the home indicator or a rounded corner in landscape.

### Use it when
- Building a phone app screen, or a mobile web app meant to feel like one.
- Showing an app screen inside a device frame, a dialog or a docs card: `scroll="contained"`.

### Don't use it when
- It is a website. Use `Navbar` and `Section`.
- It is a desktop product. Use `Sidebar` and a page layout.

### Example
```jsx
<AppShell
  title="Today"
  leading={<Avatar name="Ada Lovelace" size="sm" />}
  trailing={<IconButton label="Notifications"><BellIcon /></IconButton>}
  bottomNav={<BottomNav items={tabs} current={tab} onNavigate={setTab} />}
>
  <Stack gap="md" style={{ padding: "var(--dt-space-inset-md)" }}>…</Stack>
</AppShell>
```

### How it scrolls
The bars are sticky inside whatever scrolls. With `scroll="page"`, the default, the document scrolls, which lets a phone browser collapse its own bars; the shell is at least the screen's height. With `scroll="contained"` the shell fills its parent and scrolls itself. Either way content scrolls beneath glass bars, which is why they are translucent by default. Pass `translucent={false}` for solid bars.

### Immersive screens
`backdrop` takes a layer that stays put behind everything: a photograph, a gradient, an illustration. Pair it with `dark` to scope dark mode to the app, `BottomNav variant="floating"`, and `Card surface="glass-inverse"` for cards that stay readable over the picture. Measure text against the real image, as `guidelines/accessibility.md` describes.

### Tokens
`--dt-appshell-*` (Tier 3): the bar height, surface and border, the shell background, and the phone width. The bars read `--dt-surface-glass` and `--dt-backdrop-glass`.

## Props

```ts
import * as React from "react";

/**
 * The frame of a phone app: a top bar, a body that scrolls, and a bottom
 * navigation, with the device's safe areas honoured on every side.
 */
export interface AppShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Title in the default top bar, set in the heading-xs role and the headline colour. */
  title?: React.ReactNode;
  /** Left slot of the default top bar: a back button, an avatar. */
  leading?: React.ReactNode;
  /** Right slot of the default top bar: one or two IconButtons. */
  trailing?: React.ReactNode;
  /** Replaces the default top bar entirely. Pass null for no top bar. */
  header?: React.ReactNode;
  /** Usually a BottomNav. Sticky to the bottom of whatever scrolls. */
  bottomNav?: React.ReactNode;
  /** A layer behind everything that does not scroll: a photograph, a gradient, an illustration. */
  backdrop?: React.ReactNode;
  /**
   * page: the document scrolls and the shell is at least the screen's height,
   * the right choice for a real app so the browser's own bars collapse.
   * contained: the shell fills its parent and scrolls itself, for a device
   * frame, a dialog or a docs card. @default "page"
   */
  scroll?: "page" | "contained";
  /** phone centres the shell at --dt-appshell-max-width on a wide screen. @default "full" */
  width?: "full" | "phone";
  /** Glass bars that content scrolls beneath. Off gives solid bars. @default true */
  translucent?: boolean;
  /** Scopes dark mode to the app, whatever the page is doing. */
  dark?: boolean;
  children?: React.ReactNode;
}

export declare function AppShell(props: AppShellProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-appshell-bar-bg` | component | `var(--dt-surface-glass)` |
| `--dt-appshell-bar-border` | component | `var(--dt-border-glass)` |
| `--dt-appshell-bar-height` | component | `var(--dt-dim-14)` |
| `--dt-appshell-bg` | component | `var(--dt-surface-base)` |
| `--dt-appshell-max-width` | component | `var(--dt-dim-container-sm)` |
| `--dt-backdrop-glass` | semantic | `saturate(1.6) blur(var(--dt-blur-glass))` |
| `--dt-border-glass` | semantic | `color-mix(in oklab, var(--dt-text-primary) 10%, transparent)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-glass` | semantic | `color-mix(in oklab, var(--dt-surface-overlay) 72%, transparent)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-z-sticky` | semantic | `100` |
| `--dt-dim-14` | primitive | `56px` |
| `--dt-dim-container-sm` | primitive | `640px` |

## Source

```jsx
import React from "react";

const GLASS = "var(--dt-backdrop-glass, saturate(1.4) blur(16px))";

/* The default top bar: a leading slot, a title and a trailing slot, with the
   title centred on the bar rather than on the space between the slots. */
function TopBar({ title, leading, trailing, translucent }) {
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
        gap: "var(--dt-space-inline-sm)",
        minHeight: "var(--dt-appshell-bar-height, var(--dt-dim-14))",
        padding: "0 var(--dt-space-inset-sm)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        boxSizing: "content-box",
        background: translucent ? "var(--dt-appshell-bar-bg, var(--dt-surface-glass))" : "var(--dt-appshell-bg, var(--dt-surface-base))",
        backdropFilter: translucent ? GLASS : undefined,
        WebkitBackdropFilter: translucent ? GLASS : undefined,
        borderBottom: "var(--dt-border-width-default) solid var(--dt-appshell-bar-border, var(--dt-border-glass))",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", justifySelf: "start", minWidth: 0 }}>{leading}</span>
      <span
        style={{
          minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "var(--dt-text-heading-xs-family)", fontSize: "var(--dt-text-heading-xs-size)",
          lineHeight: "var(--dt-text-heading-xs-line)", fontWeight: "var(--dt-text-heading-xs-weight)",
          color: "var(--dt-text-headline, var(--dt-text-primary))",
        }}
      >
        {title}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", justifySelf: "end", minWidth: 0 }}>{trailing}</span>
    </div>
  );
}

export function AppShell({
  title,
  leading,
  trailing,
  header,
  bottomNav,
  backdrop,
  scroll = "page",
  width = "full",
  translucent = true,
  dark,
  className,
  children,
  style,
  ...rest
}) {
  const contained = scroll === "contained";
  const bar = header !== undefined ? header : title || leading || trailing ? <TopBar title={title} leading={leading} trailing={trailing} translucent={translucent} /> : null;

  /* Bars are sticky inside whatever scrolls: the document for a whole-page
     app, the shell itself when it is contained in a frame or a dialog. Either
     way content scrolls beneath them, which is what makes glass worth having. */
  const column = (
    <div
      style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        minHeight: contained ? "100%" : "100dvh",
        height: contained ? "100%" : undefined,
        overflowY: contained ? "auto" : undefined,
        overscrollBehavior: contained ? "contain" : undefined,
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        boxSizing: "border-box",
      }}
    >
      {bar && <header style={{ position: "sticky", top: 0, zIndex: "var(--dt-z-sticky)" }}>{bar}</header>}
      <main style={{ flex: 1, minWidth: 0, position: "relative" }}>{children}</main>
      {bottomNav && <footer style={{ position: "sticky", bottom: 0, zIndex: "var(--dt-z-sticky)" }}>{bottomNav}</footer>}
    </div>
  );

  return (
    <div
      className={[dark ? "dark" : null, className].filter(Boolean).join(" ") || undefined}
      style={{
        position: "relative",
        isolation: "isolate",
        width: "100%",
        maxWidth: width === "phone" ? "var(--dt-appshell-max-width, var(--dt-dim-container-sm))" : undefined,
        marginInline: width === "phone" ? "auto" : undefined,
        height: contained ? "100%" : undefined,
        overflow: contained ? "hidden" : undefined,
        background: "var(--dt-appshell-bg, var(--dt-surface-base))",
        color: "var(--dt-text-primary)",
        ...style,
      }}
      {...rest}
    >
      {backdrop && (
        <div aria-hidden="true" style={{ position: contained ? "absolute" : "fixed", inset: 0, zIndex: -1, overflow: "hidden" }}>
          {backdrop}
        </div>
      )}
      {column}
    </div>
  );
}
```
