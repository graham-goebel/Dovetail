import * as React from "react";

/** One feature in a FeatureGridBlock. */
export interface FeatureItem {
  /** An icon, drawn on a brand tint. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** One sentence. */
  description?: React.ReactNode;
  /** Adds a link under the description. */
  href?: string;
  /** The link's text. @default "Learn more" */
  linkLabel?: string;
}

/** A header over a grid of features, each with an icon, a title and a sentence. */
export interface FeatureGridBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  items: FeatureItem[];
  /** Columns on a wide screen; fewer as the width runs out, one on a phone. @default 3 */
  columns?: 2 | 3 | 4;
  /** The header's alignment. @default "center" */
  align?: "start" | "center";
  /** plain sits on the band; cards puts each feature on the card surface. @default "plain" */
  variant?: "plain" | "cards";
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

export declare function FeatureGridBlock(props: FeatureGridBlockProps): React.JSX.Element;
