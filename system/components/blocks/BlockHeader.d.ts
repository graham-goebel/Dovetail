import * as React from "react";

/** The eyebrow, title, lead and actions every block opens with. Use it to start a custom block in the same rhythm. */
export interface BlockHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** One or two sentences under the title. */
  lead?: React.ReactNode;
  /** Buttons under the lead. */
  actions?: React.ReactNode;
  /** Centred for a header over a grid; start beside media. @default "start" */
  align?: "start" | "center";
  /** The heading level, for the page outline. @default 2 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The heading's type size. @default "heading-lg" */
  size?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
}

export declare function BlockHeader(props: BlockHeaderProps): React.JSX.Element;
