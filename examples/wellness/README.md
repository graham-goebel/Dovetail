# Solace: a single wellness-app screen built on Dovetail

A test of how close Dovetail gets to a native mobile app: one "Today" screen for a
fictional ring-tracker, modelled on the layout and visual language of a real app's
home screen but under its own name and wordmark, with no borrowed imagery (the sea is an
SVG turbulence field, not a photograph).

```
index.html   The page shell. `class="dark"` sits on <html>, so the page is dark by
             construction and base-dark.css does the re-pointing.
theme.css    Cool slate ramps, a near-colourless accent, Instrument Serif for the
             headline, glass surfaces, the score rings, timeline and tab bar
app.js       The screen, in React.createElement so nothing needs compiling
```

What works: tap a score for its contributors (a bottom Drawer of Progress bars),
confirm or dismiss the detected nap, tag the stress period (tap the lit segment on the
timeline or "Add a tag", pick several, save), the add sheet behind the floating button,
and the tab bar. Everything animating stops under `prefers-reduced-motion`.

Text over the sea is measured against the rendered pixels, like the other examples:
every run clears WCAG 2.2 AA (worst case 5.3:1, the score labels over the brightest
water).
