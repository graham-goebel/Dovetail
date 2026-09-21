import React from "react";
import { AspectRatio } from "./AspectRatio.jsx";

const RADII = { none: "0", media: "var(--dt-radius-media)", container: "var(--dt-radius-container)", pill: "var(--dt-radius-pill)" };

export function Image({ src, alt, ratio = "16:9", fit = "cover", position = "center", radius = "media", loading = "lazy", placeholder, style, ...rest }) {
  const frame = { background: "var(--dt-surface-sunken)", borderRadius: RADII[radius] || RADII.media, ...style };
  if (!src) {
    return (
      <AspectRatio ratio={ratio} style={frame} {...rest}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--dt-space-inset-md)", textAlign: "center", font: "var(--dt-text-label-sm-font)", fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-font-size-xs)", color: "var(--dt-text-tertiary)", border: "var(--dt-border-width-hair) dashed var(--dt-border-subtle)", borderRadius: "inherit", boxSizing: "border-box" }}>
          {placeholder || alt || "Image"}
        </div>
      </AspectRatio>
    );
  }
  return (
    <AspectRatio ratio={ratio} style={frame} {...rest}>
      <img src={src} alt={alt} loading={loading} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, objectPosition: position, display: "block" }} />
    </AspectRatio>
  );
}
