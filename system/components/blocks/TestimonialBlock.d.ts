import * as React from "react";

/** One quote in a TestimonialBlock. */
export interface TestimonialItem {
  quote: React.ReactNode;
  /** Who said it. Also the initials in the default avatar. */
  name?: string;
  /** Their role and company. */
  role?: string;
  /** A custom avatar; defaults to an Avatar from name. */
  avatar?: React.ReactNode;
}

/** What customers say: one quote set large, or several in a grid. */
export interface TestimonialBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  lead?: React.ReactNode;
  quotes: TestimonialItem[];
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

export declare function TestimonialBlock(props: TestimonialBlockProps): React.JSX.Element;
