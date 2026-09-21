import * as React from "react";

/** Interactive chip: a filter that can be toggled, or an entered value that can be removed. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Toggled-on state. Sets aria-pressed when the tag is clickable. */
  selected?: boolean;
  /** Renders a remove button. */
  onRemove?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export declare function Tag(props: TagProps): JSX.Element;
