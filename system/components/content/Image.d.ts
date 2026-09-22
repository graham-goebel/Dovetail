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
