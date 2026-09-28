/* Theme sync for preview cards. The page hosting a card (the site's Configure
   panel, or the design-system viewer) sets data-theme on the card's <html>;
   Dovetail's CSS keys dark mode and contexts on classes. This mirrors one onto
   the other, now and whenever the attribute changes. Load it in <head>, before
   anything renders. A new context needs adding to the list here. */
(function () {
  var h = document.documentElement;
  var CONTEXTS = ["dt-context-product", "dt-context-marketing", "dt-context-social"];
  function sync() {
    var t = h.getAttribute("data-theme") || "";
    h.classList.toggle("dark", t === "dark");
    CONTEXTS.forEach(function (c) { h.classList.toggle(c, t === c); });
  }
  sync();
  new MutationObserver(sync).observe(h, { attributes: true, attributeFilter: ["data-theme"] });
})();
