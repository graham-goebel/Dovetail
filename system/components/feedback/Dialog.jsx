import React from "react";

export function Dialog({ open, onClose, title, description, footer, size = "md", children }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: "var(--dt-z-dialog)",
        background: "var(--dt-dialog-scrim)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--dt-space-inset-lg)",
      }}
    >
      <div
        role="dialog" aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          display: "flex", flexDirection: "column", gap: "var(--dt-dialog-gap)",
          width: `var(--dt-dialog-width-${size})`, maxWidth: "100%",
          maxHeight: "var(--dt-dialog-max-height)", overflowY: "auto",
          background: "var(--dt-dialog-bg)", color: "var(--dt-dialog-fg)",
          border: "var(--dt-dialog-border-width) solid var(--dt-dialog-border-color)",
          borderRadius: "var(--dt-dialog-radius)",
          padding: "var(--dt-dialog-padding)",
          boxShadow: "var(--dt-dialog-elevation)",
        }}
      >
        <button
          type="button" aria-label="Close" onClick={onClose}
          style={{
            position: "absolute", top: "var(--dt-space-inset-md)", right: "var(--dt-space-inset-md)",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "var(--dt-size-control-sm)", height: "var(--dt-size-control-sm)",
            padding: 0, border: 0, borderRadius: "var(--dt-radius-control)",
            background: "none", color: "var(--dt-text-secondary)", cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
        {title && (
          <h2 style={{
            margin: 0, paddingRight: "var(--dt-space-inset-xl)",
            fontFamily: "var(--dt-text-heading-md-family)", fontSize: "var(--dt-text-heading-md-size)",
            lineHeight: "var(--dt-text-heading-md-line)", fontWeight: "var(--dt-text-heading-md-weight)",
            letterSpacing: "var(--dt-text-heading-md-tracking)",
          }}>{title}</h2>
        )}
        {description && (
          <p style={{ margin: 0, fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>{description}</p>
        )}
        {children}
        {footer && <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", justifyContent: "flex-end", marginTop: "var(--dt-space-stack-xs)" }}>{footer}</div>}
      </div>
    </div>
  );
}
