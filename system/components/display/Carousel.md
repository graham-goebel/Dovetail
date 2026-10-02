# Carousel

Items moving on a path: a ring, a row, a stack that shuffles, a grid that trades places. Reach for it when a set of things should feel alive on a marketing page: a collection, proof, a run of features. Any component can be an item.

## Use it when
- A handful of things (4 to 10) should be seen as a set, with motion carrying the eye from one to the next.
- A page section should respond to scroll: `drive="scroll"` pins the carousel while the page moves it.
- People should be able to play with it: click an item forward, drag, fling, swipe.

## Don't use it when
- The content must all be read. Motion hides things; use `Grid` or `List`.
- It's one product's photos. Use `ProductGallery`, which has thumbnails and no motion.
- The items are steps in a process. Use `Stepper`.
- It would be the only way to reach something important. Out-of-focus items are not interactive by default.

## Example
```jsx
<Carousel label="Autumn collection" layout="coverflow" drive="both" itemRatio="portrait">
  {products.map((p) => <ProductCard key={p.id} {...p} />)}
</Carousel>

<Carousel label="What people say" layout="stack" drive="scroll" itemRatio="portrait">
  {quotes.map((q) => <Card key={q.id}>{q.text}</Card>)}
</Carousel>
```

## Layouts
| layout | What it does | Good for |
|---|---|---|
| `stack` | The front card is thrown off in an arc and slips to the back | One at a time: quotes, offers |
| `grid` | A grid whose items trade places on each step | A collection at a glance, with life |
| `ring` | A tilted orbit; depth sets size and fade | A small set, playful |
| `arc` | Items climb a diagonal, growing, then dissolve | Hero motion, launches |
| `coverflow` | A 3D row; the focused item faces you | Products, covers |
| `fan` | A spread hand of cards; the focused one lifts | Cards, offers |
| `focus` | A row that swells in the middle | Features, people |
| `wave` | A row riding a sine curve | Logos, tags, playful proof |
| `marquee` | A steady drift at one size | Logos, proof |
| `taper` | A drift that grows as it comes toward you | Ambient motion |
| `scatter` | A scattered field; one item rises to the middle at a time | Moodboards, mixed media |

Changing `layout` morphs: each item travels from where it was, a beat after the one before.

## Drive and feel
- `drive`: `auto` moves on its own; `manual` only when a person moves it; `both` hands over to a person and resumes 2.5 seconds after they let go; `scroll` follows the page.
- `feel`: `flow` drifts and follows a finger closely; `glide` holds on each item and eases to the next; `spring` overshoots and settles. Each layout picks a sensible one.
- `expression`: `none`, `calm`, `lively` or `playful`. How much the items ripple, lean with speed and drift at rest.
- `pace`, `spread`, `depth`, `reverse`, `itemSize`: finer control.

## Composition
- Each child is one item. It fills a frame of `itemRatio` that is a size container, so content sized in `cqw` scales with the item. Give children keys.
- Content brings its own surface; the frame adds only `--dt-carousel-item-radius` and `--dt-carousel-item-shadow`.
- Put it in a `Section` or a block. Under `drive="scroll"` it renders its own tall track: give it the full width.

## Tokens
- Motion: `--dt-carousel-flow-stiffness`, `--dt-carousel-flow-damping`, `--dt-carousel-glide-stiffness`, `--dt-carousel-glide-damping`, `--dt-carousel-spring-stiffness`, `--dt-carousel-spring-damping`, `--dt-carousel-pace`, `--dt-carousel-expression`, `--dt-carousel-perspective`, `--dt-carousel-scroll-step`. Read once when it mounts; a context can set `--dt-carousel-expression: 0.5` to calm every carousel in it.
- Items: `--dt-carousel-item-radius` (`--dt-radius-container`), `--dt-carousel-item-shadow` (`--dt-elevation-2`).
- Controls (a row under the items, at the end): `--dt-carousel-control-surface` (`--dt-surface-glass-strong`), `--dt-carousel-control-border` (`--dt-border-glass`), `--dt-carousel-control-text` (`--dt-text-primary`), `--dt-carousel-control-size` (`--dt-size-control-md`); repeated under `.dark`.
- Set by the component, not for theming: `--dt-carousel-item-width` and `--dt-carousel-item-height`.

## Accessibility
- A region with `aria-roledescription="carousel"` and the required `label`. Each item is a group with `aria-roledescription="slide"`, named by `itemLabel` ("3 of 7"); the one in focus has `aria-current`.
- The stage is one tab stop. Arrow keys move it; a person's moves are announced politely. Under `auto` and `both` it pauses on hover, on keyboard focus and while a touch is held.
- Moving content needs a way to stop it: the built-in pause button does this. With `controls="none"` on an auto carousel, pass `paused` from a control of your own.
- Only the item in focus is interactive (`focusOnly`); the others are inert, so a tap brings them forward instead of pressing something half-seen. Grid and the drifting rows keep every item live.
- Under `prefers-reduced-motion` nothing moves by itself, steps are instant, the entrance is skipped and expression is off. Dragging, the arrow keys and scrolling still step it.
- Touch: a sideways swipe moves it and a fling carries on; a mostly vertical swipe scrolls the page. It never takes the page's scroll away.

## Content
- 4 to 10 items. Fewer looks sparse on a path; more turns a ring into a blur.
- Keep each item's content short enough to read while it moves: a title, a line, one action.
- `label` names the set ("Autumn collection"), not the component ("Carousel").
