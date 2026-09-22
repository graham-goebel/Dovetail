import React from "react";
import { AspectRatio } from "./AspectRatio.jsx";
import { UploadFrame } from "./Image.jsx";

const RADII = { none: "0", media: "var(--dt-radius-media)", container: "var(--dt-radius-container)", pill: "var(--dt-radius-pill)" };

const PLACEHOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "var(--dt-size-icon-lg)", height: "var(--dt-size-icon-lg)" }} aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m10 9 5 3-5 3Z" />
  </svg>
);

export function Video({ src, poster, label, ratio = "16:9", fit = "cover", radius = "media", controls = true, autoPlay = false, loop = false, muted, placeholder, onFile, style, ...rest }) {
  const frame = { background: "var(--dt-surface-sunken)", borderRadius: RADII[radius] || RADII.media, ...style };
  if (!src) {
    return (
      <AspectRatio ratio={ratio} style={frame} {...rest}>
        <UploadFrame icon={PLACEHOLDER_ICON} label={placeholder || label || "Video"} hint="Drop a video, or choose a file" accept="video/*" onFile={onFile} />
      </AspectRatio>
    );
  }
  /* Autoplay that is not muted is a policy no browser honours, so an unmuted
     autoplay prop would silently stop working the moment someone shipped it.
     Defaulting to muted when muted is not given makes the common case, a
     background loop, work without a second prop to remember. */
  const isMuted = muted == null ? autoPlay : muted;
  return (
    <AspectRatio ratio={ratio} style={frame} {...rest}>
      <video
        src={src}
        poster={poster}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        playsInline
        aria-label={label}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, display: "block" }}
      />
    </AspectRatio>
  );
}
