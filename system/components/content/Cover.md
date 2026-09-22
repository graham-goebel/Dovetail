# Cover

Text laid over a full-bleed image. A marketing hero, a lifestyle poster and a social
caption card are the same shape underneath: an image, a scrim so the text stays legible,
and a block of copy anchored to one edge. Cover is that shape, with a ratio and an anchor
instead of three separate components to keep in sync.

## Rules

- Give it an `alt`. Pass an empty string only when the title on top already says what the
  image shows; that is still a decision, not an omission.
- Keep `title` short. It is set at the heading-lg role over a photograph, not inside a
  measured column, and a photograph does not forgive a title that wraps four times.
- One primary action in `actions`. A hero with three buttons is a hero that has not
  decided what the page is for.
- `scrim="none"` is for an image you control the tone of, or a title short enough to
  live inside a `Badge` you place in `actions` instead of relying on contrast with the
  photo.

## Choosing align and scrim together

`align="bottom"` with `scrim="gradient"` is the marketing hero: the top of the image stays
clean for a person's eye to land on, and the gradient darkens only where the title sits.

`align="center"` switches the gradient to a flat wash automatically, because a caption in
the middle of a frame needs the whole photo dimmed, not one edge of it. Use it for a
poster or a pull-quote over a photo.

`scrim="solid"` is the social read: a flat band of colour behind a caption, legible against
anything behind it. Pair it with `align="bottom"` and a short `body` for a caption strip,
or `align="top"` for a name-and-handle bar over a portrait.

```jsx
<Cover
  src={hero}
  alt=""
  ratio="16:9"
  eyebrow="New season"
  title="Built for the trail, not the showroom"
  body="Four days, three huts, one pack that never left our shoulders."
  actions={<Button>Shop the collection</Button>}
/>
```

## Letting someone upload one

Pass `onFile` and the placeholder becomes a drop target, identical to Image's: a drag or
a picker hands you the browser's own `File`, and Cover does nothing else with it. The
text block still renders once a real `src` arrives, so a template can build the hero
copy first and wire the image in after.

## Tradeoffs

Cover owns the scrim and the anchor; it does not own layout beyond its own box. A grid of
Covers, a Cover beside a `Media` row, a full-viewport Cover as a page's opening
section: all of that is the page's decision, made with `Grid`, `Stack` or plain CSS
around it, the same way every other content primitive in this system stays out of the
page's own layout.
