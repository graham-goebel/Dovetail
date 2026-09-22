/* The node visualiser: one token or component in the middle, what it resolves
   through on the left, what consumes it on the right.

   The tier rule says references travel one way, component to semantic to
   primitive, and nothing skips or reverses. That is a claim about a graph, so
   this draws the graph and lets you walk it. Starting from a primitive and
   clicking right is the interesting direction: it answers which roles carry an
   atomic value, and which components inherit it without ever naming it.

   `assets/graph-data.js` is generated from `system/tokens/` and the component
   sources. It is the largest file the site produces, so it is fetched the
   first time someone opens this and never on an ordinary page load. */

(function () {
  "use strict";

  var SELF = document.currentScript && document.currentScript.src;
  var data = null;
  var consumedBy = null;
  var el = null;
  var focus = null;
  var history = [];
  var lastFocused = null;

  var TIER_LABEL = {
    primitive: "primitive",
    semantic: "semantic",
    component: "component",
    consumer: "component",
    undeclared: "undeclared",
  };

  /* ------------------------------------------------------------- the data */

  function ensureData(done) {
    if (data) return done(true);
    if (window.DovetailGraph) {
      index();
      return done(true);
    }
    if (!SELF) return done(false);
    var tag = document.createElement("script");
    tag.src = SELF.slice(0, SELF.lastIndexOf("/") + 1) + "graph-data.js";
    tag.onload = function () {
      if (!window.DovetailGraph) return done(false);
      index();
      done(true);
    };
    tag.onerror = function () {
      done(false);
    };
    document.head.appendChild(tag);
  }

  function index() {
    data = window.DovetailGraph;
    consumedBy = {};
    Object.keys(data.consumes).forEach(function (from) {
      data.consumes[from].forEach(function (to) {
        (consumedBy[to] || (consumedBy[to] = [])).push(from);
      });
    });
  }

  function node(id) {
    return (data.nodes && data.nodes[id]) || { kind: "token", tier: "undeclared", value: null };
  }

  function label(id) {
    return id.indexOf("component:") === 0 ? id.slice(10) : id;
  }

  /* How many components end up consuming this, following the references all
     the way down. The count is what makes a token's blast radius legible:
     a primitive with 40 components behind it is not one to move casually. */
  function componentsBelow(id) {
    var seen = {};
    var found = {};
    var queue = [id];
    while (queue.length) {
      var current = queue.shift();
      if (seen[current]) continue;
      seen[current] = true;
      if (current !== id && node(current).kind === "component") {
        found[current] = true;
        continue;
      }
      (consumedBy[current] || []).forEach(function (next) {
        queue.push(next);
      });
    }
    return Object.keys(found).length;
  }

  /* ------------------------------------------------------------- the panel */

  function build() {
    el = {};
    el.root = document.createElement("div");
    el.root.className = "graph-overlay";
    el.root.setAttribute("role", "dialog");
    el.root.setAttribute("aria-modal", "true");
    el.root.setAttribute("aria-label", "Token graph");
    el.root.hidden = true;
    el.root.innerHTML =
      '<div class="graph-panel">' +
      '<div class="graph-head">' +
      '<button type="button" class="graph-back" hidden>Back</button>' +
      '<label class="graph-search"><span class="visually-hidden">Find a token or component</span>' +
      '<input type="search" list="graph-options" placeholder="Find a token or component" autocomplete="off"></label>' +
      '<datalist id="graph-options"></datalist>' +
      '<button type="button" class="graph-close" aria-label="Close the graph">&times;</button>' +
      "</div>" +
      '<div class="graph-body"><svg class="graph-wires" aria-hidden="true"></svg>' +
      '<div class="graph-col" data-side="up"><h2>Resolves through</h2><div class="graph-list"></div></div>' +
      '<div class="graph-col graph-col-focus"><h2>Selected</h2><div class="graph-list"></div></div>' +
      '<div class="graph-col" data-side="down"><h2>Consumed by</h2><div class="graph-list"></div></div>' +
      "</div>" +
      '<p class="graph-foot"></p>' +
      "</div>";
    document.body.appendChild(el.root);

    el.panel = el.root.querySelector(".graph-panel");
    el.body = el.root.querySelector(".graph-body");
    el.wires = el.root.querySelector(".graph-wires");
    el.up = el.root.querySelector('[data-side="up"] .graph-list');
    el.centre = el.root.querySelector(".graph-col-focus .graph-list");
    el.down = el.root.querySelector('[data-side="down"] .graph-list');
    el.upHead = el.root.querySelector('.graph-col[data-side="up"] h2');
    el.downHead = el.root.querySelector('.graph-col[data-side="down"] h2');
    el.foot = el.root.querySelector(".graph-foot");
    el.back = el.root.querySelector(".graph-back");
    el.search = el.root.querySelector(".graph-search input");
    el.options = el.root.querySelector("#graph-options");

    el.root.querySelector(".graph-close").addEventListener("click", close);
    el.root.addEventListener("click", function (event) {
      if (event.target === el.root) close();
    });
    el.back.addEventListener("click", function () {
      if (!history.length) return;
      focus = history.pop();
      el.back.hidden = !history.length;
      render();
    });
    el.search.addEventListener("change", function () {
      var value = el.search.value.trim();
      var id = value && data.nodes[value] ? value : "component:" + value;
      if (!data.nodes[id]) return;
      el.search.value = "";
      go(id);
    });

    el.body.addEventListener("scroll", wires);
    window.addEventListener("resize", function () {
      if (!el.root.hidden) wires();
    });

    Object.keys(data.nodes)
      .sort()
      .forEach(function (id) {
        var option = document.createElement("option");
        option.value = label(id);
        el.options.appendChild(option);
      });
  }

  function chip(id, side) {
    var info = node(id);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "graph-node";
    button.dataset.id = id;
    button.dataset.tier = info.tier;
    if (side) button.dataset.side = side;

    var name = document.createElement("span");
    name.className = "graph-node-name";
    name.textContent = label(id);
    button.appendChild(name);

    var meta = document.createElement("span");
    meta.className = "graph-node-meta";
    meta.textContent = TIER_LABEL[info.tier] || info.tier;
    if (info.kind === "token") {
      var n = (consumedBy[id] || []).length;
      if (n) meta.textContent += " · " + n + " consumer" + (n === 1 ? "" : "s");
    }
    button.appendChild(meta);

    if (info.kind === "token" && info.value) {
      var value = document.createElement("span");
      value.className = "graph-node-value";
      value.textContent = info.value;
      button.appendChild(value);
    }
    if (info.tier === "undeclared") {
      var warn = document.createElement("span");
      warn.className = "graph-node-value graph-node-warn";
      warn.textContent = "declared by no tier";
      button.appendChild(warn);
    }

    button.addEventListener("click", function () {
      go(id);
    });
    return button;
  }

  function fill(list, ids, side, empty) {
    list.textContent = "";
    if (!ids.length) {
      var note = document.createElement("p");
      note.className = "graph-empty";
      note.textContent = empty;
      list.appendChild(note);
      return;
    }
    ids
      .slice()
      .sort(function (a, b) {
        return label(a).localeCompare(label(b));
      })
      .forEach(function (id) {
        list.appendChild(chip(id, side));
      });
  }

  function render() {
    var info = node(focus);
    var up = (data.consumes[focus] || []).slice();
    var down = (consumedBy[focus] || []).slice();

    /* A component reads tokens; a token resolves through others. Same column,
       different relationship, so the heading says which. */
    el.upHead.textContent = info.kind === "component" ? "Reads" : "Resolves through";
    el.downHead.textContent = "Consumed by";
    fill(el.up, up, "up", "Nothing: this is an atomic value.");
    el.centre.textContent = "";
    var centre = chip(focus, null);
    centre.classList.add("is-focus");
    centre.disabled = true;
    el.centre.appendChild(centre);
    fill(
      el.down,
      down,
      "down",
      info.kind === "component" ? "Nothing: a component is where the chain ends." : "Nothing consumes this yet."
    );

    var reach = info.kind === "component" ? 0 : componentsBelow(focus);
    var parts = [];
    if (info.kind === "component") {
      parts.push("Reads " + up.length + " token" + (up.length === 1 ? "" : "s") + " directly.");
    } else {
      parts.push(
        down.length + " direct consumer" + (down.length === 1 ? "" : "s") + ", reaching " + reach + " component" + (reach === 1 ? "" : "s") + " in all."
      );
      if (info.tier === "undeclared") parts.push("No tier declares it, so it resolves to nothing.");
    }
    el.foot.textContent = parts.join(" ");
    var href = info.href ? root() + info.href : null;
    if (href && href !== location.href.split("#")[0]) {
      var link = document.createElement("a");
      link.href = href;
      link.textContent = "Open the " + label(focus) + " page";
      el.foot.appendChild(link);
    }

    el.body.scrollTop = 0;
    wires();
  }

  /* The site is served from nested folders, so a link out of the overlay has
     to be relative to the page that opened it. */
  function root() {
    if (!SELF) return "";
    var assets = SELF.slice(0, SELF.lastIndexOf("/") + 1);
    return assets.slice(0, assets.length - "assets/".length);
  }

  /* Edges are drawn after layout rather than positioned by it: the columns are
     ordinary flow content, and a line only has to know where two boxes ended
     up. Redrawn on scroll and resize for the same reason. */
  function wires() {
    if (!el || el.root.hidden) return;
    var frame = el.body.getBoundingClientRect();
    el.wires.setAttribute("width", frame.width);
    el.wires.setAttribute("height", el.body.scrollHeight);
    el.wires.style.height = el.body.scrollHeight + "px";
    el.wires.textContent = "";

    var centre = el.centre.querySelector(".graph-node");
    if (!centre) return;
    var hub = centre.getBoundingClientRect();
    var top = el.body.scrollTop;

    Array.prototype.forEach.call(el.root.querySelectorAll(".graph-node[data-side]"), function (n) {
      var box = n.getBoundingClientRect();
      var fromLeft = n.dataset.side === "up";
      var x1 = (fromLeft ? box.right : hub.right) - frame.left;
      var y1 = (fromLeft ? box.top + box.height / 2 : hub.top + hub.height / 2) - frame.top + top;
      var x2 = (fromLeft ? hub.left : box.left) - frame.left;
      var y2 = (fromLeft ? hub.top + hub.height / 2 : box.top + box.height / 2) - frame.top + top;
      /* Orthogonal rather than curved. Forty edges leaving one node span the
         whole column vertically and only a gutter horizontally, so beziers
         collapse into a vertical smear; a bus with square corners stays
         readable at any fan-out. */
      var mid = (x1 + x2) / 2;
      var r = Math.min(6, Math.abs(y2 - y1) / 2, Math.abs(mid - x1));
      var down = y2 > y1 ? 1 : -1;
      var into = x2 > mid ? 1 : -1;
      var d =
        "M" + x1 + "," + y1 +
        " H" + (mid - r * into) +
        " Q" + mid + "," + y1 + " " + mid + "," + (y1 + r * down) +
        " V" + (y2 - r * down) +
        " Q" + mid + "," + y2 + " " + (mid + r * into) + "," + y2 +
        " H" + x2;
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", Math.abs(y2 - y1) < 1 ? "M" + x1 + "," + y1 + " H" + x2 : d);
      path.setAttribute("class", "graph-wire");
      el.wires.appendChild(path);
    });
  }

  function go(id) {
    if (id === focus) return;
    history.push(focus);
    el.back.hidden = false;
    focus = id;
    render();
  }

  function open(id) {
    ensureData(function (ok) {
      if (!ok) return;
      if (!el) build();
      if (!data.nodes[id]) return;
      lastFocused = document.activeElement;
      history = [];
      el.back.hidden = true;
      focus = id;
      el.root.hidden = false;
      document.body.classList.add("graph-open");
      render();
      el.root.querySelector(".graph-close").focus();
    });
  }

  function close() {
    if (!el) return;
    el.root.hidden = true;
    document.body.classList.remove("graph-open");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && el && !el.root.hidden) close();
  });

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest && event.target.closest("[data-graph]");
    if (!trigger) return;
    event.preventDefault();
    open(trigger.getAttribute("data-graph"));
  });

  window.DovetailGraphView = { open: open, close: close };
})();
