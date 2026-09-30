import * as React from "react";

/** Copy beside media, with an optional checked list and actions. Stacks on a phone. */
export interface SplitBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The paragraph under the title. */
  body?: React.ReactNode;
  /** Short claims, shown as a checked list. */
  points?: React.ReactNode[];
  actions?: React.ReactNode;
  /** A picture, video, product shot or live component. */
  media?: React.ReactNode;
  /** Puts the copy first, media second. @default false */
  reverse?: boolean;
  /** Vertical alignment of the two sides. @default "center" */
  align?: "center" | "top";
  /** Anything after the points. */
  children?: React.ReactNode;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function SplitBlock(props: SplitBlockProps): React.JSX.Element;
