import React from "react";

export function Tabs({ tabs = [], value, onChange, label, variant = "underline", style, ...rest }) {
  const refs = React.useRef([]);
  function onKeyDown(e) {
    const i = tabs.findIndex(t => t.id === value);
    let next = null;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange && onChange(tabs[next].id);
    refs.current[next] && refs.current[next].focus();
  }
  const pill = variant === "pill";
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{
        display: "flex", gap: pill ? "var(--dt-space-inline-2xs)" : "var(--dt-space-inline-md)",
        borderBottom: pill ? "none" : "var(--dt-border-width-default) solid var(--dt-border-subtle)",
        background: pill ? "var(--dt-surface-sunken)" : "transparent",
        padding: pill ? "var(--dt-space-inset-2xs, 4px)" : 0,
        borderRadius: pill ? "var(--dt-radius-control)" : 0,
        overflowX: "auto", ...style,
      }}
      {...rest}
    >
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={el => (refs.current[i] = el)}
            role="tab"
            type="button"
            id={"tab-" + t.id}
            aria-selected={on}
            aria-controls={"panel-" + t.id}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange && onChange(t.id)}
            style={{
              appearance: "none", border: "none", cursor: t.disabled ? "not-allowed" : "pointer",
              background: pill && on ? "var(--dt-surface-raised)" : "transparent",
              padding: pill ? "var(--dt-space-inset-xs) var(--dt-space-inset-sm)" : "var(--dt-space-inset-xs) 0 calc(var(--dt-space-inset-xs) + 1px)",
              marginBottom: pill ? 0 : "calc(-1 * var(--dt-border-width-default))",
              borderBottom: pill ? "none" : `2px solid ${on ? "var(--dt-border-selected)" : "transparent"}`,
              borderRadius: pill ? "var(--dt-radius-control)" : 0,
              boxShadow: pill && on ? "var(--dt-elevation-1)" : "none",
              fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
              fontWeight: "var(--dt-font-weight-medium)", whiteSpace: "nowrap",
              color: t.disabled ? "var(--dt-text-disabled)" : on ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
              display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)",
              transition: "color var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
            }}
          >
            {t.icon}{t.label}
            {t.count != null && (
              <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "var(--dt-text-label-sm-size)", color: "var(--dt-text-tertiary)" }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, value, children, style, ...rest }) {
  if (id !== value) return null;
  return <div role="tabpanel" id={"panel-" + id} aria-labelledby={"tab-" + id} tabIndex={0} style={style} {...rest}>{children}</div>;
}
