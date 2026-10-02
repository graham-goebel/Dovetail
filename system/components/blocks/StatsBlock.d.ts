import * as React from "react";

/** One number in a StatsBlock. */
export interface StatItem {
  /** The number, as it should read: "63", "4.9★", "−38%". */
  value: React.ReactNode;
  label: React.ReactNode;
  /** A short qualifier under the label. */
  caption?: React.ReactNode;
}

/** A few numbers that make the case, set large, each over a hairline. */
export interface StatsBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "heading-lg" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  lead?: React.ReactNode;
  stats: StatItem[];
  /** @default "start" */
  align?: "start" | "center";
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

export declare function StatsBlock(props: StatsBlockProps): React.JSX.Element;
