/* Tooltips in the builder's own style. */

import { kbd, mountEl } from "../config.js";

/* Tooltips: a resting pointer on anything with a title shows it after a
   beat, in the builder's own style. The title moves to data-tip so the
   browser's own tip doesn't show as well; an element named only by its
   title keeps that name as its aria-label. Touch never shows one. */
function installTips() {
  var DELAY = 650;
  var tip = null, timer = 0, owner = null;
  var inScope = function (el) { return mountEl.contains(el) || (el.closest && el.closest("#app-toolbar, .bd-dd-list")); };
  var target = function (el) {
    while (el && el.nodeType === 1) {
      if (el.tagName === "IFRAME") return null;
      if (el.hasAttribute("title") || el.hasAttribute("data-tip")) return el;
      if (el === mountEl || el === document.body) return null;
      el = el.parentElement;
    }
    return null;
  };
  var claim = function (el) {
    var t = el.getAttribute("title");
    if (t) {
      el.setAttribute("data-tip", t);
      el.removeAttribute("title");
      if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby") && !el.textContent.trim()) el.setAttribute("aria-label", t);
    }
    return el.getAttribute("data-tip");
  };
  var hide = function () {
    clearTimeout(timer);
    timer = 0;
    owner = null;
    if (tip) { tip.remove(); tip = null; }
  };
  var show = function (el) {
    var text = el.isConnected ? el.getAttribute("data-tip") : null;
    if (!text) return;
    tip = document.createElement("div");
    tip.className = "bd-tip";
    tip.setAttribute("role", "tooltip");
    tip.textContent = kbd(text);
    (el.closest("dialog[open]") || document.body).appendChild(tip);
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 8;
    var top = r.top - h - gap < 8 ? r.bottom + gap : r.top - h - gap;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    tip.style.top = Math.round(top) + "px";
    tip.style.left = Math.round(left) + "px";
    tip.classList.add(top > r.top ? "is-below" : "is-above");
  };
  document.addEventListener("pointerover", function (ev) {
    if (ev.pointerType === "touch") return;
    var el = target(ev.target);
    if (el === owner) return;
    hide();
    if (!el || !inScope(el) || !claim(el)) return;
    owner = el;
    timer = setTimeout(function () { timer = 0; if (owner === el) show(el); }, DELAY);
  }, true);
  document.addEventListener("pointerout", function (ev) {
    if (owner && (!ev.relatedTarget || !owner.contains(ev.relatedTarget))) hide();
  }, true);
  ["pointerdown", "keydown", "wheel", "scroll", "blur"].forEach(function (type) {
    (type === "blur" ? window : document).addEventListener(type, hide, true);
  });
}

export { installTips };
