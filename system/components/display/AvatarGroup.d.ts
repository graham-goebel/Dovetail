import * as React from "react";
import { AvatarProps } from "./Avatar";

/** Overlapping row of avatars with a count for the remainder. */
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** People to show, in display order. */
  people: Array<Pick<AvatarProps, "name" | "src">>;
  /** How many avatars render before the +N chip. @default 4 */
  max?: number;
  /** @default "md" */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Accessible group label, e.g. "Project members". Required. */
  label: string;
}

export declare function AvatarGroup(props: AvatarGroupProps): JSX.Element;
