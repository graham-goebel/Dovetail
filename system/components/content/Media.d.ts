import * as React from "react";

/** A media-and-copy row: the workhorse block of a marketing or lifestyle page. */
export interface MediaProps extends React.HTMLAttributes<HTMLElement> {
  /** The visual half, usually an \`Image\` or \`Figure\`. */
  media?: React.ReactNode;
  /** Short kicker above the title. Uppercased by the eyebrow role. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  body?: React.ReactNode;
  /** Buttons or links. Keep to one primary action. */
  actions?: React.ReactNode;
  /** Put the media on the right instead of the left. @default false */
  reverse?: boolean;
  /** @default "center" */
  align?: "center" | "start";
  /** @default "xl" */
  gap?: "md" | "lg" | "xl" | "2xl";
  /** Narrowest either column may get before the row stacks to one column. @default "300px" */
  minColumnWidth?: string;
  /** @default "section" */
  as?: keyof JSX.IntrinsicElements;
}

export declare function Media(props: MediaProps): JSX.Element;
