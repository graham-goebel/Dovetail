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
