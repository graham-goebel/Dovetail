import * as React from "react";

/**
 * Running text in one of the system's type roles. The variant picks the role,
 * the tag and a default tone; every one of those can be overridden.
 */
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * eyebrow: small caps label above a heading, secondary. lead: the opening
   * paragraph, body-lg, secondary. body: body-md. small: body-sm. fine: body-xs,
   * tertiary, for terms and footnotes. label: label-md, for a price or a value.
   * @default "body"
   */
  variant?: "eyebrow" | "lead" | "body" | "small" | "fine" | "label";
  /** Overrides the variant's default tone. inherit follows the surface it sits on; brand and brand-secondary read the brand text roles, for an eyebrow, a highlighted word or a price in the brand colour. */
  tone?: "inherit" | "primary" | "secondary" | "tertiary" | "link" | "brand" | "brand-secondary";
  /** Bounds the line length. Defaults to "default" for paragraph variants and "none" for eyebrow and label. */
  measure?: "narrow" | "default" | "wide" | "none";
  /** Overrides the role's weight, most often for a price. */
  weight?: "regular" | "medium" | "semibold";
  align?: React.CSSProperties["textAlign"];
  /** Tabular numerals, so a column of prices lines up. @default false */
  numeric?: boolean;
  /** Overrides the tag: p for paragraph variants, span for eyebrow and label. */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Text(props: TextProps): JSX.Element;
