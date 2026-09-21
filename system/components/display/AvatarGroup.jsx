import React from "react";
import { Avatar } from "./Avatar.jsx";

const SIZES = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 };

export function AvatarGroup({ people = [], max = 4, size = "md", label, style, ...rest }) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;
  const px = SIZES[size] || SIZES.md;
  return (
    <span role="group" aria-label={label} style={{ display: "inline-flex", alignItems: "center", ...style }} {...rest}>
      {shown.map((p, i) => (
        <span key={p.name + i} style={{ marginLeft: i === 0 ? 0 : -(px * 0.3), borderRadius: "var(--dt-radius-pill)", boxShadow: "0 0 0 2px var(--dt-surface-base)", display: "inline-flex" }}>
          <Avatar {...p} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span style={{
          marginLeft: -(px * 0.3), width: px, height: px, borderRadius: "var(--dt-radius-pill)",
          background: "var(--dt-surface-sunken)", color: "var(--dt-text-secondary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
          fontWeight: "var(--dt-font-weight-medium)", boxShadow: "0 0 0 2px var(--dt-surface-base)",
          border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
        }}>+{overflow}</span>
      )}
    </span>
  );
}
