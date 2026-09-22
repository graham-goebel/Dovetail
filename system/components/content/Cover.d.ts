import * as React from "react";
import { AspectRatioProps } from "./AspectRatio";

/**
 * Text over a full-bleed image: a hero band, a lifestyle poster, a social
 * caption card. One component covers all three, because the difference
 * between them is a ratio and where the text sits, not a different piece of
 * markup. Renders Image's own upload-ready placeholder when \`src\` is absent.
 */
export interface CoverProps extends Omit<React.HTMLAttributes<HTMLElement>, "placeholder"> {
  /** Image URL. Omit to render the placeholder frame. */
  src?: string;
  /** Alternative text. Required; pass an empty string when the visible title already says what the image shows. */
  alt: string;
  /** @default "4:3" */
  ratio?: AspectRatioProps["ratio"];
  /** How the image fills its frame. @default "cover" */
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  /** @default "media" */
  radius?: "none" | "media" | "container" | "pill";
  /** Text shown in the placeholder frame. Falls back to \`alt\`. */
  placeholder?: string;
  /** Turns the placeholder into a drop target, exactly as Image's does. */
  onFile?: (file: File) => void;
  /**
   * none for an image bright or busy enough to carry text on its own, most
   * often paired with a badge in `actions` rather than body copy. gradient
   * fades from the anchored edge, the common case. solid washes the whole
   * frame in one flat tone, for a caption you want readable no matter what
   * is behind it. Ignored while the placeholder is showing.
   * @default "gradient"
   */
  scrim?: "none" | "gradient" | "solid";
  /**
   * Vertical anchor for both the text block and the direction a gradient
   * scrim fades from. bottom is the marketing-hero default; center is a
   * poster, and switches a gradient scrim to a flat wash, since a centred
   * caption needs the whole frame dimmed, not one edge of it.
   * @default "bottom"
   */
  align?: "top" | "center" | "bottom";
  /** @default "start" */
  justify?: "start" | "center" | "end";
  /** Short kicker above the title. Uppercased by the eyebrow role. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  body?: React.ReactNode;
  /** Buttons, links, or a Badge for a social-style tag. Keep to one primary action. */
  actions?: React.ReactNode;
}

export declare function Cover(props: CoverProps): JSX.Element;
