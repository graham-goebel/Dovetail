/* The playground on a component's page: the live component with a control
   for each prop that has an honest one, and the JSX that renders it.

   The props come from the component's .d.ts, read at build time into
   data-props on the playground (tools/build-site.mjs, playgroundProps). The
   starting values come from the same specimen the components index shows
   (assets/specimens.js), so it opens looking like a real use of the
   component rather than an empty shell. A prop that changes something the
   specimen passed as an element, not text, keeps the element. */

(function () {
  "use strict";

  var boxes = document.querySelectorAll("[data-playground]");
  if (!boxes.length) return;

  var NS_KEY = "BeamMobileDesignSystem_e33121";

  function ready(fn, tries) {
    var NS = window[NS_KEY];
    if (NS && window.React && window.ReactDOM && window.DovetailSpecimens) return fn(NS);
    if ((tries || 0) > 200) return;
    setTimeout(function () { ready(fn, (tries || 0) + 1); }, 40);
  }

  /* The component's own element inside a specimen, which may wrap it. */
  function findElement(node, type) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        var hit = findElement(node[i], type);
        if (hit) return hit;
      }
      return null;
    }
    if (node.type === type) return node;
    return node.props ? findElement(node.props.children, type) : null;
  }

  function literal(value) {
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number" || typeof value === "boolean") return "{" + String(value) + "}";
    return "{…}";
  }

  function jsx(name, values, props) {
    var attrs = [];
    var children = values.children;
    props.forEach(function (p) {
      if (p.name === "children") return;
      var v = values[p.name];
      if (v === undefined || v === null || v === "" || v === false) return;
      if (p.default != null && String(v) === String(p.default)) return;
      attrs.push(v === true ? p.name : p.name + "=" + literal(v));
    });
    Object.keys(values).forEach(function (k) {
      if (k === "children" || props.some(function (p) { return p.name === k; })) return;
      var v = values[k];
      if (typeof v === "function" || v === undefined) return;
      attrs.push(k + "=" + literal(v));
    });
    var open = "<" + name + (attrs.length ? " " + attrs.join(" ") : "");
    if (children === undefined || children === null || children === "") return open + " />";
    var inner = typeof children === "string" ? children : "{…}";
    return open + ">" + inner + "</" + name + ">";
  }

  function setup(box, NS) {
    var name = box.getAttribute("data-playground");
    var Comp = NS[name];
    var specs = window.DovetailSpecimens;
    if (!Comp || !specs.build[name] || specs.notes[name]) {
      box.closest(".playground-wrap").hidden = true;
      return;
    }
    var props = JSON.parse(box.getAttribute("data-props") || "[]");
    var el = null;
    try { el = findElement(specs.build[name](), Comp); } catch (e) { el = null; }
    var base = el ? Object.assign({}, el.props) : {};
    var values = Object.assign({}, base);
    props.forEach(function (p) {
      if (values[p.name] === undefined && p.default != null && p.kind === "enum") values[p.name] = p.default;
    });
    /* A slot (ReactNode) gets a text field only when the specimen filled it
       with text; an icon or a footer of buttons has no honest text control. */
    props = props.filter(function (p) {
      if (p.kind !== "node") return true;
      return typeof base[p.name] === "string";
    });

    var stage = box.querySelector(".pg-stage");
    var controls = box.querySelector(".pg-controls");
    var code = box.querySelector(".pg-code code");
    var root = ReactDOM.createRoot(stage);
    var e = React.createElement;

    /* A prop combination the component rejects shows a note, not a blank. */
    class Guard extends React.Component {
      constructor(p) { super(p); this.state = { error: null }; }
      static getDerivedStateFromError(error) { return { error: error }; }
      componentDidUpdate(prev) { if (prev.stamp !== this.props.stamp && this.state.error) this.setState({ error: null }); }
      render() {
        return this.state.error
          ? e("p", { className: "pg-error" }, "This combination doesn't render: " + String(this.state.error.message || this.state.error))
          : this.props.children;
      }
    }

    var stamp = 0;
    function paint() {
      stamp++;
      root.render(e(Guard, { stamp: stamp }, e(Comp, Object.assign({}, values))));
      code.textContent = jsx(name, values, props);
    }

    function row(p, control) {
      var r = document.createElement("div");
      r.className = "pg-row";
      var label = document.createElement("span");
      label.className = "pg-label";
      label.textContent = p.name;
      if (p.note) label.title = p.note;
      r.appendChild(label);
      r.appendChild(control);
      controls.appendChild(r);
    }

    function chip(text, pressed, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pan-opt";
      b.textContent = text;
      b.setAttribute("aria-pressed", String(pressed));
      b.addEventListener("click", onClick);
      return b;
    }

    /* The stage's own colour mode, so light and dark are one click apart. */
    var modeRow = document.createElement("div");
    modeRow.className = "pg-row pg-mode";
    var modeLabel = document.createElement("span");
    modeLabel.className = "pg-label";
    modeLabel.textContent = "Stage";
    var modeChips = document.createElement("div");
    modeChips.className = "pg-chips";
    ["Light", "Dark"].forEach(function (m) {
      modeChips.appendChild(chip(m, m === "Light", function () {
        stage.classList.toggle("dark", m === "Dark");
        modeChips.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.textContent === m)); });
      }));
    });
    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeChips);
    controls.appendChild(modeRow);

    props.forEach(function (p) {
      if (p.kind === "enum") {
        var wrap = document.createElement("div");
        wrap.className = "pg-chips";
        p.options.forEach(function (opt) {
          wrap.appendChild(chip(opt, values[p.name] === opt, function () {
            values[p.name] = opt;
            wrap.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.textContent === opt)); });
            paint();
          }));
        });
        row(p, wrap);
      } else if (p.kind === "boolean") {
        var sw = chip(values[p.name] ? "On" : "Off", !!values[p.name], function () {
          values[p.name] = !values[p.name];
          sw.textContent = values[p.name] ? "On" : "Off";
          sw.setAttribute("aria-pressed", String(!!values[p.name]));
          paint();
        });
        sw.setAttribute("aria-label", p.name);
        row(p, sw);
      } else {
        var input = document.createElement("input");
        input.className = "pg-input";
        input.type = p.kind === "number" ? "number" : "text";
        input.value = values[p.name] == null ? "" : String(values[p.name]);
        input.setAttribute("aria-label", p.name);
        input.addEventListener("input", function () {
          var v = input.value;
          values[p.name] = p.kind === "number" ? (v === "" ? undefined : Number(v)) : v === "" ? undefined : v;
          paint();
        });
        row(p, input);
      }
    });

    paint();
  }

  ready(function (NS) {
    Array.prototype.forEach.call(boxes, function (box) { setup(box, NS); });
  });
})();
