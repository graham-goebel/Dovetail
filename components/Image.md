# Image

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [Image.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/Image.jsx), [Image.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/Image.d.ts), [Image.md](https://graham-goebel.github.io/Dovetail/system/components/content/Image.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Image.html

## Guidelines

A ratio-locked image with a built-in placeholder. Use it instead of a bare \`<img>\` anywhere in a template. It reserves space, crops predictably, and degrades to a labelled frame when the content system has not supplied a file yet.

### Alt text is required

\`alt\` is a required prop, not an optional one. Pass an empty string for a purely decorative image; that is an explicit decision a reviewer can see. An omitted \`alt\` is a type error.

### Fit and focal point

\`fit="cover"\` is the default and the right answer for nearly all editorial and marketing placements: the frame stays exact and the image crops. Use \`contain\` only for logos and screenshots where losing an edge is worse than leaving empty space.

When cover crops the wrong part of a photo, move the focal point rather than changing the ratio:

\`\`\`jsx
<Image src={hero} alt="Two engineers reviewing a schematic" ratio="21:9" position="center 30%" />
\`\`\`

### Placeholders

Without \`src\`, Image renders a dashed frame labelled with \`placeholder\` or \`alt\`. Templates ship this way on purpose, so a consumer can see the intended ratio and subject before wiring up a CMS.

### Letting someone upload one

Pass \`onFile\` and the same frame becomes a drop target: drag a file onto it, or click through to a picker. It is called with the browser's own \`File\` and does nothing else; Image does not read it, resize it or send it anywhere. A template's job is everything after that:

\`\`\`jsx
function Cover() {
  const [file, setFile] = React.useState(null);
  const src = file ? URL.createObjectURL(file) : undefined;
  return <Image src={src} alt="" placeholder="Cover image" onFile={setFile} />;
}
\`\`\`

Revoke the object URL when the file changes or the component unmounts, the same as anywhere else you create one. Uploading it to storage is the template's own concern; Image only gets you to a File.

## Props

```ts
import * as React from "react";
import { AspectRatioProps } from "./AspectRatio";

/** A ratio-locked image. Renders a labelled placeholder when \`src\` is absent, so templates lay out before content arrives. */
export interface ImageProps extends Omit<React.HTMLAttributes<HTMLElement>, "placeholder"> {
  /** Image URL. Omit to render the placeholder frame. */
  src?: string;
  /** Alternative text. Required; pass an empty string only for decorative images. */
  alt: string;
  /** @default "16:9" */
  ratio?: AspectRatioProps["ratio"];
  /** How the image fills its frame. @default "cover" */
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  /** Focal point, any CSS object-position. @default "center" */
  position?: string;
  /** @default "media" */
  radius?: "none" | "media" | "container" | "pill";
  /** @default "lazy" */
  loading?: "lazy" | "eager";
  /** Text shown in the placeholder frame. Falls back to \`alt\`. */
  placeholder?: string;
  /**
   * Turns the placeholder into a drop target. Called with the browser's own
   * File from either a drop or the file picker; nothing is read, resized or
   * sent anywhere. A template stores the file, derives an object URL for a
   * live preview, and passes that back in as \`src\` once it has one. Omit
   * this to keep the placeholder a plain frame, as it was before.
   */
  onFile?: (file: File) => void;
}

export declare function Image(props: ImageProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-media` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-icon-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-brand-muted` | semantic | `var(--dt-color-primary-050)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-link` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-family-mono` | primitive | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |
| `--dt-font-size-xs` | primitive | `12px` |
| `--dt-border-width-hair` | none | not declared |

## Source

```jsx
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
```
