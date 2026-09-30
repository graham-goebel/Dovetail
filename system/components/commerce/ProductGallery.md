# ProductGallery

The images on a product page: a main image with previous and next buttons, a strip of thumbnails that choose it, and a counter.

## Use it when
- A product page shows several photos of one product: angles, details, the product in use.
- You need a controlled image index, for example to jump to a colour's photo when `VariantPicker` changes.

## Don't use it when
- There is one image and nothing to navigate. Use `Image`, or pass one image and the gallery drops its controls.
- The images are content in an article. Use `Figure` or `Media`.
- The slides are not images of one product, such as a carousel of promotions. That is a different pattern with different announcements.

## Example
```jsx
<ProductGallery
  label="Images of the stoneware mug"
  images={[
    { src: "/img/mug-front.jpg", alt: "Mug in fern glaze, handle to the right" },
    { src: "/img/mug-top.jpg", alt: "Mug from above" },
    { src: "/img/mug-glaze.jpg", alt: "Close-up of the glaze" },
  ]}
/>

// Controlled: show the chosen colour's first photo.
<ProductGallery label="Images of the tote" images={images} value={index} onChange={setIndex} thumbnails="left" ratio="4:5" />
```

## Variants
| Prop | What it is for |
|---|---|
| `thumbnails="bottom"` | Default. A row of thumbnails under the image, scrolling sideways when there are more than fit. |
| `thumbnails="left"` | A column beside the image, for a wide product column. When the gallery itself is narrower than `collapseBelow` (480px by default) it moves under the image. This is measured on the gallery with `ResizeObserver`, so it acts as a container query: a gallery in a narrow column collapses even on a wide screen. Until the first measurement (and on the server) it lays out as `left`. |
| `thumbnails="none"` | No thumbnails; the counter always shows on the image. For small spaces and quick views. |
| `ratio` | `"1:1"` by default; `"4:5"` for apparel, `"3:4"`, `"4:3"` or a number. The thumbnails share it. |
| `value` / `onChange` | Controlled index. Leave `value` out and use `defaultIndex` for an uncontrolled gallery; `onChange` still reports each change. |

The counter ("2 / 5") shows over the image when the gallery is narrower than `collapseBelow` or has no thumbnails. Screen readers always get the position, from a polite live region.

## Composition
- The main image and each thumbnail are `Image`s, so the frame keeps its ratio while the file loads. The first image loads eagerly, the rest lazily.
- Previous and next are `IconButton`s over the image's sides, in a glass surface.
- Put it in the first column of a product page, beside a stack of `Heading`, `Price`, `Rating`, `VariantPicker` and the add button.
- It fills the width it is given; constrain the column, not the gallery.

## Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-gallery-control-bg` (`--dt-surface-glass-strong`) and `--dt-gallery-control-bg-hover` (`--dt-surface-overlay`): the previous and next buttons and the counter.
- `--dt-gallery-control-fg` (`--dt-text-primary`): their icons and text.
- `--dt-gallery-thumb-border` (`--dt-border-subtle`) and `--dt-gallery-thumb-selected-border` (`--dt-border-selected`): each thumbnail's frame, and the shown one's.

It also reads `--dt-radius-media`, `--dt-radius-pill`, `--dt-size-avatar-xl` for the thumbnail width, `--dt-backdrop-glass`, `--dt-elevation-1` and `--dt-motion-micro`.

## Accessibility
- The gallery is a `role="region"` named by the required `label`.
- The main image's alt is the shown image's `alt`.
- Previous and next are buttons named "Previous image" and "Next image" (`previousLabel`, `nextLabel`). They wrap around at the ends, so they are never disabled and focus is never dropped.
- The thumbnails are a group named "Thumbnails" with one tab stop, the shown image's, marked `aria-current="true"`. Arrow keys (Left and Right, or Up and Down) move to the next thumbnail and show it at once, as tabs do; Home and End jump to the ends. Arrows follow the reading direction in right-to-left pages.
- Each thumbnail is named by its image's alt and position: "Close-up of the glaze (4 of 5)".
- Every change is announced politely as "Image 2 of 5" (`counterLabel`). The visible "2 / 5" is hidden from assistive technology so it is not read twice.
- On touch or pen, a horizontal swipe on the image moves to the next or previous image; vertical swipes scroll the page. Changes are instant, with no slide, so there is no motion to reduce.

## Content
- `label` names what the images are of: "Images of the stoneware mug".
- Each `alt` says what that image shows that the others don't: "From above", "Close-up of the glaze", "Worn with the strap shortened". Don't repeat the product name in every one.
