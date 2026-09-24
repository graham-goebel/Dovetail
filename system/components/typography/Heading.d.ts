import * as React from "react";

/**
 * A heading whose document level and visual size are set separately, so a
 * page's outline and its scale can differ on purpose: an h2 set at display
 * size for a hero, an h3 set small inside a card.
 */
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Sets the tag, h1 to h6. @default 2 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The type role it is set in. Defaults by level: 1 heading-xl, 2 heading-lg, 3 heading-md, 4 heading-sm, 5 and 6 heading-xs. */
  size?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md" | "heading-sm" | "heading-xs";
  /**
   * headline reads --dt-text-headline: ink unless a theme sets headlines in a
   * brand colour, and re-pointed by a brand, photo or dark Section so it
   * follows the band. brand and brand-secondary set this one heading in a
   * brand text colour. inherit takes the colour of its parent, for a heading
   * inside a hand-built coloured block. @default "headline"
   */
  tone?: "headline" | "brand" | "brand-secondary" | "primary" | "secondary" | "inherit";
  align?: React.CSSProperties["textAlign"];
  /** Bounds the line length. @default "none" */
  measure?: "narrow" | "default" | "wide" | "none";
  /** Balances the lines, so a two-line heading does not end on one word. @default true */
  balance?: boolean;
  children?: React.ReactNode;
}

export declare function Heading(props: HeadingProps): JSX.Element;
