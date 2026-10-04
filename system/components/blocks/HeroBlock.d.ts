import * as React from "react";

/** The top of a page: copy beside a picture, copy centred over one, or copy on a photo band. */
export interface HeroBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "display-sm" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  /** One or two sentences under the title. */
  lead?: React.ReactNode;
  /** The primary and secondary buttons. */
  actions?: React.ReactNode;
  /** A picture, video, product shot or live component beside (split) or under (centered) the copy. */
  media?: React.ReactNode;
  /** An image URL: the block becomes a photo band with the copy on a scrim, scoped dark. Takes over from media. */
  background?: string;
  /** split sets the copy beside media, stacking on a phone; centered centres it over media. @default "split" */
  layout?: "split" | "centered";
  /** Anything under the actions: tags, a logo row, a note. */
  children?: React.ReactNode;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Padding above and below, passed to Section: `sm`, `md`, `lg`, `xl` or `none`, from the module padding steps; `default` is `md` and `compact` is `sm`. @default "default" */
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "default" | "compact";
  /** Padding above, when it differs from `spacing`. */
  spacingTop?: "none" | "sm" | "md" | "lg" | "xl";
  /** Padding below, when it differs from `spacing`. */
  spacingBottom?: "none" | "sm" | "md" | "lg" | "xl";
  /** `full` spans the screen; `inset` sets the band in from the page edges with the container radius. Passed to Section. @default "full" */
  bleed?: "full" | "inset";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function HeroBlock(props: HeroBlockProps): React.JSX.Element;
