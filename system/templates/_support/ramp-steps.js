/* Ramp steps: a ramp card shows the steps the current theme publishes.

   A brand can publish 4 to 10 steps per chromatic ramp instead of eleven (the
   Configure panel's Steps per ramp). Every named step still exists and points
   at a kept one, so a card that drew all eleven would show repeats. This hides
   the steps that are not kept and says which ones are. Neutral always keeps
   eleven.

   It reads the saved configuration, so it follows a change made in another
   tab, and it re-reads whenever the page's root style changes, which is how
   the docs site pushes a theme into a card it embeds. Nothing here belongs in
   production: a published theme is a file of tokens, not a script.

   Mark a ramp row with data-ramp="<name>" and load this after it. */
(function () {
  var KEY = "dovetail-theme-config";
  var STEPS = ["050", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

  function kept(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var idx = Math.round((i * (STEPS.length - 1)) / (n - 1));
      if (out.indexOf(idx) === -1) out.push(idx);
    }
    return out;
  }

  function steps() {
    try {
      var cfg = JSON.parse(localStorage.getItem(KEY)) || {};
      var n = Number(cfg.steps) || 0;
      return n >= 4 && n < STEPS.length ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function paint() {
    var n = steps();
    Array.prototype.forEach.call(document.querySelectorAll("[data-ramp]"), function (row) {
      var keep = n && row.getAttribute("data-ramp") !== "neutral" ? kept(n) : null;
      Array.prototype.forEach.call(row.querySelectorAll(".sw"), function (sw, i) {
        sw.style.display = keep && keep.indexOf(i) === -1 ? "none" : "";
      });
      var note = row.parentNode.querySelector(".ramp-steps-note");
      if (!note) {
        note = document.createElement("div");
        note.className = "lbl ramp-steps-note";
        note.style.marginTop = "8px";
        row.parentNode.insertBefore(note, row.nextSibling);
      }
      note.textContent = keep ? keep.length + " of 11 steps published: " + keep.map(function (i) { return STEPS[i]; }).join(", ") + ". The rest point at the nearest kept step." : "";
      note.style.display = keep ? "" : "none";
    });
  }

  paint();
  window.addEventListener("storage", function (e) {
    if (!e.key || e.key === KEY) paint();
  });
  window.addEventListener("dovetail:theme-change", paint);
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
})();
