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
