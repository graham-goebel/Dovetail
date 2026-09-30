import * as React from "react";

/**
 * Content container. The most context-sensitive component in the system.
 */
export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Uppercase label above the title. */
  eyebrow?: string;
  title?: React.ReactNode;
  /** Secondary copy below the title. */
  description?: React.ReactNode;
  /** Image or media slot, rendered above everything. */
  media?: React.ReactNode;
  /** Action row at the bottom. */
  footer?: React.ReactNode;
  /** Raises elevation on hover and sets a pointer cursor. */
  /**
   * Makes the whole card a link. The title becomes the link a screen reader
   * hears, and a copy of it stretches over the card for a pointer. Buttons in
   * `footer` stay clickable above it; put interactive content there, not in
   * children. Implies the interactive hover lift.
   */
  /**
   * raised is the card surface. glass and glass-strong are the overlay made
   * translucent, blurring what is behind, for a card over a feed or a map;
   * they follow the colour mode. glass-inverse is dark in both modes, for a
   * card over a photograph, and scopes dark mode so its contents read light.
   * @default "raised"
   */
  surface?: "raised" | "glass" | "glass-strong" | "glass-inverse";
  /**
   * An image URL to fill the card behind its content. The card becomes dark
   * in both colour modes (it scopes `.dark`, like `glass-inverse`), holds at
   * least `--dt-card-media-min-height`, and sets its content at the bottom
   * over a scrim. The picture is decorative; put what it shows in the title
   * or description. Also the poster for `backgroundVideo`.
   */
  background?: string;
  /**
   * A video URL to fill the card instead: muted, looping and inline. It does
   * not autoplay for someone who prefers reduced motion; they see
   * `background` as a still.
   */
  backgroundVideo?: string;
  /** Which part of the picture stays in frame, as CSS `object-position`. @default "center" */
  backgroundPosition?: string;
  /**
   * The wash between the picture and the text. gradient darkens from the
   * bottom, where the text sits; solid darkens the whole card; none is for a
   * picture that is already dark where the text lands. Check the contrast
   * against the real picture either way.
   * @default "gradient"
   */
  scrim?: "gradient" | "solid" | "none";
  /**
   * The text colour over a picture. light is the scrim's near-white; white is
   * pure white, for large type that would otherwise read as grey; primary
   * sets the title in a light brand step. Secondary text stays a quieter
   * light in every case.
   * @default "light"
   */
  onMedia?: "light" | "white" | "primary";
  href?: string;
  interactive?: boolean;
  /** Primary-colour border and tinted background for a chosen option. */
  selected?: boolean;
  /** @default "div" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Card(props: CardProps): React.JSX.Element;
