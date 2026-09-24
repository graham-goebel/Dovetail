import React from "react";

export function Drawer({ open, onClose, title, children, footer, side = "right", width = 380, label, style, ...rest }) {
  const panel = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === "Escape" && onClose && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement;
    panel.current && panel.current.focus();
    return () => { document.removeEventListener("keydown", onKey); prev && prev.focus && prev.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  const horizontal = side === "left" || side === "right";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--dt-z-overlay)", display: "flex", justifyContent: side === "right" ? "flex-end" : "flex-start", alignItems: side === "bottom" ? "flex-end" : "stretch" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--dt-surface-scrim, rgba(0,0,0,0.4))" }} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label || (typeof title === "string" ? title : undefined)}
        tabIndex={-1}
        style={{
          position: "relative", display: "flex", flexDirection: "column",
          width: horizontal ? width : "100%", height: horizontal ? "100%" : "auto",
          maxHeight: "100%", maxWidth: "100%", boxSizing: "border-box",
          background: "var(--dt-surface-raised)", color: "var(--dt-text-primary)",
          boxShadow: "var(--dt-elevation-4)",
          borderLeft: side === "right" ? "var(--dt-border-width-default) solid var(--dt-border-subtle)" : "none",
          borderRight: side === "left" ? "var(--dt-border-width-default) solid var(--dt-border-subtle)" : "none",
          borderTopLeftRadius: side === "bottom" ? "var(--dt-radius-overlay)" : 0,
          borderTopRightRadius: side === "bottom" ? "var(--dt-radius-overlay)" : 0,
          ...style,
        }}
        {...rest}
      >
        {title && (
          <header style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)",
            padding: "var(--dt-space-inset-md)", borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)", flex: "none",
          }}>
            <span style={{ fontFamily: "var(--dt-text-heading-xs-family)", fontSize: "var(--dt-text-heading-xs-size)", fontWeight: "var(--dt-font-weight-semibold)" }}>{title}</span>
            <button type="button" onClick={onClose} aria-label="Close" style={{
              appearance: "none", background: "transparent", border: "none", cursor: "pointer",
              color: "var(--dt-text-secondary)", fontSize: "var(--dt-text-body-lg-size)", lineHeight: 1,
              padding: "var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)",
            }}>×</button>
          </header>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--dt-space-inset-md)", fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)" }}>{children}</div>
        {footer && (
          <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--dt-space-inline-sm)", padding: "var(--dt-space-inset-md)", borderTop: "var(--dt-border-width-default) solid var(--dt-border-subtle)", flex: "none" }}>{footer}</footer>
        )}
      </div>
    </div>
  );
}
