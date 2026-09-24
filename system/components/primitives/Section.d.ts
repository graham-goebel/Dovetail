import * as React from "react";

/**
 * A page section: a page-width column, the section rhythm above and below it,
 * and an optional surface. Pass `media` and it becomes a full-bleed photo band
 * with a scrim, scoped dark so everything inside it reads as light on dark.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** The inner column. full removes the bound. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
  /**
   * The surface, and the text roles that belong on it. Brand and secondary
   * tones re-point --dt-text-primary, -secondary and -tertiary on the section,
   * so Heading and Text inside follow without a prop. Ignored when `media` is set.
   * @default "base"
   */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this section: every semantic and component colour inside re-resolves as dark. Defaults to true when `media` is set. */
  dark?: boolean;
  /** Layers --dt-surface-texture over the tone. @default false */
  texture?: boolean;
  /** Vertical padding: --dt-space-section, -section-compact, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** Image URL. Turns the section into a full-bleed photo band. The image is decorative; say what matters in the text. */
  media?: string;
  /** With media: gradient fades from the edge the content sits on, solid washes the whole band. @default "gradient" */
  scrim?: "gradient" | "solid" | "none";
  /** With media: where the content sits. @default "bottom" */
  align?: "top" | "center" | "bottom";
  /** With media: the band's minimum height. @default "min(70vh, 640px)" */
  minHeight?: string;
  /** @default "section" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Section(props: SectionProps): JSX.Element;
