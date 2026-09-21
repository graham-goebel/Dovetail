import React from "react";

export function Tooltip({ content, children, placement = "top", delay = 200, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef(null);
  const id = React.useId();
  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), delay); };
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  React.useEffect(() => () => clearTimeout(timer.current), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const pos = {
    top: { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  }[placement];
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} {...rest}>
      {React.isValidElement(children) ? React.cloneElement(children, { "aria-describedby": open ? id : undefined }) : children}
      {open && (
        <span role="tooltip" id={id} style={{
          position: "absolute", ...pos, zIndex: 40, pointerEvents: "none",
          background: "var(--dt-surface-inverse)", color: "var(--dt-text-inverse)",
          padding: "var(--dt-space-inset-2xs, 4px) var(--dt-space-inset-xs)",
          borderRadius: "var(--dt-radius-control)", boxShadow: "var(--dt-elevation-2)",
          fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
          lineHeight: "var(--dt-text-body-xs-line)", whiteSpace: "nowrap", maxWidth: 260,
        }}>{content}</span>
      )}
    </span>
  );
}
