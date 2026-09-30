import * as React from "react";

interface RatingBaseProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "role" | "children"> {
  /**
   * The rating, from 0 to max. A display rounds it to the nearest half star; an input
   * rounds it to a whole star. 0 in an input means nothing is chosen yet.
   */
  value: number;
  /** Number of stars in the scale. @default 5 */
  max?: number;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** BCP 47 locale for the numbers in the count and the accessible name. Defaults to the runtime's locale. */
  locale?: string;
}

/** A read-only star rating: role="img", named like "4.5 out of 5 stars, 128 reviews". */
export interface RatingDisplayProps extends RatingBaseProps {
  /** Omit onChange for a display. */
  onChange?: undefined;
  /** Number of reviews, shown as "(128)" after the stars and added to the accessible name. */
  count?: number;
  /** Replaces the generated accessible name, e.g. to translate it. */
  label?: string;
}

/** A star rating the user sets: a radio group of whole stars. */
export interface RatingInputProps extends RatingBaseProps {
  /** Called with the chosen number of stars, from 1 to max. Its presence makes the rating an input. */
  onChange: (value: number) => void;
  /** The radio group's accessible name, e.g. "Your rating". Required for an input. */
  label: string;
  /** The review count is display only. */
  count?: undefined;
}

/** A star rating: a display when onChange is absent, a radio-group input when it is given. */
export type RatingProps = RatingDisplayProps | RatingInputProps;

export declare function Rating(props: RatingProps): React.JSX.Element;
