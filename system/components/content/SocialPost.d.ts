import * as React from "react";

/**
 * A social post drawn on an artboard at the format's native pixel size
 * (1080 wide) and scaled to fit its container: an Instagram story (9:16) or a
 * grid post (4:5 or 1:1). Ten layouts share one frame and type scale, half on
 * a plain tone and half on a photograph.
 */
export interface SocialPostProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * headline, quote, stat, list and announcement sit on a tone; cover, split,
   * framed, card and poster are built around `image`.
   * @default "headline"
   */
  layout?: "headline" | "quote" | "stat" | "list" | "announcement" | "cover" | "split" | "framed" | "card" | "poster";
  /** story is 1080 × 1920; portrait 1080 × 1350; square 1080 × 1080. @default "story" */
  format?: "story" | "portrait" | "square";
  /** The plain background, for layouts that have one. ink is dark in both colour modes. @default "brand" */
  tone?: "brand" | "brand-muted" | "secondary" | "paper" | "ink";
  /** Image URL for the pictured layouts. Decorative: say what matters in the text. */
  image?: string;
  /** CSS object-position for the image. @default "center" */
  imagePosition?: string;
  /** A few words above the title, set in mono capitals. */
  eyebrow?: React.ReactNode;
  /** The big editorial line: a headline, the quote, the number, or the poster's one word. */
  title?: React.ReactNode;
  /** One or two sentences under the title. */
  body?: React.ReactNode;
  /** A byline, attribution or date. */
  meta?: React.ReactNode;
  /** The numbered lines of the list layout. Five at most reads best. */
  items?: React.ReactNode[];
  /** A pill above the announcement's title, such as "New". */
  badge?: React.ReactNode;
  /** The brand name in the top corner. @default "Dovetail" */
  brand?: React.ReactNode;
  /** A mark before the brand name; defaults to a dot in the text colour. */
  mark?: React.ReactNode;
  /** The account handle along the bottom. */
  handle?: React.ReactNode;
  /** A short call to action in a pill at the bottom right: "Swipe", "Link in bio". */
  cta?: React.ReactNode;
  /** A carousel counter in the top corner: "03/10". */
  counter?: React.ReactNode;
  /** The accessible name of the post as an image. Defaults to its eyebrow, title and body. */
  label?: string;
}

export declare function SocialPost(props: SocialPostProps): JSX.Element;
