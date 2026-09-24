import * as React from "react";

/** Small non-interactive label for status or metadata. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "neutral" */
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  /** subtle is tinted with a border; solid is a filled chip for high emphasis. @default "subtle" */
  variant?: "subtle" | "solid";
  /** Leading status dot. */
  dot?: boolean;
  children?: React.ReactNode;
}

export declare function Badge(props: BadgeProps): JSX.Element;
