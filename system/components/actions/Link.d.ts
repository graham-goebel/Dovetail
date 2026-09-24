import * as React from "react";

/** Navigation. If it changes the page, it is a Link; if it changes data, it is a Button. */
export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Opens in a new tab, adds rel="noopener noreferrer" and a visible indicator icon. */
  external?: boolean;
  /** "always" is correct for links in prose. @default "always" */
  underline?: "always" | "hover" | "never";
  /** "inherit" for links inside a coloured block where the primary colour would clash. @default "primary" */
  tone?: "primary" | "inherit";
  children?: React.ReactNode;
}

export declare function Link(props: LinkProps): JSX.Element;
