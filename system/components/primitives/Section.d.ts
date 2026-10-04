import * as React from "react";

/**
 * A page section: the page column, the module padding above and below it, and
 * an optional surface, full bleed or set in from the page edges. Pass `media`
 * and it becomes a photo band with a scrim, scoped dark so everything inside
 * it reads as light on dark.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** The column, from the page-width tokens: `narrow` (--dt-layout-page-width-narrow, a reading column), `default` (--dt-layout-page-width, the column every page shares), `wide` (--dt-layout-page-width-wide), or `full` with no bound. Inset, it bounds the band itself. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
  /**
   * The surface, and the text roles that belong on it. Brand and secondary
   * tones re-point --dt-text-primary, -secondary and -tertiary on the section,
   * so Heading and Text inside follow without a prop. The -muted tones also
   * point a Button's primary and secondary at the brand colours (brand-muted:
   * brand then secondary; secondary-muted: the reverse). Ignored when `media` is set.
   * @default "base"
   */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this section: every semantic and component colour inside re-resolves as dark. Defaults to true when `media` is set. */
  dark?: boolean;
  /** Layers --dt-surface-texture over the tone. @default false */
  texture?: boolean;
  /** Padding above and below, from the module padding steps (--dt-layout-module-padding-sm to -xl), which move with the layout's character: `sm`, `md`, `lg`, `xl` or `none`. `default` is `md` and `compact` is `sm`, by their older names. @default "default" */
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "default" | "compact";
  /** Padding above, when it differs from `spacing`: a band can take more room at its top than its foot. */
  spacingTop?: "none" | "sm" | "md" | "lg" | "xl";
  /** Padding below, when it differs from `spacing`. */
  spacingBottom?: "none" | "sm" | "md" | "lg" | "xl";
  /** `full`: the band's fill spans the screen and its content sits in the column. `inset`: the band sits in the page column, set in from the screen's edges by the gutter, with the container radius, and pads its content with --dt-layout-module-inset. @default "full" */
  bleed?: "full" | "inset";
  /** Image URL. Turns the section into a full-bleed photo band. The image is decorative; say what matters in the text. */
  media?: string;
  /** With media: gradient fades from the edge the content sits on, solid washes the whole band. @default "gradient" */
  scrim?: "gradient" | "solid" | "none";
  /** With media: where the content sits. @default "bottom" */
  align?: "top" | "center" | "bottom";
  /** With media: the band's minimum height. @default "min(70vh, 640px)" */
  minHeight?: string;
  /** @default "section" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Section(props: SectionProps): React.JSX.Element;
