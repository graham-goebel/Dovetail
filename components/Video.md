# Video

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [Video.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/Video.jsx), [Video.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/Video.d.ts), [Video.md](https://graham-goebel.github.io/Dovetail/system/components/content/Video.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Video.html

## Guidelines

A ratio-locked video, built the same way as Image and sharing its placeholder: reserve
the space, degrade to a labelled drop target when there is nothing to show yet, upgrade
to the real thing the moment there is.

### Rules

- Give it a `label`. It becomes `aria-label` on the video and the placeholder's text, the
  same job `alt` does on Image, and there is no other way to name a video for someone who
  cannot see it.
- `controls` defaults to true. Turn it off only for a background loop the page is
  driving on its own, and pair that with `autoPlay` and `loop`.
- `autoPlay` mutes itself unless you set `muted` explicitly. No browser plays audible
  video without a person starting it, so an autoplay prop with sound is not a stricter
  choice, it is a broken one.

### Letting someone upload one

Pass `onFile` and the placeholder becomes a drop target, identical to Image's: a drag
or a picker hands you the browser's own `File`, and Video does nothing else with it.

```jsx
function Clip() {
  const [file, setFile] = React.useState(null);
  const src = file ? URL.createObjectURL(file) : undefined;
  return <Video src={src} label="Product walkthrough" placeholder="Walkthrough clip" onFile={setFile} />;
}
```

Revoke the object URL when it is no longer needed. Storing, transcoding or streaming the
file is a template's own concern; Video only gets you to a File.

### Tradeoffs

A poster image is worth setting whenever the video is not autoplaying: without one, the
frame is the flat placeholder colour until playback starts, which reads as broken sooner
than it reads as loading.

## Props

```ts
import * as React from "react";
import { AspectRatioProps } from "./AspectRatio";

/** A ratio-locked video, Image's sibling. Renders the same upload-ready placeholder when \`src\` is absent. */
export interface VideoProps extends React.HTMLAttributes<HTMLElement> {
  /** Video URL. Omit to render the placeholder frame. */
  src?: string;
  /** Poster frame, shown before playback starts. */
  poster?: string;
  /** Accessible name. Also shown in the placeholder frame in place of \`placeholder\`. */
  label?: string;
  /** @default "16:9" */
  ratio?: AspectRatioProps["ratio"];
  /** How the video fills its frame. @default "cover" */
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  /** @default "media" */
  radius?: "none" | "media" | "container" | "pill";
  /** @default true */
  controls?: boolean;
  /**
   * Requires \`muted\`, which is defaulted to true whenever this is true and
   * \`muted\` is not given explicitly: no browser honours autoplay on audible
   * video, so an unmuted autoplay prop would silently do nothing.
   * @default false
   */
  autoPlay?: boolean;
  /** @default false */
  loop?: boolean;
  muted?: boolean;
  /** Text shown in the placeholder frame. Falls back to \`label\`. */
  placeholder?: string;
  /**
   * Turns the placeholder into a drop target, exactly as Image's does.
   * Called with the browser's own File; nothing is read, transcoded or sent
   * anywhere. Omit this to keep the placeholder a plain frame.
   */
  onFile?: (file: File) => void;
}

export declare function Video(props: VideoProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-radius-media` | semantic | `var(--dt-radius-raw-12)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-icon-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |

## Source

```jsx
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
```
