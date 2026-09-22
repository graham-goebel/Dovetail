import React from "react";
import { AspectRatio } from "./AspectRatio.jsx";
import { UploadFrame } from "./Image.jsx";

const RADII = { none: "0", media: "var(--dt-radius-media)", container: "var(--dt-radius-container)", pill: "var(--dt-radius-pill)" };

const ALIGN = { top: "flex-start", center: "center", bottom: "flex-end" };
const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end" };
const TEXT_ALIGN = { start: "left", center: "center", end: "right" };

const PLACEHOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "var(--dt-size-icon-lg)", height: "var(--dt-size-icon-lg)" }} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

/* Which way a gradient scrim fades. It always fades toward the edge the
   content is anchored to, so the darkest part of the image sits behind the
   text and the rest is left alone. Centre gets a flat wash rather than a
   direction: text in the middle of a photo needs the whole frame dimmed, not
   one edge of it. */
function scrimImage(scrim, align) {
  if (scrim === "none") return "none";
  if (scrim === "solid" || align === "center") return "var(--dt-surface-scrim)";
  const to = align === "bottom" ? "to top" : "to bottom";
  return `linear-gradient(${to}, var(--dt-surface-scrim), transparent 65%)`;
}

export function Cover({
  src,
  alt,
  ratio = "4:3",
  fit = "cover",
  radius = "media",
  placeholder,
  onFile,
  scrim = "gradient",
  align = "bottom",
  justify = "start",
  eyebrow,
  title,
  body,
  actions,
  style,
  ...rest
}) {
  const frame = { position: "relative", background: "var(--dt-surface-sunken)", borderRadius: RADII[radius] || RADII.media, ...style };
  const hasContent = eyebrow || title || body || actions;

  return (
    <AspectRatio ratio={ratio} style={frame} {...rest}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, display: "block" }} />
      ) : (
        <UploadFrame icon={PLACEHOLDER_ICON} label={placeholder || alt || "Cover image"} hint="Drop an image, or choose a file" accept="image/*" onFile={onFile} quiet={!!hasContent} />
      )}

      {/* The scrim and the text preview even before src arrives: the caption's
         weight is part of what a template is checking before the photo is
         wired in, the same reason Image's own placeholder reserves the ratio
         rather than collapsing to nothing. */}
      {scrim !== "none" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: scrimImage(scrim, align), borderRadius: "inherit" }} />
      )}

      {hasContent && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: ALIGN[align] || ALIGN.bottom,
            alignItems: JUSTIFY[justify] || JUSTIFY.start,
            textAlign: TEXT_ALIGN[justify] || TEXT_ALIGN.start,
            gap: "var(--dt-space-stack-xs)",
            padding: "var(--dt-space-inset-lg)",
            boxSizing: "border-box",
          }}
        >
          {eyebrow && (
            <span style={{ fontFamily: "var(--dt-text-eyebrow-family)", fontSize: "var(--dt-text-eyebrow-size)", letterSpacing: "var(--dt-text-eyebrow-tracking)", fontWeight: "var(--dt-text-eyebrow-weight)", textTransform: "uppercase", color: "var(--dt-text-inverse)" }}>
              {eyebrow}
            </span>
          )}
          {title && (
            <h2 style={{ margin: 0, maxWidth: "40ch", fontFamily: "var(--dt-text-heading-lg-family)", fontSize: "var(--dt-text-heading-lg-size)", lineHeight: "var(--dt-text-heading-lg-line)", fontWeight: "var(--dt-text-heading-lg-weight)", letterSpacing: "var(--dt-text-heading-lg-tracking)", color: "var(--dt-text-inverse)", textWrap: "pretty" }}>
              {title}
            </h2>
          )}
          {body && (
            <div style={{ maxWidth: "48ch", fontFamily: "var(--dt-text-body-md-family)", fontSize: "var(--dt-text-body-md-size)", lineHeight: "var(--dt-text-body-md-line)", color: "var(--dt-text-inverse)", opacity: 0.9, textWrap: "pretty" }}>
              {body}
            </div>
          )}
          {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-sm)", justifyContent: JUSTIFY[justify] || JUSTIFY.start }}>{actions}</div>}
        </div>
      )}
    </AspectRatio>
  );
}
