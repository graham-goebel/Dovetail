import React from "react";
import { AspectRatio } from "./AspectRatio.jsx";

const RADII = { none: "0", media: "var(--dt-radius-media)", container: "var(--dt-radius-container)", pill: "var(--dt-radius-pill)" };

const PLACEHOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "var(--dt-size-icon-lg)", height: "var(--dt-size-icon-lg)" }} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

/* Shared by Image and Video: a labelled frame when there is no file, promoted
   to a real drop target the moment a template passes onFile. Nothing here
   uploads anything. It hands a template the browser's own File, the same as
   a bare <input type="file">, and leaves what happens to it entirely to the
   template's own code. */
export function UploadFrame({ icon, label, hint, accept, onFile, quiet = false, style }) {
  const [over, setOver] = React.useState(false);
  const base = {
    position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: "var(--dt-space-stack-2xs)", padding: "var(--dt-space-inset-md)", textAlign: "center",
    fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-font-size-xs)", color: "var(--dt-text-tertiary)",
    border: `var(--dt-border-width-hair) dashed ${over ? "var(--dt-border-brand)" : "var(--dt-border-subtle)"}`,
    borderRadius: "inherit", boxSizing: "border-box",
    background: over ? "var(--dt-surface-brand-muted)" : undefined,
    ...style,
  };

  /* A caller with its own content on top, a Cover with its title already
     laid over the slot, does not need this frame to also announce itself:
     two labels stacked in the same box is noise, not help. The border and
     the drop behaviour still say where the slot is. */
  const body = quiet ? null : (
    <React.Fragment>
      {icon}
      <span>{label}</span>
    </React.Fragment>
  );

  if (!onFile) {
    return <div style={base}>{body}</div>;
  }

  const take = (files) => {
    const file = files && files[0];
    if (file) onFile(file);
  };

  return (
    <label
      style={{ ...base, cursor: "pointer" }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files);
      }}
    >
      {body}
      {!quiet && <span style={{ color: "var(--dt-text-link)" }}>{hint}</span>}
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", border: 0 }}
      />
    </label>
  );
}

export function Image({ src, alt, ratio = "16:9", fit = "cover", position = "center", radius = "media", loading = "lazy", placeholder, onFile, style, ...rest }) {
  const frame = { background: "var(--dt-surface-sunken)", borderRadius: RADII[radius] || RADII.media, ...style };
  if (!src) {
    return (
      <AspectRatio ratio={ratio} style={frame} {...rest}>
        <UploadFrame icon={PLACEHOLDER_ICON} label={placeholder || alt || "Image"} hint="Drop an image, or choose a file" accept="image/*" onFile={onFile} />
      </AspectRatio>
    );
  }
  return (
    <AspectRatio ratio={ratio} style={frame} {...rest}>
      <img src={src} alt={alt} loading={loading} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, objectPosition: position, display: "block" }} />
    </AspectRatio>
  );
}
