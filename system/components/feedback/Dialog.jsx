import React from "react";

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* What a modal surface does while it is open: focus moves into the panel,
   Tab and Shift+Tab cycle inside it, Escape closes it, the page behind stops
   scrolling, and focus goes back where it came from on close. Drawer shares
   it; Sheet keeps its own copy, tied to its entry and exit animation. The
   panel needs tabIndex={-1} so it can take focus itself when it has no
   tabbable child. onClose is read through a ref, so a new inline callback on
   every render does not re-run the effect and bounce focus. */
export function useModalFocus(open, panel, onClose) {
  const close = React.useRef(onClose);
  React.useEffect(() => { close.current = onClose; });
  React.useEffect(() => {
    if (!open) return undefined;
    const el = panel.current;
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (el) el.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") { close.current && close.current(); return; }
      if (e.key !== "Tab" || !el) return;
      const items = Array.prototype.filter.call(el.querySelectorAll(TABBABLE), (n) => n.offsetParent !== null);
      if (!items.length) { e.preventDefault(); el.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = el.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (prev && prev.focus) prev.focus();
    };
  }, [open, panel]);
}

/* Glass: the dialog's surface let through, blurred, for a dialog over a
   picture or a busy screen. It re-points the dialog's own tokens, so every
   part of it follows. */
const GLASS = {
  glass: { "--dt-dialog-bg": "var(--dt-surface-glass)", "--dt-dialog-border-color": "var(--dt-border-glass)", backdropFilter: "var(--dt-backdrop-glass)", WebkitBackdropFilter: "var(--dt-backdrop-glass)" },
  "glass-strong": { "--dt-dialog-bg": "var(--dt-surface-glass-strong)", "--dt-dialog-border-color": "var(--dt-border-glass)", backdropFilter: "var(--dt-backdrop-glass)", WebkitBackdropFilter: "var(--dt-backdrop-glass)" },
};

export function Dialog({ open, onClose, title, description, footer, size = "md", surface = "raised", label, style, children, ...rest }) {
  const panel = React.useRef(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  useModalFocus(open, panel, onClose);

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
        {...rest}
        ref={panel}
        role="dialog" aria-modal="true" tabIndex={-1}
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? label : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(e) => { e.stopPropagation(); rest.onClick && rest.onClick(e); }}
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
          ...(GLASS[surface] || null),
          ...style,
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
          <h2 id={titleId} style={{
            margin: 0, paddingRight: "var(--dt-space-inset-xl)",
            fontFamily: "var(--dt-text-heading-md-family)", fontSize: "var(--dt-text-heading-md-size)",
            lineHeight: "var(--dt-text-heading-md-line)", fontWeight: "var(--dt-text-heading-md-weight)",
            letterSpacing: "var(--dt-text-heading-md-tracking)",
          }}>{title}</h2>
        )}
        {description && (
          <p id={descriptionId} style={{ margin: 0, fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>{description}</p>
        )}
        {children}
        {footer && <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", justifyContent: "flex-end", marginTop: "var(--dt-space-stack-xs)" }}>{footer}</div>}
      </div>
    </div>
  );
}
