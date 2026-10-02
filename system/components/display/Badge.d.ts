import * as React from "react";

/** Small non-interactive label for status or metadata. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** brand and brand-secondary are the brand colours: subtle is the page's surface with brand text and edge (it holds on a brand fill too), solid is the brand fill with --dt-text-on-brand. @default "neutral" */
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "brand" | "brand-secondary";
  /** subtle is tinted with a border; solid is a filled chip for high emphasis. @default "subtle" */
  variant?: "subtle" | "solid";
  /** Leading status dot. */
  dot?: boolean;
  children?: React.ReactNode;
}

export declare function Badge(props: BadgeProps): React.JSX.Element;
