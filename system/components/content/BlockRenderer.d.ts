import * as React from "react";

export interface Block {
  /** Looked up in the registry. Everything else is spread onto the component. */
  _type: string;
  /** Stable key from the source. Falls back to the array index. */
  _key?: string;
  [prop: string]: any;
}

export type BlockRegistry = Record<string, React.ComponentType<any>>;

/** Maps an array of content blocks onto components. The whole integration surface for any headless source. */
export interface BlockRendererProps {
  blocks?: Block[];
  registry?: BlockRegistry;
  /** Show a visible warning for a `_type` with no component. Defaults to true under a non-production NODE_ENV, false otherwise. */
  debug?: boolean;
  /** Called for every unknown `_type`, whether or not the warning renders. Wire it to your error reporter. */
  onUnknown?: (type: string, block: Block) => void;
}

export declare function BlockRenderer(props: BlockRendererProps): JSX.Element;
