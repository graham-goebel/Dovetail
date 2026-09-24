import React from "react";

const GLASS = "var(--dt-backdrop-glass, saturate(1.4) blur(16px))";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

function NavBadge({ value }) {
  if (!value) return null;
  const dot = value === true;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute", top: dot ? 0 : -4, right: dot ? 0 : -8,
        minWidth: dot ? "var(--dt-dim-2)" : "var(--dt-dim-4)", height: dot ? "var(--dt-dim-2)" : "var(--dt-dim-4)",
        padding: dot ? 0 : "0 var(--dt-dim-1)", boxSizing: "border-box",
        borderRadius: "var(--dt-radius-pill)",
        background: "var(--dt-bottomnav-badge-bg, var(--dt-surface-danger))",
        color: "var(--dt-bottomnav-badge-fg, var(--dt-text-on-danger))",
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-font-size-2xs)", lineHeight: "var(--dt-dim-4)",
        fontWeight: "var(--dt-font-weight-semibold)", textAlign: "center",
      }}
    >
      {dot ? null : value > 99 ? "99+" : value}
    </span>
  );
}

export function BottomNav({ items = [], current, onNavigate, variant = "bar", translucent = true, action, label = "Main", style, ...rest }) {
  const floating = variant === "floating";
  const surface = translucent
    ? { background: "var(--dt-bottomnav-bg, var(--dt-surface-glass))", backdropFilter: GLASS, WebkitBackdropFilter: GLASS }
    : { background: "var(--dt-surface-overlay)" };

  const list = (
    <ul
      style={{
        listStyle: "none", margin: 0, flex: 1, minWidth: 0,
        display: "grid", gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
        padding: floating ? "var(--dt-space-inset-2xs)" : "var(--dt-space-inset-2xs) var(--dt-space-inset-xs)",
        ...(floating
          ? { ...surface, borderRadius: "var(--dt-radius-pill)", border: "var(--dt-border-width-default) solid var(--dt-bottomnav-border, var(--dt-border-glass))" }
          : null),
      }}
    >
      {items.map((item) => {
        const on = item.id === current;
        const Tag = item.href ? "a" : "button";
        const badgeText = item.badge === true ? ", new" : item.badge ? ", " + item.badge + " new" : "";
        return (
          <li key={item.id} style={{ display: "flex", minWidth: 0 }}>
            <Tag
              {...(item.href ? { href: item.href } : { type: "button" })}
              aria-current={on ? "page" : undefined}
              aria-label={typeof item.label === "string" ? item.label + badgeText : undefined}
              onClick={(e) => {
                if (!onNavigate) return;
                if (item.href) e.preventDefault();
                onNavigate(item.id);
              }}
              style={{
                flex: 1, minWidth: 0, minHeight: "var(--dt-size-touch-target, 44px)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "var(--dt-space-stack-2xs)", padding: "var(--dt-space-inset-2xs) 0",
                border: 0, borderRadius: floating ? "var(--dt-radius-pill)" : "var(--dt-radius-control)",
                background: floating && on ? "var(--dt-bottomnav-indicator-floating, var(--dt-surface-glass-tint))" : "transparent",
                color: on ? "var(--dt-bottomnav-fg-active, var(--dt-text-primary))" : "var(--dt-bottomnav-fg, var(--dt-text-secondary))",
                textDecoration: "none", cursor: "pointer", font: "inherit",
                transition: "color var(--dt-motion-micro), background var(--dt-motion-micro)",
              }}
            >
              <span
                style={{
                  position: "relative", display: "grid", placeItems: "center",
                  width: floating ? "var(--dt-size-icon-lg)" : "var(--dt-dim-14)", height: "var(--dt-dim-7)",
                  borderRadius: "var(--dt-radius-pill)",
                  background: !floating && on ? "var(--dt-bottomnav-indicator, var(--dt-surface-selected))" : "transparent",
                  transition: "background var(--dt-motion-micro)",
                }}
              >
                <span style={{ display: "grid", placeItems: "center", width: "var(--dt-size-icon-lg)", height: "var(--dt-size-icon-lg)" }}>{item.icon}</span>
                <NavBadge value={item.badge} />
              </span>
              <span
                style={{
                  maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
                  lineHeight: "var(--dt-text-label-sm-line)", fontWeight: on ? "var(--dt-font-weight-semibold)" : "var(--dt-text-label-sm-weight)",
                }}
              >
                {item.label}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );

  if (floating) {
    return (
      <nav
        aria-label={label}
        style={{
          display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
          padding: `var(--dt-space-inset-md) var(--dt-space-inset-md) calc(var(--dt-space-inset-md) + ${SAFE_BOTTOM})`,
          background: "var(--dt-scrim-fade-bottom, transparent)",
          ...style,
        }}
        {...rest}
      >
        {list}
        {action && <span style={{ flex: "none", display: "flex" }}>{action}</span>}
      </nav>
    );
  }

  return (
    <nav
      aria-label={label}
      style={{
        display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
        paddingBottom: SAFE_BOTTOM,
        borderTop: "var(--dt-border-width-default) solid var(--dt-bottomnav-border, var(--dt-border-glass))",
        ...surface,
        ...style,
      }}
      {...rest}
    >
      {list}
      {action && <span style={{ flex: "none", display: "flex", paddingRight: "var(--dt-space-inset-sm)" }}>{action}</span>}
    </nav>
  );
}
