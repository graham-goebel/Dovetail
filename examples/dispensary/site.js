/* Low Meadow — shared page chrome and data.

   Every page loads React, the Dovetail component bundle, then this file, then calls
   LM.mount(Page). This file owns what every page shares: the product list, the header
   with the pickup bag, the footer, and the age check. It is written with
   React.createElement rather than JSX so the pages run with no build step. */
(function () {
  var NS = window.BeamMobileDesignSystem_e33121;
  var h = React.createElement;
  var BAG_KEY = "lowmeadow-bag";
  var AGE_KEY = "lowmeadow-age-ok";

  /* Follow the reader's OS setting; base-dark.css does the rest. */
  try {
    if (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}

  var PRODUCTS = [
    {
      id: "meadow-haze", name: "Meadow Haze", category: "flower", type: "Sativa",
      thc: 24, cbd: 0.1, price: 45, size: "3.5g", img: "img/flower-bud.png",
      effects: ["Uplifted", "Creative", "Focused"], terpenes: ["Terpinolene", "Myrcene", "Ocimene"],
      blurb: "Dense, frosty buds with orange pistils and a bright citrus nose.",
      body: "Grown indoors by a family farm two counties over, hang-dried for 14 days and cured in glass. Meadow Haze is the one our staff reach for on a Saturday morning: clear-headed, social, and easy to carry into an afternoon ride."
    },
    {
      id: "harvest-jar", name: "Harvest reserve", category: "flower", type: "Hybrid",
      thc: 21, cbd: 0.4, price: 180, size: "28g", img: "img/flower-jar.png",
      effects: ["Balanced", "Relaxed", "Happy"], terpenes: ["Caryophyllene", "Limonene", "Linalool"],
      blurb: "A full ounce of our house hybrid, packed in a reusable glass jar.",
      body: "Our best value by the gram. Each reserve jar is filled from a single harvest and dated on the lid, so you know exactly how fresh it is. Bring the jar back for 10% off your next fill."
    },
    {
      id: "low-tide", name: "Low tide", category: "flower", type: "Indica",
      thc: 19, cbd: 1.2, price: 38, size: "3.5g", img: "img/flower-bud.png",
      effects: ["Calm", "Sleepy", "Body relief"], terpenes: ["Myrcene", "Linalool", "Humulene"],
      blurb: "Earthy, sweet, and slow. An evening flower for winding down.",
      body: "Low tide is a heavy-resin indica with a lavender finish from its linalool. Start low: most guests find a single session is plenty for a quiet night in."
    },
    {
      id: "sunday-mix", name: "Sunday mix", category: "flower", type: "Hybrid",
      thc: 16, cbd: 6, price: 32, size: "3.5g", img: "img/flower-jar.png",
      effects: ["Mellow", "Clear", "Social"], terpenes: ["Pinene", "Caryophyllene", "Myrcene"],
      blurb: "A gentle 3:1 THC to CBD blend for first-timers and returning guests.",
      body: "Sunday mix is where we start most people who tell us they have not tried cannabis in years. The CBD rounds off the edges, so it stays light and conversational."
    },
    {
      id: "globe-bubbler", name: "Globe bubbler", category: "glass", type: "Accessory",
      price: 64, size: "7 in", img: "img/glass-bubbler.png",
      effects: [], terpenes: [],
      blurb: "Hand-blown borosilicate with a round base and a diffused downstem.",
      body: "Made in small batches by a glassblower in the valley. The wide globe keeps water from splashing, the 14mm joint takes any standard bowl, and the smoky tint hides a little residue between cleanings."
    },
    {
      id: "clear-bubbler", name: "Studio bubbler", category: "glass", type: "Accessory",
      price: 48, size: "6 in", img: "img/glass-bubbler.png",
      effects: [], terpenes: [],
      blurb: "The same studio shape in a lighter, clear glass for everyday use.",
      body: "A smaller, lighter version of our globe bubbler. It fits in a drawer, cleans in minutes with alcohol and salt, and comes with a matching bowl."
    },
    {
      id: "meadow-seeds", name: "Meadow Haze seeds", category: "seeds", type: "Sativa",
      price: 60, size: "5 seeds", img: "img/seeds.png",
      effects: [], terpenes: ["Terpinolene", "Myrcene"],
      blurb: "Feminized seeds from the same line as our best-selling flower.",
      body: "Five feminized seeds, germination tested at 90% or better. Suited to indoor tents and sunny balconies, with a flowering time of about 9 weeks. Check your local limits on home plants before you grow."
    },
    {
      id: "starter-seeds", name: "Starter seed pack", category: "seeds", type: "Hybrid",
      price: 45, size: "4 seeds", img: "img/seeds.png",
      effects: [], terpenes: ["Caryophyllene", "Limonene"],
      blurb: "Four forgiving autoflower hybrids chosen for first-time growers.",
      body: "Autoflowers do not need a light schedule, which makes them the easiest place to start. Each pack comes with a one-page grow card written by our staff."
    }
  ];

  var CATEGORIES = [
    { id: "flower", label: "Flower", img: "img/flower-bud.png", blurb: "Small-farm flower, dated and cured in glass." },
    { id: "glass", label: "Glass", img: "img/glass-bubbler.png", blurb: "Hand-blown pieces from local studios." },
    { id: "seeds", label: "Seeds", img: "img/seeds.png", blurb: "Tested genetics for growing at home." }
  ];

  var TYPE_TONE = { Sativa: "warning", Indica: "info", Hybrid: "success", Accessory: "neutral" };

  function find(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function money(n) { return "$" + n.toFixed(0); }

  /* ------------------------------------------------------------------ bag store
     A pickup reservation, held in this browser. Components subscribe through useBag. */
  var listeners = [];
  function readBag() {
    try { return JSON.parse(localStorage.getItem(BAG_KEY)) || []; } catch (e) { return []; }
  }
  var bag = readBag();
  function setBag(next) {
    bag = next;
    try { localStorage.setItem(BAG_KEY, JSON.stringify(next)); } catch (e) {}
    listeners.forEach(function (fn) { fn(next); });
  }
  function addToBag(id, qty) {
    var next = bag.slice(), found = false;
    for (var i = 0; i < next.length; i++) {
      if (next[i].id === id) { next[i] = { id: id, qty: next[i].qty + (qty || 1) }; found = true; }
    }
    if (!found) next.push({ id: id, qty: qty || 1 });
    setBag(next);
    notify(find(id).name + " is in your bag");
  }
  function removeFromBag(id) { setBag(bag.filter(function (l) { return l.id !== id; })); }
  function useBag() {
    var s = React.useState(bag);
    React.useEffect(function () {
      listeners.push(s[1]);
      return function () { listeners = listeners.filter(function (f) { return f !== s[1]; }); };
    }, []);
    return s[0];
  }

  /* ------------------------------------------------------------------ toasts */
  var toastListener = null;
  function notify(msg) { if (toastListener) toastListener(msg); }

  /* ------------------------------------------------------------------ chrome */
  var PAGES = [
    { id: "home", label: "Home", href: "index.html" },
    { id: "shop", label: "Shop", href: "shop.html" },
    { id: "visit", label: "Visit", href: "visit.html" }
  ];

  function Header(props) {
    var lines = useBag();
    var count = lines.reduce(function (n, l) { return n + l.qty; }, 0);
    var open = React.useState(false);
    return h(React.Fragment, null,
      h(NS.Navbar, {
        sticky: true, current: props.current, label: "Main",
        brand: h("a", { href: "index.html", className: "lm-wordmark" }, "Low Meadow"),
        links: PAGES,
        actions: h(NS.Button, {
          size: "sm", variant: count ? "primary" : "secondary",
          onClick: function () { open[1](true); },
          "aria-label": "Open bag, " + count + (count === 1 ? " item" : " items"),
          iconEnd: count ? h("span", { className: "lm-bag-count", "aria-hidden": true, style: { background: "var(--dt-text-on-action)", color: "var(--dt-surface-action)" } }, count) : null
        }, "Bag")
      }),
      h(BagDrawer, { open: open[0], onClose: function () { open[1](false); }, lines: lines })
    );
  }

  function BagDrawer(props) {
    var lines = props.lines;
    var total = lines.reduce(function (n, l) { var p = find(l.id); return n + (p ? p.price * l.qty : 0); }, 0);
    var reserved = React.useState(false);
    function close() { reserved[1](false); props.onClose(); }
    var body;
    if (reserved[0]) {
      body = h(NS.EmptyState, {
        title: "Your order is reserved",
        description: "We will hold it at the counter for 24 hours. Bring a government-issued ID that shows you are 21 or older; you pay at pickup.",
        action: h(NS.Button, { onClick: close }, "Done")
      });
    } else if (!lines.length) {
      body = h(NS.EmptyState, {
        title: "Your bag is empty",
        description: "Add flower, glass, or seeds from the shop and reserve them for pickup.",
        action: h(NS.Button, { as: "a", href: "shop.html" }, "Browse the shop")
      });
    } else {
      body = h(NS.List, {
        label: "Items in your bag", divided: true,
        items: lines.map(function (l) {
          var p = find(l.id);
          if (!p) return { id: l.id, title: l.id };
          return {
            id: l.id,
            leading: h("img", { src: p.img, alt: "", width: 48, height: 48, style: { borderRadius: "var(--dt-radius-media)", objectFit: "cover", display: "block" } }),
            title: p.name,
            description: l.qty + " × " + p.size + " · " + money(p.price * l.qty),
            trailing: h(NS.Button, { size: "sm", variant: "ghost", onClick: function () { removeFromBag(l.id); } }, "Remove")
          };
        })
      });
    }
    return h(NS.Drawer, {
      open: props.open, onClose: close, title: "Your bag", label: "Your bag", width: 400,
      footer: lines.length && !reserved[0] ? h(NS.Stack, { gap: "sm", style: { width: "100%" } },
        h(NS.Inline, { justify: "space-between" }, h("span", null, "Estimated total"), h("strong", null, money(total))),
        h("p", { className: "lm-small" }, "Tax is added at the counter. You pay when you pick up."),
        h(NS.Button, { fullWidth: true, onClick: function () { reserved[1](true); setBag([]); } }, "Reserve for pickup")
      ) : null
    }, body);
  }

  function Footer() {
    return h("footer", { className: "lm-footer" },
      h("div", null,
        h(NS.Stack, { gap: "sm" },
          h("span", { className: "lm-wordmark" }, "Low Meadow"),
          h("p", { className: "lm-small", style: { maxWidth: "40ch" } }, "A neighbourhood dispensary for small-farm flower, local glass, and seeds. 418 Orchard Street. Open every day, 10am to 9pm.")
        ),
        h(NS.Stack, { gap: "sm" },
          h("strong", null, "Shop"),
          h("ul", null,
            CATEGORIES.map(function (c) { return h("li", { key: c.id }, h("a", { href: "shop.html?category=" + c.id }, c.label)); })
          )
        ),
        h(NS.Stack, { gap: "sm" },
          h("strong", null, "Visit"),
          h("ul", null,
            h("li", null, h("a", { href: "visit.html" }, "Hours and directions")),
            h("li", null, h("a", { href: "visit.html#faq" }, "First visit questions")),
            h("li", null, h("a", { href: "../../index.html" }, "Built with Dovetail"))
          )
        ),
        h("p", { className: "lm-fine" }, "For use only by adults 21 and older. Keep out of reach of children and pets. Do not drive or operate machinery after use. Low Meadow is a fictional store made to demonstrate the Dovetail design system; nothing here is for sale.")
      )
    );
  }

  function AgeGate() {
    var ok = false;
    try { ok = localStorage.getItem(AGE_KEY) === "yes"; } catch (e) {}
    var s = React.useState(!ok);
    var denied = React.useState(false);
    function confirm() {
      try { localStorage.setItem(AGE_KEY, "yes"); } catch (e) {}
      s[1](false);
    }
    return h(NS.Dialog, {
      open: s[0], size: "sm",
      onClose: function () { denied[1](true); },
      title: denied[0] ? "Come back when you are 21" : "Are you 21 or older?",
      description: denied[0]
        ? "You need to be 21 or older to view this site. If you pressed the wrong button, you can still confirm."
        : "Low Meadow sells cannabis. You need to be 21 or older to browse the shop.",
      footer: [
        h(NS.Button, { key: "no", variant: "secondary", onClick: function () { denied[1](true); } }, "I am not"),
        h(NS.Button, { key: "yes", onClick: confirm }, "I am 21 or older")
      ]
    });
  }

  function Toasts() {
    var s = React.useState([]);
    React.useEffect(function () {
      toastListener = function (msg) {
        var id = Date.now() + Math.random();
        s[1](function (list) { return list.concat([{ id: id, msg: msg }]); });
        setTimeout(function () { s[1](function (list) { return list.filter(function (t) { return t.id !== id; }); }); }, 3200);
      };
      return function () { toastListener = null; };
    }, []);
    return h(NS.ToastRegion, { placement: "bottom-right", label: "Notifications" },
      s[0].map(function (t) {
        return h(NS.Toast, { key: t.id, tone: "success", title: t.msg,
          onDismiss: function () { s[1](function (list) { return list.filter(function (x) { return x.id !== t.id; }); }); }
        });
      })
    );
  }

  /* A product card, shared by the home page and the shop. The whole card is one link;
     the add button sits beside it, not inside, so there is never a button in an anchor. */
  function ProductCard(props) {
    var p = props.product;
    return h(NS.Card, {
      style: { height: "100%" },
      media: h("a", { href: "product.html?id=" + p.id, tabIndex: -1, "aria-hidden": true },
        h(NS.Image, { src: p.img, alt: "", ratio: "square", radius: "media" })),
      footer: h(NS.Inline, { justify: "space-between", align: "center" },
        h("span", { className: "lm-price" }, money(p.price)),
        h(NS.Button, { size: "sm", variant: "secondary", onClick: function () { addToBag(p.id, 1); } }, "Add to bag")
      )
    },
      h(NS.Inline, { gap: "xs", wrap: true },
        h(NS.Badge, { tone: TYPE_TONE[p.type] || "neutral" }, p.type),
        p.thc != null ? h(NS.Badge, { tone: "neutral" }, "THC " + p.thc + "%") : null,
        h(NS.Badge, { tone: "neutral" }, p.size)
      ),
      h("a", { href: "product.html?id=" + p.id, className: "lm-h3", style: { color: "inherit", textDecoration: "none", fontSize: "var(--dt-text-heading-sm-size)", lineHeight: "var(--dt-text-heading-sm-line)" } }, p.name),
      h("p", { className: "lm-small" }, p.blurb)
    );
  }

  function Section(props) {
    return h("section", { className: "lm-sec" + (props.alt ? " lm-alt" : "") + (props.className ? " " + props.className : ""), id: props.id }, props.children);
  }

  function mount(Page, current) {
    function App() {
      return h(React.Fragment, null,
        h(Header, { current: current }),
        h("main", null, h(Page)),
        h(Footer),
        h(AgeGate),
        h(Toasts)
      );
    }
    ReactDOM.createRoot(document.getElementById("root")).render(h(App));
  }

  window.LM = {
    h: h, NS: NS, PRODUCTS: PRODUCTS, CATEGORIES: CATEGORIES, TYPE_TONE: TYPE_TONE,
    find: find, money: money, addToBag: addToBag, useBag: useBag,
    ProductCard: ProductCard, Section: Section, mount: mount
  };
})();
