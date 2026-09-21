import React from "react";

export function Popover({ trigger, children, open: controlled, onOpenChange, placement = "bottom-start", label, width = 260, style, ...rest }) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlled != null ? controlled : uncontrolled;
  const setOpen = v => { if (controlled == null) setUncontrolled(v); onOpenChange && onOpenChange(v); };
  const wrap = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = e => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const pos = {
    "bottom-start": { top: "calc(100% + 6px)", left: 0 },
    "bottom-end": { top: "calc(100% + 6px)", right: 0 },
    "top-start": { bottom: "calc(100% + 6px)", left: 0 },
    "top-end": { bottom: "calc(100% + 6px)", right: 0 },
  }[placement];
  return (
    <span ref={wrap} style={{ position: "relative", display: "inline-flex", ...style }} {...rest}>
      {React.isValidElement(trigger)
        ? React.cloneElement(trigger, { onClick: e => { trigger.props.onClick && trigger.props.onClick(e); setOpen(!open); }, "aria-expanded": open, "aria-haspopup": "dialog" })
        : trigger}
      {open && (
        <div role="dialog" aria-label={label} style={{
          position: "absolute", ...pos, zIndex: 30, width, boxSizing: "border-box",
          background: "var(--dt-surface-raised)", color: "var(--dt-text-primary)",
          border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
          borderRadius: "var(--dt-radius-overlay)", boxShadow: "var(--dt-elevation-3)",
          padding: "var(--dt-space-inset-md)",
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)",
        }}>{children}</div>
      )}
    </span>
  );
}
