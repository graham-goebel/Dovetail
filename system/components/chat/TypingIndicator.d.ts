import * as React from "react";

/** Three animated dots in a received bubble while the other side is typing. The dots hold still under reduced motion. */
export interface TypingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Who is typing. Shown and announced as "Maya is typing"; without it, "Typing" is announced and nothing is shown beside the dots. */
  name?: string;
}

export declare function TypingIndicator(props: TypingIndicatorProps): React.JSX.Element;
