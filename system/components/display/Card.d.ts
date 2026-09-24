import * as React from "react";

/**
 * Content container. The most context-sensitive component in the system.
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Uppercase label above the title. */
  eyebrow?: string;
  title?: React.ReactNode;
  /** Secondary copy below the title. */
  description?: React.ReactNode;
  /** Image or media slot, rendered above everything. */
  media?: React.ReactNode;
  /** Action row at the bottom. */
  footer?: React.ReactNode;
  /** Raises elevation on hover and sets a pointer cursor. */
  /**
   * Makes the whole card a link. The title becomes the link a screen reader
   * hears, and a copy of it stretches over the card for a pointer. Buttons in
   * `footer` stay clickable above it; put interactive content there, not in
   * children. Implies the interactive hover lift.
   */
  href?: string;
  interactive?: boolean;
  /** Primary-colour border and tinted background for a chosen option. */
  selected?: boolean;
  /** @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Card(props: CardProps): JSX.Element;
