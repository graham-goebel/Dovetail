import * as React from "react";

/** An amount of money, formatted for its currency and locale, with an optional compare-at price and unit. */
export interface PriceProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * The amount in major units: 24.5 for $24.50, 1200 for ¥1,200. Prices stored in
   * minor units (cents) must be converted first: divide by 100 for USD or EUR, and
   * leave a zero-decimal currency such as JPY as it is.
   */
  amount: number;
  /** ISO 4217 currency code, passed to Intl.NumberFormat. @default "USD" */
  currency?: string;
  /**
   * BCP 47 locale for the format, e.g. "de-DE" or "ja-JP". Defaults to the runtime's
   * locale; set it when server rendering so the server and the browser print the same.
   */
  locale?: string;
  /**
   * The original price, in the same units as amount. When it is greater than amount it
   * shows struck through after the amount, and the amount takes the sale colour.
   */
  compareAt?: number;
  /** What the price is per, shown after it, smaller and secondary: "/ month", "each", "/ kg". */
  unit?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Shown instead of a formatted zero when amount is 0. @default "Free" */
  freeLabel?: string;
}

export declare function Price(props: PriceProps): React.JSX.Element;
