# Low Meadow: a dispensary site built on Dovetail

Four pages for a fictional neighbourhood cannabis dispensary, composed only from Dovetail
components and tokens. No build step: each page loads `system/styles.css`, the local
React copy, and `system/components/bundle.js`.

```
index.html     Home: full-bleed photo hero and bands, photo category tiles, staff picks, quotes
shop.html      Menu: category tabs, type / price / sort filters, product grid
product.html   Product detail (?id=meadow-haze): quantity, effects, details table, FAQ
visit.html     Hours, directions, what to bring, first-visit FAQ, email signup
theme.css      The brand: a green accent ramp, warm neutrals, Fraunces display, and layout
site.js        Shared data and chrome: header, pickup bag drawer, footer, age check, toasts
img/           Product and lifestyle photography
```

Photo bands (`LM.Bleed`, `.lm-bleed`) put the `dark` class on the band itself, so every
token inside reads its dark-mode value over the scrim and components need no special
casing. The supplied photos are 296px square, so they soften at full width; drop larger
originals into `img/` under the same names to sharpen them.

The theme overrides primitive ramps and a few semantic roles only, so dark mode (which
follows the OS setting) works with no extra rules. The age check and the bag are held in
this browser's localStorage; nothing is sent anywhere.

Serve the repository root and open `/examples/dispensary/`:

```bash
python3 -m http.server 8000
```
