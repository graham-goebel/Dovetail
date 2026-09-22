import * as React from "react";

/** Aside inside editorial content. */
export interface CalloutProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * note, tip, important and caution are feedback tones: pale, and matched to
   * a semantic role a reader already knows from Alert and Banner. brand is
   * not feedback. It reads --dt-surface-brand-muted, the same full-bleed
   * tint a hero band uses, for the one callout that is meant to feel like
   * the product rather than like a warning.
   * @default "note"
   */
  tone?: "note" | "tip" | "important" | "caution" | "brand";
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Lucide icon, or a sketch mark on a brand or editorial callout. */
  icon?: React.ReactNode;
  /**
   * Layers --dt-surface-texture, a dot or line grid, behind the tone's fill.
   * The pattern is drawn in the border-strength colour, never the brand hue,
   * so it never fights the tone underneath it.
   * @default false
   */
  texture?: boolean;
}

export declare function Callout(props: CalloutProps): JSX.Element;
