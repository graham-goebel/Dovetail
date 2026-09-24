# Meridian: a vacation rental homepage built on Dovetail

One immersive page for a fictional travel company, composed from Dovetail's components
and tokens. No build step: the page loads `system/styles.css`, the local React copy and
`system/components/bundle.js`, then `data.js` and `app.js`.

```
index.html   The page shell
theme.css    The brand: a pale-blue primary ramp, paper surfaces, Cormorant Garamond,
             and the immersive layer (parallax hero, photo bands, sticky story, tiles)
data.js      Content: eight houses, five collections, twelve amenities, three steps
app.js       Layout and behaviour, in React.createElement so nothing needs compiling
img/         photo/ (photography) · scene/ (illustrated houses) · texture/ (aerial
             watercolours, used as section grounds) · icon/ (the twelve painted marks)
```

## The brand

The palette is taken from the artwork rather than chosen next to it. The page ground is
the paper the illustrations were painted on, so an illustration sits on the page with no
edge; the primary colour is the dusty blue of the shutters, the sea and the signposts; the amber
ramp is re-tuned to the terracotta that appears in every scene. Only ramps, families and
shape roles are set at `:root`. The paper surfaces are scoped to `:root:not(.dark)`,
because they are a light-mode decision and a plain `:root` block would load after
`base-dark.css` and leave a dark page sitting on a cream ground.

## What is interactive

Search (destination, a date-range calendar, guests) that filters the list · collection
tiles that tilt toward the pointer and set the filter · live filtering by collection,
price and sort · save to a list held in this browser, with a count in the header · a
detail dialog with a gallery · a booking drawer that prices the stay as you choose
nights · a scroll-driven story with a sticky illustration · scroll reveals · a parallax
hero · a header that turns from glass-over-photo to paper-over-page · light and dark.

Everything moving stops under `prefers-reduced-motion`, and the reveals resolve to
visible rather than staying hidden.

## Two things this page found in Dovetail

**Component tokens do not survive a scoped `.dark`.** The component tier is declared once
on `:root` as aliases of semantic roles. A custom property resolves where it is declared,
so when `.dark` is on `<html>` the aliases are re-declared on that same element and
everything follows. Scope `.dark` to a subtree — a header over a photograph, a full-bleed
band — and the semantic roles re-point while the component aliases keep the value they
resolved at the root, so a ghost button inside a dark band keeps its light-mode
foreground at 1.1:1. `theme.css` re-declares the 48 colour-carrying aliases under `.dark`
as a stopgap; the fix belongs in `tokens/component/`.

**Drawer and Dialog sit below the sticky layer.** They compute to `z-index: 60`, under
`--dt-z-sticky` (100), so fixed page chrome floats over the scrim. The page drops the
header to `--dt-z-base` while an overlay is open.

## Contrast

Text over photographs is checked against the rendered pixels, not against a token pair:
the page is screenshotted with the text hidden, and the worst pixel behind each run is
measured. That is what sized the hero scrim — white text over the brightest part of the
photograph needs the ground below roughly 0.18 relative luminance to clear 4.5:1, which
one pass of the scrim role does not reach. Every text run on the page clears WCAG 2.2 AA
in both modes.

## Running it

Serve the repository root and open `/examples/travel/`:

```bash
python3 -m http.server 8000
```

Meridian is fictional. The photography, illustrations and aerial watercolours were
supplied for this example; the twelve icon marks were cut from a single sheet.
