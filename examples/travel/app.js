/* Meridian — one page, composed from Dovetail.

   Written with React.createElement rather than JSX so the page runs with no build step,
   the same way every other document in this repository does.

   Where this page reaches past the component set — the parallax hero, the pointer tilt,
   the sticky story, the glass search bar — it still reaches only for Dovetail's tokens.
   The rule the system rests on holds here too: no literal colour, no literal radius, no
   spacing that is not a multiple of the base unit. */
(function () {
  var NS = window.BeamMobileDesignSystem_e33121;
  var D = window.MV_DATA;
  var h = React.createElement;
  var F = React.Fragment;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef,
      useMemo = React.useMemo, useCallback = React.useCallback;

  var SAVED_KEY = "meridian-saved";
  var MODE_KEY = "meridian-mode";

  var reduceMotion = (function () {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  })();

  /* ----------------------------------------------------------------- formatting */

  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW = ["M", "T", "W", "T", "F", "S", "S"];
  var DAY = 86400000;

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { return new Date(startOfDay(d).getTime() + n * DAY); }
  function sameDay(a, b) { return a && b && startOfDay(a).getTime() === startOfDay(b).getTime(); }
  function nightsBetween(a, b) { return a && b ? Math.round((startOfDay(b) - startOfDay(a)) / DAY) : 0; }
  function shortDate(d) { return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""; }

  /* ----------------------------------------------------------------- chrome icons
     Drawn on the 24px grid the system documents: round caps, inherited colour, no fill.
     Dovetail ships no icon set, and the painted marks are a second voice rather than an
     interface one, so the controls get these. */

  function svg(paths, size) {
    return h("svg", {
      width: size || 20, height: size || 20, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round",
      "aria-hidden": "true", focusable: "false"
    }, paths.map(function (d, i) { return h("path", { key: i, d: d }); }));
  }
  var Icon = {
    search: function (s) { return svg(["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"], s); },
    heart: function (s, filled) {
      return h("svg", { width: s || 18, height: s || 18, viewBox: "0 0 24 24",
        fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.6,
        strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
        h("path", { d: "M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z" }));
    },
    star: function (s) {
      return h("svg", { width: s || 14, height: s || 14, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" },
        h("path", { d: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1Z" }));
    },
    arrow: function (s) { return svg(["M5 12h14", "m13 6 6 6-6 6"], s); },
    left: function (s) { return svg(["m15 6-6 6 6 6"], s); },
    right: function (s) { return svg(["m9 6 6 6-6 6"], s); },
    menu: function (s) { return svg(["M4 7h16", "M4 12h16", "M4 17h16"], s); },
    sun: function (s) { return svg(["M12 5V3", "M12 21v-2", "m5.6 5.6-1.4-1.4", "m19.8 19.8-1.4-1.4", "M5 12H3", "M21 12h-2", "m5.6 18.4-1.4 1.4", "m19.8 4.2-1.4 1.4", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"], s); },
    moon: function (s) { return svg(["M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"], s); },
    guests: function (s) { return svg(["M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20", "M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7", "M21 20v-1.5a4 4 0 0 0-3-3.9", "M16 3.6a4 4 0 0 1 0 7.7"], s); },
    cal: function (s) { return svg(["M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z", "M4 10h16", "M8 3v4", "M16 3v4"], s); },
    pin: function (s) { return svg(["M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z", "M12 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"], s); }
  };

  /* ----------------------------------------------------------------- page behaviour */

  /* One observer for the whole page. Elements opt in with data-reveal and are never
     hidden from assistive technology, only from the eye until they arrive. */
  function useReveal(dep) {
    useEffect(function () {
      var nodes = [].slice.call(document.querySelectorAll('[data-reveal=""]'));
      if (!nodes.length) return;
      if (reduceMotion) { nodes.forEach(function (n) { n.setAttribute("data-reveal", "in"); }); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.setAttribute("data-reveal", "in"); io.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
      nodes.forEach(function (n) { io.observe(n); });
      return function () { io.disconnect(); };
    }, [dep]);
  }

  /* Scroll work happens once per frame, and writes to the DOM rather than to state:
     re-rendering a page this size sixty times a second is how a parallax gets janky. */
  function useScrollEffects(heroRef, headerRef, setOverPhoto) {
    useEffect(function () {
      var ticking = false;
      function frame() {
        ticking = false;
        var y = window.scrollY || 0;
        var header = headerRef.current;
        var hero = heroRef.current;
        if (header) {
          /* The bar's mode is React's to own, because React owns className and would
             reset anything written here on the next render. It changes on the crossing
             only, so the page is not re-rendered sixty times a second for it. The
             progress variable stays imperative: no render writes style on this element. */
          setOverPhoto(y <= (hero ? hero.offsetHeight - 120 : 200));
          var max = document.documentElement.scrollHeight - window.innerHeight;
          header.style.setProperty("--mv-progress", (max > 0 ? (y / max) * 100 : 0).toFixed(2) + "%");
        }
        if (hero && !reduceMotion) {
          var layer = hero.querySelector(".mv-hero-layer");
          if (layer) layer.style.transform = "translate3d(0," + (y * 0.32).toFixed(1) + "px,0)";
          /* Only the headline fades. The search panel under it stays at full strength:
             a control that dims while someone is using it is a bug, not an effect. */
          var copy = hero.querySelector(".mv-hero-copy");
          if (copy && y < window.innerHeight) {
            copy.style.transform = "translate3d(0," + (y * -0.1).toFixed(1) + "px,0)";
            copy.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.7)));
          }
        }
      }
      function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
      frame();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return function () {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }, []);
  }

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  /* ----------------------------------------------------------------- shared pieces */

  function Stars(props) {
    return h("span", { style: { display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", color: "var(--dt-text-warning, var(--dt-color-amber-600))" } },
      Icon.star(13),
      h("span", { className: "mv-num", style: { color: "var(--dt-text-primary)", fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-medium)" } }, props.rating.toFixed(2)),
      props.reviews ? h("span", { className: "mv-num", style: { color: "var(--dt-text-tertiary)", fontSize: "var(--dt-text-label-sm-size)" } }, "(" + props.reviews + ")") : null
    );
  }

  function AmenityMark(props) {
    var a = D.AMENITIES[props.id];
    if (!a) return null;
    return h("img", { className: "mv-icon-inline", src: D.ICON + props.id + ".webp", alt: "", loading: "lazy", width: 32, height: 32 });
  }

  /* A month of dates, as a range picker. Built from tokens rather than a component,
     because Dovetail ships no calendar and this is what a brand adds on top. */
  function Calendar(props) {
    var today = startOfDay(new Date());
    var initial = props.from || today;
    var cursor = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
    var month = cursor[0], setMonth = cursor[1];

    var first = new Date(month.getFullYear(), month.getMonth(), 1);
    var lead = (first.getDay() + 6) % 7; /* weeks start Monday */
    var count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var cells = [];
    for (var i = 0; i < lead; i++) cells.push(null);
    for (var d = 1; d <= count; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

    function pick(date) {
      if (!props.from || (props.from && props.to)) { props.onChange(date, null); return; }
      if (date <= props.from) { props.onChange(date, null); return; }
      props.onChange(props.from, date);
    }
    function state(date) {
      if (sameDay(date, props.from) && props.to) return "start";
      if (sameDay(date, props.from)) return "only";
      if (sameDay(date, props.to)) return "end";
      return null;
    }

    return h("div", { className: "mv-cal" },
      h("div", { className: "mv-cal-head" },
        h(NS.IconButton, { label: "Previous month", size: "sm", variant: "ghost",
          onClick: function () { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); } }, Icon.left(18)),
        h("strong", { style: { fontSize: "var(--dt-text-label-lg-size, var(--dt-text-body-md-size))", fontWeight: "var(--dt-font-weight-medium)" }, "aria-live": "polite" },
          MONTHS[month.getMonth()] + " " + month.getFullYear()),
        h(NS.IconButton, { label: "Next month", size: "sm", variant: "ghost",
          onClick: function () { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); } }, Icon.right(18))
      ),
      h("div", { className: "mv-cal-grid", role: "grid", "aria-label": "Choose your dates" },
        DOW.map(function (l, i) { return h("div", { key: "d" + i, className: "mv-cal-dow", "aria-hidden": "true" }, l); }),
        cells.map(function (date, i) {
          if (!date) return h("div", { key: "p" + i });
          var past = date < today;
          var inRange = props.from && props.to && date > props.from && date < props.to;
          return h("button", {
            key: date.getTime(), type: "button", className: "mv-day", disabled: past,
            "data-in": inRange ? "true" : undefined, "data-edge": state(date) || undefined,
            "aria-label": date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
            onClick: function () { pick(date); }
          }, date.getDate());
        })
      ),
      h("p", { className: "mv-fine" }, props.from && props.to
        ? nightsBetween(props.from, props.to) + " nights, " + shortDate(props.from) + " to " + shortDate(props.to)
        : props.from ? "Now choose the night you leave." : "Choose the night you arrive.")
    );
  }

  function Counter(props) {
    return h("div", { className: "mv-row" },
      h("div", null,
        h("div", { style: { fontWeight: "var(--dt-font-weight-medium)" } }, props.label),
        props.hint ? h("p", { className: "mv-fine" }, props.hint) : null
      ),
      h(NS.Inline, { gap: "xs", align: "center" },
        h(NS.IconButton, { label: "One fewer " + props.label.toLowerCase(), size: "sm", variant: "ghost",
          disabled: props.value <= props.min, onClick: function () { props.onChange(props.value - 1); } }, svg(["M5 12h14"], 18)),
        h("span", { className: "mv-num", style: { minWidth: "2ch", textAlign: "center" }, "aria-live": "polite" }, props.value),
        h(NS.IconButton, { label: "One more " + props.label.toLowerCase(), size: "sm", variant: "ghost",
          disabled: props.value >= props.max, onClick: function () { props.onChange(props.value + 1); } }, svg(["M12 5v14", "M5 12h14"], 18))
      )
    );
  }

  /* ----------------------------------------------------------------- header */

  function Header(props) {
    var menu = useState(false);
    var links = [
      { id: "stays", label: "Stays" }, { id: "collections", label: "Collections" },
      { id: "how", label: "How it works" }, { id: "included", label: "What's included" }
    ];
    return h(F, null,
      h("header", {
        /* Over the photograph the bar is a dark surface, so it is scoped dark and every
           control inside re-points with it. A colour on the header alone would not reach
           them: a Button paints its own foreground from its own token. */
        className: "mv-header" + (props.overPhoto ? " dark" : ""),
        ref: props.headerRef, "data-over": props.overPhoto ? "photo" : "page"
      },
        h("div", { className: "mv-shell mv-shell--wide mv-header-bar" },
          h("a", { className: "mv-wordmark", href: "#top" }, "Meridian"),
          h("nav", { className: "mv-nav", "aria-label": "Sections" },
            links.map(function (l) {
              return h("a", { key: l.id, href: "#" + l.id,
                onClick: function (e) { e.preventDefault(); scrollToId(l.id); } }, l.label);
            })
          ),
          h(NS.Inline, { gap: "xs", align: "center" },
            h(NS.IconButton, {
              label: props.mode === "dark" ? "Switch to light" : "Switch to dark",
              variant: "ghost", size: "sm", onClick: props.onToggleMode
            }, props.mode === "dark" ? Icon.sun(18) : Icon.moon(18)),
            h(NS.Button, {
              size: "sm", variant: "ghost", onClick: props.onOpenSaved, className: "mv-saved-btn",
              iconStart: Icon.heart(16, props.savedCount > 0)
            }, h("span", { className: "mv-saved-label" }, props.savedCount ? "Saved · " + props.savedCount : "Saved")),
            h("span", { className: "mv-hide-sm" },
              h(NS.Button, { size: "sm", onClick: function () { scrollToId("stays"); } }, "Find a stay")),
            h("span", { className: "mv-menu-only" },
              h(NS.IconButton, { label: "Open menu", variant: "ghost", size: "sm",
                onClick: function () { menu[1](true); } }, Icon.menu(20)))
          )
        ),
        h("span", { className: "mv-progress", "aria-hidden": "true" })
      ),
      h(NS.Drawer, {
        open: menu[0], onClose: function () { menu[1](false); }, title: "Meridian", label: "Menu", side: "right", width: 320
      },
        h(NS.List, {
          label: "Sections", divided: true, interactive: true,
          items: links.map(function (l) {
            return { id: l.id, title: l.label, onClick: function () { menu[1](false); scrollToId(l.id); } };
          })
        })
      )
    );
  }

  /* ----------------------------------------------------------------- hero + search */

  function Hero(props) {
    var whereOpen = useState(false), dateOpen = useState(false), guestOpen = useState(false);
    var s = props.search;

    var dateLabel = s.from && s.to
      ? shortDate(s.from) + " — " + shortDate(s.to)
      : s.from ? shortDate(s.from) + " — add a date" : "Any week";
    var guestLabel = s.guests === 1 ? "1 guest" : s.guests + " guests";

    /* All three fields are the same control: a label, a value, and a panel. The Where
       field holds a Combobox rather than being one, so the row reads as one object
       instead of one input wearing two hats. */
    function Field(props2) {
      return h("div", { className: "mv-search-field" },
        h(NS.Popover, {
          /* The bar sits at the foot of a full-height hero, so its panels open into the
             photograph above rather than off the bottom of the screen. */
          label: props2.label, placement: "top-start", width: props2.width || 320,
          open: props2.state[0], onOpenChange: props2.state[1],
          trigger: h("button", { type: "button", className: "mv-field-button" },
            h("small", null, props2.label),
            h("strong", null, props2.value))
        }, props2.children)
      );
    }

    return h("section", { className: "mv-hero", id: "top", ref: props.heroRef },
      h("div", { className: "mv-hero-layer mv-kenburns" },
        h("img", { src: D.PHOTO + "tuscany.webp", alt: "A stone terrace above a Tuscan valley, breakfast laid on a long table", fetchpriority: "high" })
      ),
      h("div", { className: "mv-shell mv-shell--wide mv-hero-inner" },
        h(NS.Stack, { gap: "xl" },
          /* Only the copy is scoped dark: it sits directly on the photograph. The panel
             below it is its own light surface, so it keeps the brand's paper tone. */
          h("div", { className: "dark mv-on-photo" },
            h(NS.Stack, { gap: "md", className: "mv-hero-copy" },
              h("span", { className: "mv-eyebrow", style: { color: "inherit" } }, "Houses worth the journey"),
              h("h1", { className: "mv-display" }, "Somewhere the week slows down"),
              h("p", { className: "mv-lead", style: { color: "inherit" } },
                "A short list of homes in Europe and beyond, each one held by the family that keeps it. Twelve this season, chosen in person.")
            )
          ),

          h("div", { className: "mv-search", role: "search" },
            h(Field, { label: "Where", value: s.where || "Anywhere", state: whereOpen, width: 340 },
              h(NS.Stack, { gap: "sm" },
                h(NS.Combobox, {
                  label: "Search places", size: "sm", placeholder: "A town, a coast, a country",
                  value: s.where, onChange: function (v) { props.onSearch({ where: v }); },
                  options: D.STAYS.map(function (x) { return x.place; })
                    .filter(function (v, i, a2) { return a2.indexOf(v) === i; })
                    .concat(D.COLLECTIONS.map(function (c) { return c.label; }))
                }),
                h("span", { className: "mv-eyebrow" }, "Or a landscape"),
                h(NS.Inline, { gap: "xs", wrap: true },
                  D.COLLECTIONS.map(function (c) {
                    return h(NS.Tag, { key: c.id, onClick: function () {
                      props.onSearch({ where: "" }); whereOpen[1](false); props.onPickCollection(c.id);
                    } }, c.label);
                  })
                ),
                s.where ? h(NS.Button, { size: "sm", variant: "ghost", onClick: function () { props.onSearch({ where: "" }); } }, "Clear") : null
              )
            ),
            h(Field, { label: "When", value: dateLabel, state: dateOpen, width: 340 },
              h(Calendar, {
                from: s.from, to: s.to,
                onChange: function (from, to) {
                  props.onSearch({ from: from, to: to });
                  if (from && to) dateOpen[1](false);
                }
              })
            ),
            h(Field, { label: "Who", value: guestLabel, state: guestOpen, width: 300 },
              h(NS.Stack, { gap: "sm" },
                h(Counter, {
                  label: "Guests", hint: "Everyone over two years old", min: 1, max: 12,
                  value: s.guests, onChange: function (v) { props.onSearch({ guests: v }); }
                }),
                h("p", { className: "mv-fine" }, "We will only show houses that sleep this many.")
              )
            ),
            h("div", { className: "mv-search-submit" },
              h(NS.Button, { size: "lg", onClick: props.onSubmit, iconStart: Icon.search(18) }, "Search"))
          ),

          h("div", { className: "dark mv-on-photo" },
            h(NS.Inline, { gap: "xs", wrap: true },
              h("span", { className: "mv-fine", style: { color: "inherit", opacity: 0.8, alignSelf: "center" } }, "Popular:"),
              D.COLLECTIONS.slice(0, 4).map(function (c) {
                return h(NS.Tag, { key: c.id, onClick: function () { props.onPickCollection(c.id); } }, c.label);
              })
            )
          )
        )
      ),
      h("div", { className: "mv-scroll-cue dark mv-on-photo", "aria-hidden": "true" },
        "Scroll", h("span")
      )
    );
  }

  /* ----------------------------------------------------------------- collections */

  function CollectionTile(props) {
    var c = props.collection;
    var ref = useRef(null);
    function move(e) {
      if (reduceMotion || !ref.current) return;
      var r = ref.current.getBoundingClientRect();
      ref.current.style.setProperty("--mv-tx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      ref.current.style.setProperty("--mv-ty", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    }
    function reset() {
      if (!ref.current) return;
      ref.current.style.setProperty("--mv-tx", "0");
      ref.current.style.setProperty("--mv-ty", "0");
    }
    return h("button", {
      type: "button", className: "mv-tile", ref: ref, "data-reveal": "",
      style: { "--mv-delay": props.index * 70 + "ms" },
      "aria-pressed": props.active, onMouseMove: move, onMouseLeave: reset, onBlur: reset,
      onClick: function () { props.onPick(c.id); }
    },
      h("img", { src: c.scene, alt: "", loading: "lazy" }),
      h("div", { className: "mv-tile-label" },
        h("div", null,
          h("div", { className: "mv-h3", style: { fontSize: "var(--dt-text-heading-sm-size)" } }, c.label),
          h("p", { className: "mv-fine" }, c.places)
        ),
        h("span", { style: { color: "var(--dt-text-tertiary)" } }, Icon.arrow(18))
      )
    );
  }

  function isNarrow() {
    try { return window.matchMedia("(max-width: 860px)").matches; } catch (e) { return false; }
  }
  function watchNarrow(setFn) {
    var mq = window.matchMedia("(max-width: 860px)");
    function sync() { setFn(mq.matches); }
    if (mq.addEventListener) mq.addEventListener("change", sync); else mq.addListener(sync);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener("change", sync); else mq.removeListener(sync);
    };
  }

  /* The collection tiles: a grid down to tablet width, and below 860px a single row the
     CSS turns into a swipeable, scroll-snapped strip (see .mv-tiles in theme.css). This
     component adds the autoplay and the dots; the grid layout ignores both, since the
     row itself only becomes a horizontal scroller once the CSS says so. */
  function Collections(props) {
    var items = D.COLLECTIONS;
    var trackRef = useRef(null);
    var indexRef = useRef(0);
    var mobileRef = useRef(isNarrow());
    var pausedRef = useRef(false);
    var slide = useState(0);

    var goTo = useCallback(function (i, smooth) {
      var n = items.length;
      var idx = ((i % n) + n) % n;
      indexRef.current = idx;
      slide[1](idx);
      var track = trackRef.current;
      var card = track && track.children[idx];
      if (track && card) {
        track.scrollTo({
          left: card.offsetLeft - track.offsetLeft,
          behavior: smooth === false || reduceMotion ? "auto" : "smooth"
        });
      }
    }, []);

    useEffect(function () { return watchNarrow(function (v) { mobileRef.current = v; }); }, []);

    /* Autoplay only ever moves the strip while it is actually a carousel (mobile) and
       nothing is mid-swipe. It is a no-op the rest of the time rather than gated out
       entirely, so a resize across the breakpoint picks it up with no extra wiring. */
    useEffect(function () {
      if (reduceMotion) return;
      var id = setInterval(function () {
        if (!mobileRef.current || pausedRef.current) return;
        goTo(indexRef.current + 1);
      }, 4200);
      return function () { clearInterval(id); };
    }, [goTo]);

    /* A manual swipe pauses autoplay immediately and, once the swipe settles, becomes
       the new position: the nearest card to the strip's centre, found the same way the
       browser's own snap already chose it, so the two never disagree. */
    useEffect(function () {
      var track = trackRef.current;
      if (!track) return;
      var t = null;
      function onScroll() {
        pausedRef.current = true;
        clearTimeout(t);
        t = setTimeout(function () {
          var children = [].slice.call(track.children);
          var centre = track.scrollLeft + track.clientWidth / 2;
          var nearest = 0, best = Infinity;
          children.forEach(function (c, i) {
            var d = Math.abs((c.offsetLeft + c.offsetWidth / 2) - centre);
            if (d < best) { best = d; nearest = i; }
          });
          indexRef.current = nearest;
          slide[1](nearest);
          pausedRef.current = false;
        }, 160);
      }
      track.addEventListener("scroll", onScroll, { passive: true });
      return function () { track.removeEventListener("scroll", onScroll); clearTimeout(t); };
    }, []);

    return h(F, null,
      h("div", { className: "mv-tiles", ref: trackRef },
        items.map(function (c, i) {
          return h(CollectionTile, {
            key: c.id, collection: c, index: i,
            active: props.selected === c.id, onPick: props.onPick
          });
        })
      ),
      h("div", { className: "mv-dots", role: "tablist", "aria-label": "Collection, slide" },
        items.map(function (c, i) {
          return h("button", {
            key: c.id, type: "button", className: "mv-dot", role: "tab",
            "aria-selected": i === slide[0] ? "true" : "false", "aria-label": "Show " + c.label,
            onClick: function () {
              pausedRef.current = true;
              goTo(i);
              setTimeout(function () { pausedRef.current = false; }, 5000);
            }
          });
        })
      )
    );
  }

  /* ----------------------------------------------------------------- listing card */

  function StayCard(props) {
    var s = props.stay;
    return h("article", { className: "mv-card", "data-reveal": "", style: { "--mv-delay": (props.index % 4) * 80 + "ms" } },
      h("div", { className: "mv-card-media" },
        h("img", {
          src: s.hero, alt: s.name + ", " + s.place, loading: props.index < 4 ? "eager" : "lazy",
          style: s.heroFocus ? { objectPosition: s.heroFocus } : undefined
        }),
        s.tags && s.tags[0] ? h("span", { className: "mv-card-flag" },
          h(NS.Badge, { variant: "solid", tone: s.illustrated ? "primary" : "neutral" }, s.tags[0])) : null,
        h("span", { className: "mv-card-actions" },
          h("button", {
            type: "button", className: "mv-save", "aria-pressed": props.saved,
            "aria-label": (props.saved ? "Remove " : "Save ") + s.name,
            onClick: function () { props.onSave(s); }
          }, Icon.heart(18, props.saved))
        )
      ),
      h("div", { className: "mv-card-body" },
        h("button", {
          type: "button", className: "mv-card-open",
          onClick: function () { props.onOpen(s); }
        }, "View " + s.name),
        h(NS.Inline, { justify: "space-between", align: "start", gap: "sm" },
          h(NS.Stack, { gap: "2xs" },
            h("span", { className: "mv-h3", style: { fontSize: "var(--dt-text-heading-sm-size)" } }, s.name),
            h("span", { className: "mv-fine" }, s.place)
          ),
          h(Stars, { rating: s.rating })
        ),
        h("p", { className: "mv-small", style: { flex: 1 } }, s.blurb),
        h(NS.Inline, { gap: "2xs", wrap: true },
          s.amenities.slice(0, 4).map(function (a) { return h(AmenityMark, { key: a, id: a }); })
        ),
        h(NS.Divider),
        h(NS.Inline, { justify: "space-between", align: "center" },
          h("span", null,
            h("span", { className: "mv-price" }, money(s.rate)),
            h("span", { className: "mv-fine", style: { marginInlineStart: "var(--dt-space-inline-2xs)" } }, "night")
          ),
          h("span", { className: "mv-fine" }, s.guests + " guests · " + s.beds + " beds")
        )
      )
    );
  }

  /* ----------------------------------------------------------------- detail dialog */

  function StayDialog(props) {
    var s = props.stay;
    var shot = useState(0);
    useEffect(function () { shot[1](0); }, [s && s.id]);
    if (!s) return null;
    return h(NS.Dialog, {
      open: true, onClose: props.onClose, size: "lg", title: s.name,
      description: s.place + " · " + s.collectionLabel,
      footer: [
        h(NS.Button, { key: "save", variant: "secondary", onClick: function () { props.onSave(s); },
          iconStart: Icon.heart(16, props.saved) }, props.saved ? "Saved" : "Save"),
        h(NS.Button, { key: "book", onClick: function () { props.onBook(s); } }, "Check availability")
      ]
    },
      h("div", { className: "mv-detail" },
        h("div", { className: "mv-gallery" },
          h("div", { className: "mv-gallery-main" },
            h("img", { src: s.gallery[shot[0]], alt: s.galleryLabels[shot[0]] })
          ),
          s.gallery.length > 1 ? h("div", { className: "mv-thumbs" },
            s.gallery.map(function (g, i) {
              return h("button", {
                key: g + i, type: "button", className: "mv-thumb", "aria-pressed": i === shot[0],
                "aria-label": s.galleryLabels[i], onClick: function () { shot[1](i); }
              }, h("img", { src: g, alt: "", loading: "lazy" }));
            })
          ) : null,
          h("p", { className: "mv-fine" }, s.galleryLabels[shot[0]]),
          h(NS.Divider),
          h("span", { className: "mv-eyebrow" }, "What is included"),
          h(NS.Grid, { minColumnWidth: "160px", gap: "sm" },
            s.amenities.map(function (a) {
              return h(NS.Inline, { key: a, gap: "xs", align: "center" },
                h(AmenityMark, { id: a }),
                h("span", { className: "mv-small", style: { color: "var(--dt-text-primary)" } }, D.AMENITIES[a].label)
              );
            })
          )
        ),
        h(NS.Stack, { gap: "md" },
          h(NS.Inline, { justify: "space-between", align: "center", wrap: true, gap: "sm" },
            h(Stars, { rating: s.rating, reviews: s.reviews }),
            h(NS.Inline, { gap: "2xs", align: "center" },
              h(NS.Avatar, { name: s.host, size: "sm" }),
              h("span", { className: "mv-small" }, "Kept by " + s.host)
            )
          ),
          h("p", { className: "mv-small" }, s.story),
          h(NS.Inline, { gap: "xs", wrap: true },
            h(NS.Badge, { tone: "neutral" }, s.guests + " guests"),
            h(NS.Badge, { tone: "neutral" }, s.beds + " bedrooms"),
            h(NS.Badge, { tone: "neutral" }, s.baths + " bathrooms"),
            s.tags.map(function (t) { return h(NS.Badge, { key: t, tone: "neutral" }, t); })
          ),
          h(NS.Callout, { tone: "note", title: money(s.rate) + " a night" },
            "Cleaning and service are shown in full before you reserve. Nothing is charged until the host confirms.")
        )
      )
    );
  }

  /* ----------------------------------------------------------------- booking drawer */

  function BookingDrawer(props) {
    var s = props.stay;
    var range = useState({ from: props.search.from, to: props.search.to });
    var guests = useState(props.search.guests);
    var done = useState(false);
    useEffect(function () {
      range[1]({ from: props.search.from, to: props.search.to });
      guests[1](props.search.guests);
      done[1](false);
    }, [s && s.id]);
    if (!s) return null;

    var n = nightsBetween(range[0].from, range[0].to);
    var nights = n > 0 ? n : 0;
    var lodging = nights * s.rate;
    var cleaning = nights ? 120 : 0;
    var service = Math.round(lodging * 0.09);
    var total = lodging + cleaning + service;

    var body = done[0]
      ? h(NS.EmptyState, {
          title: "Request sent to " + s.host,
          description: "You will hear back within the day. Nothing is charged until the house is confirmed.",
          action: h(NS.Button, { onClick: props.onClose }, "Close")
        })
      : h(NS.Stack, { gap: "lg" },
          h(NS.Inline, { gap: "sm", align: "center" },
            h("img", { src: s.hero, alt: "", width: 72, height: 72,
              style: { borderRadius: "var(--dt-radius-media)", objectFit: "cover", display: "block" } }),
            h(NS.Stack, { gap: "2xs" },
              h("strong", null, s.name),
              h("span", { className: "mv-fine" }, s.place),
              h(Stars, { rating: s.rating, reviews: s.reviews })
            )
          ),
          h(Calendar, {
            from: range[0].from, to: range[0].to,
            onChange: function (from, to) { range[1]({ from: from, to: to }); }
          }),
          h(NS.Divider),
          h(Counter, {
            label: "Guests", hint: "This house sleeps " + s.guests, min: 1, max: s.guests,
            value: Math.min(guests[0], s.guests), onChange: guests[1]
          }),
          h(NS.Divider),
          nights
            ? h("div", { className: "mv-rows" },
                h("div", { className: "mv-row" },
                  h("span", { className: "mv-small" }, money(s.rate) + " × " + nights + " nights"),
                  h("span", { className: "mv-num" }, money(lodging))),
                h("div", { className: "mv-row" },
                  h("span", { className: "mv-small" }, "Cleaning"),
                  h("span", { className: "mv-num" }, money(cleaning))),
                h("div", { className: "mv-row" },
                  h("span", { className: "mv-small" }, "Service"),
                  h("span", { className: "mv-num" }, money(service))),
                h("div", { className: "mv-row mv-row--total" },
                  h("span", null, "Total"),
                  h("span", { className: "mv-num" }, money(total)))
              )
            : h(NS.Callout, { tone: "note", title: "Choose your dates" },
                "Pick the night you arrive and the night you leave, and the full price appears here.")
        );

    return h(NS.Drawer, {
      open: true, onClose: props.onClose, title: done[0] ? "Request sent" : "Reserve", label: "Reserve this house",
      side: "right", width: 440,
      footer: done[0] ? null : h(NS.Stack, { gap: "xs", style: { width: "100%" } },
        h(NS.Button, {
          fullWidth: true, disabled: !nights,
          onClick: function () {
            done[1](true);
            props.onConfirm(s, nights, total);
          }
        }, nights ? "Request " + nights + " nights · " + money(total) : "Choose dates to continue"),
        h("p", { className: "mv-fine", style: { textAlign: "center" } }, "You will not be charged yet.")
      )
    }, body);
  }

  /* ----------------------------------------------------------------- saved drawer */

  function SavedDrawer(props) {
    var list = D.STAYS.filter(function (s) { return props.saved.indexOf(s.id) !== -1; });
    return h(NS.Drawer, {
      open: props.open, onClose: props.onClose, title: "Saved houses", label: "Saved houses",
      side: "right", width: 400
    },
      list.length
        ? h(NS.List, {
            label: "Saved houses", divided: true,
            items: list.map(function (s) {
              return {
                id: s.id,
                leading: h("img", { src: s.hero, alt: "", width: 56, height: 56,
                  style: { borderRadius: "var(--dt-radius-media)", objectFit: "cover", display: "block" } }),
                title: s.name,
                description: s.place + " · " + money(s.rate) + " a night",
                trailing: h(NS.Button, { size: "sm", variant: "ghost",
                  onClick: function () { props.onOpen(s); } }, "Open")
              };
            })
          })
        : h(NS.EmptyState, {
            title: "Nothing saved yet",
            description: "Tap the heart on a house and it will wait for you here, on this device.",
            action: h(NS.Button, { onClick: function () { props.onClose(); scrollToId("stays"); } }, "Browse the houses")
          })
    );
  }

  /* ----------------------------------------------------------------- atmosphere
     A full-screen stage that plays each scene as a small build: its layers arrive back
     to front (background wash, then a mid crop, then the sharp foreground), hold
     together, then leave front to back while the next scene's wash is already arriving
     underneath, so the stage is never empty between the two. The whole sequence is one
     data-driven timeline (buildTimeline below) rather than a chain of hand-timed
     setTimeouts scattered through the component: the number of layers is the only input,
     and adding a fourth layer to a scene's data needs no change here. */

  /* A crop describes a rectangle ("top right bottom left", matching inset()'s own
     order) that a layer wants visible. Rather than clip to it with a hard edge, this
     turns the same numbers into a radial mask centred on that rectangle, so what shows
     fades out toward the rectangle's own edges instead of stopping at them — a soft
     reveal instead of a window, which is the point of calling this a wash. */
  function cropMask(crop) {
    if (crop === "none") return undefined;
    var n = crop.split(" ").map(parseFloat);
    var top = n[0], right = n[1], bottom = n[2], left = n[3];
    var cx = left + (100 - left - right) / 2;
    var cy = top + (100 - top - bottom) / 2;
    var rx = (100 - left - right) / 2 + 14;
    var ry = (100 - top - bottom) / 2 + 14;
    return "radial-gradient(" + rx + "% " + ry + "% at " + cx + "% " + cy + "%, #000 50%, transparent 100%)";
  }

  function buildTimeline(layerCount) {
    var BUILD_STEP = 750;   /* ms between one layer starting and the next */
    var LAYER_IN = 1600;    /* matches .mv-av-layer's transition-duration */
    var HOLD = 2600;        /* ms the fully-built scene sits before it starts to leave */
    var RECEDE_STEP = 550;  /* ms between one layer leaving and the next */
    var LAYER_OUT = 1100;   /* matches .mv-av-layer[data-recede]'s transition-duration */

    var events = [];
    for (var i = 0; i < layerCount; i++) events.push({ i: i, on: true, at: i * BUILD_STEP });

    var buildEnd = (layerCount - 1) * BUILD_STEP + LAYER_IN;
    var recedeStart = buildEnd + HOLD;
    /* Front (the last, sharpest layer) leaves first, back (the wash) leaves last — the
       build in reverse, so the scene reads as dissolving rather than just cutting. */
    for (var j = 0; j < layerCount; j++) {
      events.push({ i: layerCount - 1 - j, on: false, at: recedeStart + j * RECEDE_STEP });
    }

    var total = recedeStart + (layerCount - 1) * RECEDE_STEP + LAYER_OUT;
    return { events: events, total: total, baseSwapAt: Math.max(0, recedeStart - 200) };
  }

  function Atmosphere() {
    var scenes = D.ATMOSPHERE;
    var sceneIndex = useState(0);
    var layerOn = useState(function () { return scenes[0].layers.map(function () { return false; }); });
    var recede = useState(false);
    var sectionRef = useRef(null);
    var inView = useState(false);
    var timers = useRef([]);

    useEffect(function () {
      var el = sectionRef.current;
      if (!el) return;
      var io = new IntersectionObserver(function (entries) {
        inView[1](entries[0].isIntersecting);
      }, { threshold: 0.35 });
      io.observe(el);
      return function () { io.disconnect(); };
    }, []);

    useEffect(function () {
      timers.current.forEach(clearTimeout);
      timers.current = [];

      var scene = scenes[sceneIndex[0]];
      layerOn[1](scene.layers.map(function () { return false; }));
      recede[1](false);

      /* Off screen, or asking for less motion: show the scene fully built, at rest, and
         do not schedule the chain that would otherwise move it along or advance it. */
      if (!inView[0] || reduceMotion) {
        layerOn[1](scene.layers.map(function () { return true; }));
        return;
      }

      var tl = buildTimeline(scene.layers.length);
      tl.events.forEach(function (e) {
        timers.current.push(setTimeout(function () {
          if (!e.on) recede[1](true);
          layerOn[1](function (prev) {
            var next = prev.slice();
            next[e.i] = e.on;
            return next;
          });
        }, e.at));
      });
      timers.current.push(setTimeout(function () {
        sceneIndex[1](function (i) { return (i + 1) % scenes.length; });
      }, tl.total));

      return function () { timers.current.forEach(clearTimeout); timers.current = []; };
    }, [sceneIndex[0], inView[0]]);

    var scene = scenes[sceneIndex[0]];

    return h("section", { className: "mv-atmosphere", ref: sectionRef, "aria-roledescription": "carousel", "aria-label": "A few of the scenes" },
      h("div", { className: "mv-atmosphere-base" },
        scenes.map(function (s, i) {
          return h("img", {
            key: s.id, src: s.layers[0].src, alt: "",
            "data-on": i === sceneIndex[0] ? "true" : "false"
          });
        })
      ),
      h("div", { className: "mv-atmosphere-stage" },
        scene.layers.map(function (layer, i) {
          return h("img", {
            key: scene.id + i, className: "mv-av-layer", src: layer.src, alt: i === scene.layers.length - 1 ? scene.place : "",
            "data-on": layerOn[0][i] ? "true" : "false",
            "data-recede": recede[0] && !layerOn[0][i] ? "true" : "false",
            style: {
              /* Real cutout artwork carries its own alpha edge and needs neither of
                 these: a layer only gets a mask when it is cropped from the flattened
                 source, which today's placeholder layers are and a real layer would not
                 be. */
              WebkitMaskImage: cropMask(layer.crop), maskImage: cropMask(layer.crop),
              objectPosition: layer.position,
              "--av-scale": layer.scale,
              "--av-delay": i * 750 + "ms",
              "--av-recede-delay": (scene.layers.length - 1 - i) * 550 + "ms"
            }
          });
        })
      ),
      h("div", { className: "mv-atmosphere-scrim", "aria-hidden": "true" }),
      h("div", { className: "mv-atmosphere-copy" },
        h("div", { className: "mv-shell" },
          h(NS.Stack, { gap: "xs" },
            h("span", { className: "mv-eyebrow" }, "A few of the scenes"),
            h("h2", { className: "mv-atmosphere-place" }, scene.place),
            h("p", { className: "mv-lead", style: { color: "inherit" } }, scene.caption)
          ),
          h("div", { className: "mv-atmosphere-dots", role: "tablist", "aria-label": "Scene" },
            scenes.map(function (s, i) {
              return h("button", {
                key: s.id, type: "button", className: "mv-atmosphere-dot", role: "tab",
                "aria-selected": i === sceneIndex[0] ? "true" : "false", "aria-label": "Show " + s.place,
                onClick: function () { sceneIndex[1](i); }
              });
            })
          )
        )
      )
    );
  }

  /* ----------------------------------------------------------------- story */

  function Story() {
    var active = useState(0);
    var refs = useRef([]);
    var mobileRef = useRef(isNarrow());
    useEffect(function () {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) active[1](Number(e.target.getAttribute("data-step")));
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      refs.current.forEach(function (n) { if (n) io.observe(n); });
      return function () { io.disconnect(); };
    }, []);

    /* The visual is sticky only above 860px (see .mv-story-visual in theme.css); below
       that it sits once, above the steps, and scrolls away with the rest of the page, so
       the reader never lingers on it the way the sticky version assumes. There it cycles
       on a timer instead. Both this and the observer above write the same active index,
       so a real scroll through the steps still wins the moment it happens; the timer
       only fills the gap while nothing is scrolling. */
    useEffect(function () {
      var stop = watchNarrow(function (v) { mobileRef.current = v; });
      if (reduceMotion) return stop;
      var id = setInterval(function () {
        if (!mobileRef.current) return;
        active[1](function (i) { return (i + 1) % D.STORY.length; });
      }, 3200);
      return function () { clearInterval(id); stop(); };
    }, []);

    return h("section", { className: "mv-sec", id: "how" },
      h("div", { className: "mv-shell" },
        h(NS.Stack, { gap: "2xl" },
          h(NS.Stack, { gap: "xs", "data-reveal": "" },
            h("span", { className: "mv-eyebrow" }, "How it works"),
            h("h2", { className: "mv-h2" }, "Three steps, one person at the other end")
          ),
          h("div", { className: "mv-story" },
            h("div", { className: "mv-story-visual" },
              D.STORY.map(function (s, i) {
                return h("img", { key: s.id, src: s.visual, alt: "", loading: "lazy",
                  "data-on": i === active[0] ? "true" : "false" });
              })
            ),
            h("div", null,
              D.STORY.map(function (s, i) {
                return h("div", {
                  key: s.id, className: "mv-step", "data-step": i,
                  "data-on": i === active[0] ? "true" : "false",
                  ref: function (n) { refs.current[i] = n; }
                },
                  h(NS.Stack, { gap: "sm" },
                    h("span", { className: "mv-step-index" }, i + 1),
                    h("h3", { className: "mv-h3" }, s.title),
                    h("p", { className: "mv-lead", style: { fontSize: "var(--dt-text-body-md-size)" } }, s.body)
                  )
                );
              })
            )
          )
        )
      )
    );
  }

  /* ----------------------------------------------------------------- page */

  function App() {
    var heroRef = useRef(null), headerRef = useRef(null);
    var overPhoto = useState(true);
    var search = useState({ where: "", from: null, to: null, guests: 2 });
    var collection = useState("all");
    var maxRate = useState(700);
    var sort = useState("curated");
    var saved = useState(function () {
      try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) { return []; }
    });
    var detail = useState(null);
    var booking = useState(null);
    var savedOpen = useState(false);
    var toasts = useState([]);
    var mode = useState(function () {
      try { return localStorage.getItem(MODE_KEY) || "light"; } catch (e) { return "light"; }
    });

    var setOverPhoto = useCallback(function (v) {
      overPhoto[1](function (prev) { return prev === v ? prev : v; });
    }, []);
    useScrollEffects(heroRef, headerRef, setOverPhoto);

    /* One flag for every overlay, so the fixed header can drop below the scrim. */
    var overlayOpen = !!detail[0] || !!booking[0] || savedOpen[0];
    useEffect(function () {
      document.documentElement.setAttribute("data-overlay", overlayOpen ? "true" : "false");
    }, [overlayOpen]);

    useEffect(function () {
      document.documentElement.classList.toggle("dark", mode[0] === "dark");
      try { localStorage.setItem(MODE_KEY, mode[0]); } catch (e) {}
    }, [mode[0]]);

    useEffect(function () {
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved[0])); } catch (e) {}
    }, [saved[0]]);

    var notify = useCallback(function (title, body) {
      var id = Date.now() + Math.random();
      toasts[1](function (list) { return list.concat([{ id: id, title: title, body: body }]); });
      setTimeout(function () {
        toasts[1](function (list) { return list.filter(function (t) { return t.id !== id; }); });
      }, 3600);
    }, []);

    function toggleSave(s) {
      var has = saved[0].indexOf(s.id) !== -1;
      saved[1](has ? saved[0].filter(function (x) { return x !== s.id; }) : saved[0].concat([s.id]));
      notify(has ? "Removed from saved" : "Saved " + s.name, has ? null : "It will wait for you in Saved.");
    }

    var list = useMemo(function () {
      var where = search[0].where.trim().toLowerCase();
      var out = D.STAYS.filter(function (s) {
        if (collection[0] !== "all" && s.collection !== collection[0]) return false;
        if (s.rate > maxRate[0]) return false;
        if (s.guests < search[0].guests) return false;
        if (where && (s.place + " " + s.name + " " + s.collectionLabel).toLowerCase().indexOf(where) === -1) return false;
        return true;
      });
      if (sort[0] === "low") out = out.slice().sort(function (a, b) { return a.rate - b.rate; });
      if (sort[0] === "high") out = out.slice().sort(function (a, b) { return b.rate - a.rate; });
      if (sort[0] === "rated") out = out.slice().sort(function (a, b) { return b.rating - a.rating; });
      return out;
    }, [collection[0], maxRate[0], sort[0], search[0].where, search[0].guests]);

    useReveal(list.length + "-" + collection[0]);

    function pickCollection(id) {
      collection[1](id === collection[0] ? "all" : id);
      scrollToId("stays");
    }

    var tabs = [{ id: "all", label: "Everywhere", count: D.STAYS.length }].concat(
      D.COLLECTIONS.map(function (c) {
        return { id: c.id, label: c.label, count: D.STAYS.filter(function (s) { return s.collection === c.id; }).length };
      }).concat([{ id: "countryside", label: "Countryside", count: D.STAYS.filter(function (s) { return s.collection === "countryside"; }).length }])
        .filter(function (t) { return t.count > 0; })
    );

    var featured = D.STAYS.filter(function (s) { return s.featured; })[0];

    return h(F, null,
      h(Header, {
        headerRef: headerRef, savedCount: saved[0].length, mode: mode[0], overPhoto: overPhoto[0],
        onToggleMode: function () { mode[1](mode[0] === "dark" ? "light" : "dark"); },
        onOpenSaved: function () { savedOpen[1](true); }
      }),

      h("main", null,
        h(Hero, {
          heroRef: heroRef, search: search[0],
          onSearch: function (patch) { search[1](Object.assign({}, search[0], patch)); },
          onSubmit: function () {
            scrollToId("stays");
            notify("Showing what is free", search[0].where ? "Filtered to " + search[0].where + "." : "All twelve houses, newest first.");
          },
          onPickCollection: pickCollection
        }),

        /* ---------------------------------------------------------- collections */
        h("section", { className: "mv-sec", id: "collections" },
          h("div", { className: "mv-shell mv-shell--wide" },
            h(NS.Stack, { gap: "xl" },
              h(NS.Inline, { justify: "space-between", align: "end", wrap: true, gap: "md", "data-reveal": "" },
                h(NS.Stack, { gap: "xs" },
                  h("span", { className: "mv-eyebrow" }, "Collections"),
                  h("h2", { className: "mv-h2" }, "Start with the landscape")
                ),
                h("p", { className: "mv-small", style: { maxWidth: "36ch" } },
                  "Five kinds of week. Choose one and the list below follows.")
              ),
              h(Collections, { selected: collection[0], onPick: pickCollection })
            )
          )
        ),

        /* ---------------------------------------------------------- atmosphere */
        h(Atmosphere),

        /* ---------------------------------------------------------- featured */
        featured ? h("section", { className: "mv-band mv-sec", "data-wash": "tan" },
          h("img", { src: D.TEX + "patchwork.webp", alt: "", loading: "lazy" }),
          h("div", { className: "mv-shell mv-shell--wide" },
            h(NS.Media, {
              gap: "2xl", align: "center", minColumnWidth: "320px",
              media: h("div", { "data-reveal": "", style: { borderRadius: "var(--dt-radius-container)", overflow: "hidden", boxShadow: "var(--dt-elevation-4)" } },
                h("img", { src: featured.gallery[0], alt: featured.name, loading: "lazy",
                  style: { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" } })),
              eyebrow: h("span", { className: "mv-eyebrow" }, "House of the season"),
              title: h("h2", { className: "mv-h2" }, featured.name),
              body: h(NS.Stack, { gap: "md" },
                h("p", { className: "mv-lead" }, featured.story),
                h(NS.Inline, { gap: "xl", wrap: true },
                  h(NS.Stat, { label: "From", value: money(featured.rate), caption: "a night, all in" }),
                  h(NS.Stat, { label: "Sleeps", value: String(featured.guests), caption: featured.beds + " bedrooms" }),
                  h(NS.Stat, { label: "Rated", value: featured.rating.toFixed(2), caption: featured.reviews + " stays" })
                )
              ),
              actions: h(NS.Inline, { gap: "sm", wrap: true },
                h(NS.Button, { size: "lg", onClick: function () { booking[1](featured); } }, "Check availability"),
                h(NS.Button, { size: "lg", variant: "secondary", onClick: function () { detail[1](featured); } }, "See the house")
              )
            })
          )
        ) : null,

        /* ---------------------------------------------------------- stays */
        h("section", { className: "mv-sec", id: "stays" },
          h("div", { className: "mv-shell mv-shell--wide" },
            h(NS.Stack, { gap: "xl" },
              h(NS.Stack, { gap: "xs", "data-reveal": "" },
                h("span", { className: "mv-eyebrow" }, "The list"),
                h("h2", { className: "mv-h2" }, "Every house we have this season"),
                h("p", { className: "mv-lead" }, "Twelve homes, eight of them free in the next three months. Filter them the way you would describe them out loud.")
              ),

              h("div", { className: "mv-filterbar", role: "group", "aria-label": "Filter the houses" },
                h("div", { className: "mv-grow", style: { minWidth: 0 } },
                  h(NS.Tabs, {
                    label: "Collection", variant: "pill", value: collection[0], onChange: collection[1], tabs: tabs
                  })
                ),
                h("div", { style: { minWidth: 180 } },
                  h(NS.Slider, {
                    label: "Up to", min: 200, max: 700, step: 10, value: maxRate[0], onChange: maxRate[1],
                    showValue: true, formatValue: function (v) { return v >= 700 ? "any price" : money(v); }
                  })
                ),
                h("div", { style: { minWidth: 170 } },
                  h(NS.Select, {
                    label: "Sort", size: "sm", value: sort[0],
                    onChange: function (e) { sort[1](e.target.value); },
                    options: [
                      { value: "curated", label: "Our order" },
                      { value: "rated", label: "Best rated" },
                      { value: "low", label: "Price, low first" },
                      { value: "high", label: "Price, high first" }
                    ]
                  })
                )
              ),

              h(NS.Inline, { justify: "space-between", align: "center", wrap: true, gap: "sm" },
                h("p", { className: "mv-small", "aria-live": "polite" },
                  list.length + (list.length === 1 ? " house" : " houses") +
                  (search[0].guests > 1 ? " that sleep " + search[0].guests : "")),
                (collection[0] !== "all" || maxRate[0] < 700 || search[0].where)
                  ? h(NS.Button, { variant: "ghost", size: "sm", onClick: function () {
                      collection[1]("all"); maxRate[1](700);
                      search[1](Object.assign({}, search[0], { where: "" }));
                    } }, "Clear filters")
                  : null
              ),

              list.length
                ? h("div", { className: "mv-grid" },
                    list.map(function (s, i) {
                      return h(StayCard, {
                        key: s.id, stay: s, index: i,
                        saved: saved[0].indexOf(s.id) !== -1,
                        onSave: toggleSave, onOpen: function (x) { detail[1](x); }
                      });
                    })
                  )
                : h(NS.EmptyState, {
                    title: "No house matches that",
                    description: "Try a wider price, fewer guests, or everywhere. The list is short on purpose.",
                    action: h(NS.Button, { variant: "secondary", onClick: function () {
                      collection[1]("all"); maxRate[1](700);
                      search[1]({ where: "", from: null, to: null, guests: 1 });
                    } }, "Show everything")
                  })
            )
          )
        ),

        /* ---------------------------------------------------------- story */
        h(Story),

        /* ---------------------------------------------------------- quote band */
        h("section", { className: "mv-band mv-sec", "data-wash": "paper" },
          h("img", { src: D.TEX + "delta.webp", alt: "", loading: "lazy" }),
          h("div", { className: "mv-shell mv-shell--narrow mv-center" },
            h(NS.Stack, { gap: "lg", align: "center", "data-reveal": "" },
              h(NS.Quote, { size: "lg", attribution: "Eleanor Whitfield", role: "Four stays with us",
                avatar: h(NS.Avatar, { name: "Eleanor Whitfield" }) },
                "They asked how we wanted the week to feel, then sent three houses. We took the second one and have been back twice."),
              h(NS.Inline, { gap: "2xl", wrap: true, justify: "center" },
                h(NS.Stat, { label: "Houses", value: "12", caption: "this season", align: "center" }),
                h(NS.Stat, { label: "Average rating", value: "4.9", caption: "across 861 stays", align: "center" }),
                h(NS.Stat, { label: "Answered in", value: "6", unit: "h", caption: "by a person", align: "center" })
              )
            )
          )
        ),

        /* ---------------------------------------------------------- included */
        h("section", { className: "mv-sec", id: "included" },
          h("div", { className: "mv-shell" },
            h(NS.Stack, { gap: "xl" },
              h(NS.Stack, { gap: "xs", className: "mv-center", "data-reveal": "" },
                h("span", { className: "mv-eyebrow" }, "What's included"),
                h("h2", { className: "mv-h2" }, "The things we sort before you land"),
                h("p", { className: "mv-lead" }, "Every house carries its own list. These twelve turn up often enough to be painted.")
              ),
              h("div", { className: "mv-icons" },
                Object.keys(D.AMENITIES).map(function (k, i) {
                  return h("div", { key: k, className: "mv-icon", "data-reveal": "", style: { "--mv-delay": (i % 6) * 60 + "ms" } },
                    h("img", { src: D.ICON + k + ".webp", alt: "", loading: "lazy" }),
                    h("span", { style: { fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-medium)" } }, D.AMENITIES[k].label),
                    h("span", { className: "mv-fine" }, D.AMENITIES[k].note)
                  );
                })
              )
            )
          )
        ),

        /* ---------------------------------------------------------- journal */
        h("section", { className: "mv-band mv-sec", "data-wash": "deep" },
          h("img", { src: D.TEX + "dunes.webp", alt: "", loading: "lazy" }),
          h("div", { className: "dark mv-on-photo" },
            h("div", { className: "mv-shell mv-shell--narrow mv-center" },
              h(NS.Stack, { gap: "lg", align: "center", "data-reveal": "" },
                h("span", { className: "mv-eyebrow", style: { color: "inherit", opacity: 0.85 } }, "The letter"),
                h("h2", { className: "mv-h2" }, "Four houses, four times a year"),
                h("p", { className: "mv-lead", style: { color: "inherit", opacity: 0.88 } },
                  "We write when a season's houses open, and at no other time. No offers, no countdowns."),
                h(Journal, { onDone: notify })
              )
            )
          )
        )
      ),

      h(Footer),

      detail[0] ? h(StayDialog, {
        stay: detail[0], saved: saved[0].indexOf(detail[0].id) !== -1,
        onClose: function () { detail[1](null); }, onSave: toggleSave,
        onBook: function (s) { detail[1](null); booking[1](s); }
      }) : null,

      booking[0] ? h(BookingDrawer, {
        stay: booking[0], search: search[0],
        onClose: function () { booking[1](null); },
        onConfirm: function (s, nights, total) {
          notify("Request sent to " + s.host, nights + " nights, " + money(total) + " in total.");
        }
      }) : null,

      h(SavedDrawer, {
        open: savedOpen[0], saved: saved[0],
        onClose: function () { savedOpen[1](false); },
        onOpen: function (s) { savedOpen[1](false); detail[1](s); }
      }),

      h(NS.ToastRegion, { placement: "bottom-right", label: "Notifications" },
        toasts[0].map(function (t) {
          return h(NS.Toast, { key: t.id, tone: "success", title: t.title,
            onDismiss: function () { toasts[1](toasts[0].filter(function (x) { return x.id !== t.id; })); }
          }, t.body);
        })
      )
    );
  }

  function Journal(props) {
    var email = useState("");
    var err = useState("");
    var done = useState(false);
    if (done[0]) {
      return h(NS.Alert, { tone: "success", title: "You are on the list" },
        "The next letter goes out when the spring houses open.");
    }
    return h("form", {
      noValidate: true, style: { width: "100%", maxWidth: "26rem" },
      onSubmit: function (e) {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email[0])) { err[1]("Enter an email address like name@example.com."); return; }
        done[1](true);
        props.onDone("You are on the list", "Four letters a year, no more.");
      }
    },
      h(NS.Inline, { gap: "sm", align: "end", wrap: true },
        h("div", { style: { flex: "1 1 15rem" } },
          h(NS.Input, {
            label: "Email", type: "email", value: email[0], autoComplete: "email",
            error: err[0] || undefined,
            onChange: function (e) { email[1](e.target.value); err[1](""); }
          })),
        h(NS.Button, { type: "submit", size: "lg" }, "Send it to me")
      )
    );
  }

  function Footer() {
    var cols = [
      { title: "Collections", items: D.COLLECTIONS.map(function (c) { return c.label; }) },
      { title: "Meridian", items: ["How it works", "What's included", "Our hosts", "The letter"] },
      { title: "Practical", items: ["Cancellation", "Travel insurance", "Accessibility", "Contact"] }
    ];
    return h("footer", { className: "mv-footer" },
      h("div", { className: "mv-shell mv-shell--wide" },
        h(NS.Stack, { gap: "2xl" },
          h("div", { className: "mv-footer-cols" },
            h(NS.Stack, { gap: "sm" },
              h("span", { className: "mv-wordmark" }, "Meridian"),
              h("p", { className: "mv-small", style: { maxWidth: "34ch" } },
                "A short list of houses, held by the people who keep them. Written to and answered by a person, in Lisbon and Turin."),
              h(NS.Inline, { gap: "xs", align: "center" },
                h("span", { style: { color: "var(--dt-text-tertiary)" } }, Icon.pin(16)),
                h("span", { className: "mv-fine" }, "Rua do Alecrim 42, Lisbon"))
            ),
            cols.map(function (c) {
              return h(NS.Stack, { key: c.title, gap: "sm" },
                h("strong", { style: { fontSize: "var(--dt-text-label-md-size)" } }, c.title),
                h("ul", null, c.items.map(function (i) {
                  return h("li", { key: i }, h("a", { href: "#included",
                    onClick: function (e) { e.preventDefault(); scrollToId("included"); } }, i));
                }))
              );
            })
          ),
          h(NS.Divider),
          h(NS.Inline, { justify: "space-between", wrap: true, gap: "sm" },
            h("p", { className: "mv-fine" },
              "Meridian is a fictional company, built to show the Dovetail design system. Nothing here can be booked."),
            h("p", { className: "mv-fine" }, "Photography and illustration by the client.")
          )
        )
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
