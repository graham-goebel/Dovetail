import * as React from "react";

/** The close of a page: one ask and its buttons, on the brand fill by default. */
export interface CtaBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  /** An illustration or product shot; the copy moves beside it. */
  media?: React.ReactNode;
  /** The band's surface, passed to Section. @default "brand" */
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

export declare function CtaBlock(props: CtaBlockProps): JSX.Element;
