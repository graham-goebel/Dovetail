import * as React from "react";

export type CarouselLayout =
  | "stack" | "grid" | "ring" | "arc" | "coverflow" | "fan"
  | "focus" | "wave" | "marquee" | "taper" | "scatter";

/**
 * Items moving on a path: a ring, a row, a stack that shuffles, a grid that
 * trades places. Any component can be an item. The motion runs on springs and
 * can be driven by time, by the person (click, drag, swipe, arrow keys), or by
 * the page's scroll.
 */
export interface CarouselProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "onChange"> {
  /** Accessible name of the carousel region, e.g. "Autumn collection". Required: a screen reader announces it with "carousel". */
  label: string;
  /** The items, one child per item. Any component; each fills an item frame that is a size container, so content sized in `cqw` scales with it. Give each a `key`. */
  children: React.ReactNode;
  /**
   * The path the items travel. stack: the front card is thrown off and slips to the back.
   * grid: a grid whose items trade places on each step. ring: a tilted orbit. arc: a
   * diagonal climb. coverflow: a 3D row, the focused item facing you. fan: a spread hand of
   * cards. focus: a row that swells in the middle. wave: a row riding a sine curve.
   * marquee: a steady drift. taper: a drift that grows as it comes toward you. scatter: a
   * scattered field, one item rising to the middle at a time. Changing it morphs from one
   * layout to the next. @default "ring"
   */
  layout?: CarouselLayout;
  /**
   * What moves it. auto: on its own, pausing on hover, keyboard focus and a held touch.
   * manual: only the person moves it, by clicking an item, dragging, swiping or the arrow
   * keys. both: auto, but a person can take over and it resumes 2.5 seconds after they let
   * go. scroll: the page's scroll position moves it; the carousel pins while a track of
   * `--dt-carousel-scroll-step` per item scrolls past. @default "auto"
   */
  drive?: "auto" | "manual" | "both" | "scroll";
  /**
   * How it moves. flow: drifts continuously and follows a finger closely. glide: holds on
   * each item, then eases to the next. spring: like glide, with an overshoot. The springs
   * are the `--dt-carousel-*-stiffness` and `-damping` tokens. Defaults to the layout's
   * own feel (glide for stack, grid, coverflow, fan, focus and scatter; flow for the rest).
   */
  feel?: "flow" | "glide" | "spring";
  /**
   * Secondary motion as one dial: how much items ripple (follow at different rates), lean
   * and stretch with speed, and drift at rest. Scaled by `--dt-carousel-expression`; none
   * under reduced motion. @default "lively"
   */
  expression?: "none" | "calm" | "lively" | "playful";
  /** Multiplies the layout's speed under auto. Also scaled by `--dt-carousel-pace`. @default 1 */
  pace?: number;
  /** How widely the layout spreads: the ring's size, a row's spacing, the fan's opening, the wave's height. 0.6 to 1.4 reads well. @default 1 */
  spread?: number;
  /** How strong depth is on ring, coverflow and focus: size and fade toward the back, and how far coverflow's items turn. 0 is flat. @default 1 */
  depth?: number;
  /** Runs the other way. @default false */
  reverse?: boolean;
  /** Each item's shape: square, portrait (3:4), landscape (4:3), or a width / height number. @default "square" */
  itemRatio?: "square" | "portrait" | "landscape" | number;
  /** Multiplies the item size the layout would choose. @default 1 */
  itemSize?: number;
  /** The stage's shape, a ratio keyword or a width / height number. Ignored when `height` is set. @default "4:3" */
  ratio?: "4:3" | "16:9" | "1:1" | "3:4" | "21:9" | number;
  /** A fixed stage height, any CSS length. Wins over `ratio`. */
  height?: string;
  /** The item in focus, for a controlled carousel: changing it brings that item forward. */
  value?: number;
  /** The item an uncontrolled carousel starts on. @default 0 */
  defaultIndex?: number;
  /** Called with the index of the item in focus whenever it changes, by any cause. */
  onChange?: (index: number) => void;
  /** Holds an auto carousel still. Pass it when you provide your own pause control; the built-in one is then hidden. */
  paused?: boolean;
  /**
   * Whether only the item in focus is interactive. Out-of-focus items can't be tabbed to or
   * pressed, so a tap on one brings it forward. Defaults to true, except for grid, wave,
   * marquee and taper, which keep every item live.
   */
  focusOnly?: boolean;
  /** Items spring out of a pile as the carousel comes into view, and gather up again when it leaves. Off under reduced motion. @default true */
  entrance?: boolean;
  /**
   * The controls, in a row under the items at the end. auto: a pause button when it moves on its own, and
   * previous and next when a person drives it. full: all three. none: no controls; an auto
   * carousel must then get a pause control of yours through `paused`. @default "auto"
   */
  controls?: "auto" | "full" | "none";
  /** Accessible name of the pause button. @default "Pause" */
  pauseLabel?: string;
  /** Accessible name of the pause button while paused. @default "Play" */
  playLabel?: string;
  /** Accessible name of the previous button. @default "Previous item" */
  previousLabel?: string;
  /** Accessible name of the next button. @default "Next item" */
  nextLabel?: string;
  /** Names each item for assistive technology, and is announced when a person moves the carousel. @default (n, total) => `${n} of ${total}` */
  itemLabel?: (n: number, total: number) => string;
}

export declare function Carousel(props: CarouselProps): React.JSX.Element;
