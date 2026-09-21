import * as React from "react";

/** Person or entity thumbnail. Falls back to initials when no image is supplied. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name. Required — it is the accessible label and the initials source. */
  name: string;
  /** Image URL. When absent, initials render instead. */
  src?: string;
  /** @default "md" */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** @default "circle" */
  shape?: "circle" | "square";
  /** Presence indicator in the lower-right corner. */
  status?: "online" | "busy" | "away" | "offline";
}

export declare function Avatar(props: AvatarProps): JSX.Element;
