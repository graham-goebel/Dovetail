import * as React from "react";

/** Wraps media with a caption and an optional credit line. */
export interface FigureProps extends React.HTMLAttributes<HTMLElement> {
  /** Describes or extends the image. Not a repeat of the alt text. */
  caption?: React.ReactNode;
  /** Photographer, source, or licence line. */
  credit?: React.ReactNode;
  /** @default "start" */
  align?: "start" | "center";
  /** The media element, usually an \`Image\`. */
  children?: React.ReactNode;
}

export declare function Figure(props: FigureProps): JSX.Element;
