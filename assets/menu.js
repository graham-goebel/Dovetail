/* The phone menu, after the progressive menu sheet on Graham's folio.

   A floating pill holds Configure and the menu button. The menu sheet grows
   out of the menu button: sections as big links, and a section with pages
   under it pushes a layer ("Menu / Components") that slides in from the
   right; Components filters its list with Gainer-style chips, and Templates
   opens on its three kinds, each a layer of its own. Guide is cards. Home is
   at the top right of every layer, and the crumb ("Menu / Components") goes
   back. Search and close sit in a footer, the same on every layer, close
   exactly where the menu button was, so the button that opened the menu also
   shuts it. Search turns the footer into a field fixed to the sheet, with
   results in the sheet above it. A swipe down closes, a swipe right goes back.
   system/components/navigation/MenuSheet.jsx is this menu as a component.

   The tree is window.DovetailNav, generated with the search index by
   tools/build-site.mjs. On a wide screen none of this shows: the header and
   the sidebar do these jobs there. */

(function () {
  "use strict";

  var NAV = window.DovetailNav;
  var INDEX = window.DovetailSearch || [];
  var fab = document.getElementById("fab");
  if (!NAV || !fab) return;

  var phone = window.matchMedia("(max-width: 900px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = "cubic-bezier(.2,.85,.25,1)";
  var home = document.querySelector(".wordmark");
  var ROOT = home ? home.getAttribute("href").replace(/index\.html$/, "") : "";
  var menuBtn = fab.querySelector("[data-fab-menu]");
  var menuFilter = "all";
  var searching = false;

  var ICONS = {
    next: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    search: '<path d="M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"/><path d="m20.5 20.5-5-5"/>',
  };
  function ic(name) {
    return '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + "</svg>";
  }
  function esc(text) {
    return String(text == null ? "" : text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function here(u) {
    try {
      return new URL(ROOT + u, location.href).pathname === location.pathname;
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------ Configure joins the pill */

  /* On a phone the Configure button sits in the pill between search and
     menu; on a wide screen it goes back to its own corner. */
  function placeConfigure() {
    var btn = document.querySelector(".configure-open-btn");
    var bar = document.querySelector(".configure-bar");
    if (!btn || !bar) return;
    if (phone.matches) {
      if (btn.parentNode !== fab) {
        btn.classList.add("fab-btn");
        fab.insertBefore(btn, menuBtn);
      }
    } else if (btn.parentNode !== bar) {
      btn.classList.remove("fab-btn");
      bar.appendChild(btn);
    }
  }
  /* theme.js builds the button and loads after this file, so wait for it. */
  placeConfigure();
  document.addEventListener("DOMContentLoaded", placeConfigure);
  window.addEventListener("load", placeConfigure);
  if (phone.addEventListener) phone.addEventListener("change", placeConfigure);

  /* ------------------------------------------------------------- the sheet */

  var bg = document.createElement("div");
  bg.className = "msheet-bg";
  bg.hidden = true;
  bg.innerHTML = '<div class="msheet" role="dialog" aria-modal="true" aria-label="Menu"></div>';
  document.body.appendChild(bg);
  var box = bg.firstChild;
  var stack = [];

  function section(id) {
    return NAV.tree.filter(function (s) { return s.id === id; })[0];
  }

  function crumbs() {
    var names = stack.map(function (p) {
      if (p.kind === "menu") return "Menu";
      if (p.kind === "section") return section(p.id).t;
      return section(p.sec).groups.filter(function (g) { return g.id === p.id; })[0].t;
    });
    return names.map(function (n, i) {
      return i === names.length - 1
        ? '<span class="crumb-cur">' + esc(n) + "</span>"
        : '<button type="button" class="crumb-up" data-depth="' + i + '">' + esc(n) + '</button><span class="sep" aria-hidden="true">/</span>';
    }).join("");
  }

  /* "Open in Claude" for the page you're on: the page menu's own link, which
     already carries this page's address and its Markdown when it has one. */
  /* Claude's mark, from simple-icons (CC0). */
  var CLAUDE_MARK = '<svg class="claude-mark" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>';
  function claudeChip() {
    var own = document.querySelector('[data-page-action="claude"]');
    var href = own ? own.getAttribute("href") : "https://claude.ai/new?q=" + encodeURIComponent("I'm building with the Dovetail design system. Read " + new URL(ROOT + "llms.txt", location.href).href + " first, then " + location.href.split("#")[0] + ".\n\nMy task: ");
    return '<a class="sub-link sub-link-claude" href="' + esc(href) + '" target="_blank" rel="noopener">' + CLAUDE_MARK + "Open in Claude</a>";
  }

  /* A row, with its icon in a tile ahead of it when it has one. */
  function rowInner(item) {
    return (item.i ? '<span class="row-ic">' + item.i + "</span>" : "") +
      '<span class="t"><b>' + esc(item.t) + "</b>" + (item.d ? "<small>" + esc(item.d) + "</small>" : "") + "</span>";
  }

  function mrow(item) {
    var on = here(item.u);
    return '<a class="mrow' + (item.i ? " has-ic" : "") + '" href="' + esc(ROOT + item.u) + '"' + (on ? ' aria-current="page"' : "") + ">" + rowInner(item) + "</a>";
  }

  /* Guide: a card per page, the first (the README) across the full width and
     the rest two up under it. */
  function mcard(item) {
    return '<a class="mcard" href="' + esc(ROOT + item.u) + '"' + (here(item.u) ? ' aria-current="page"' : "") + ">" +
      (item.i ? '<span class="row-ic">' + item.i + "</span>" : "") +
      '<span class="t"><b>' + esc(item.t) + "</b>" + (item.d ? "<small>" + esc(item.d) + "</small>" : "") + "</span></a>";
  }

  /* An interstitial row (Templates: Product, Marketing, Social) opens the
     layer of everything in that kind. */
  function drillRow(g) {
    return '<button type="button" class="mrow has-ic drill" data-group="' + esc(g.id) + '">' + rowInner(g) +
      '<span class="n">' + g.items.length + "</span></button>";
  }

  function pageHtml(p) {
    var body = "";
    if (p.kind === "menu") {
      body = '<nav class="big-links" aria-label="Sections">' + NAV.tree.map(function (s) {
        var label = '<span class="bl-t"><span class="lbl">' + esc(s.t) + "</span></span>";
        if (s.u) return '<a class="big-link" href="' + esc(ROOT + s.u) + '"' + (here(s.u) ? ' aria-current="page"' : "") + ">" + label + "</a>";
        return '<button type="button" class="big-link" data-sec="' + s.id + '">' + label + "</button>";
      }).join("") + "</nav>" +
        '<nav class="sub-links" aria-label="More">' + NAV.extras.map(function (x) {
          return '<a class="sub-link" href="' + esc(ROOT + x.u) + '">' + (x.i || "") + esc(x.t) + "</a>";
        }).join("") + claudeChip() + "</nav>";
    } else if (p.kind === "section") {
      var s = section(p.id);
      body = s.cards
        ? '<div class="mcards">' + s.items.map(mcard).join("") + "</div>"
        : s.items
        ? '<div class="mlist">' + s.items.map(mrow).join("") + "</div>"
        : s.drill
          ? '<div class="mlist">' + s.groups.map(drillRow).join("") + "</div>"
          : chipsHtml(s) + '<div class="mlist" id="mlist">' + filtered(s).map(mrow).join("") + "</div>";
    } else {
      var grp = section(p.sec).groups.filter(function (g) { return g.id === p.id; })[0];
      body = '<div class="mlist">' + grp.items.map(mrow).join("") + "</div>";
    }
    return '<div class="mp-head"><p class="crumb">' + crumbs() + "</p>" + homeBtn() + "</div>" +
      '<div class="mp-body">' + body + "</div>" +
      footHtml();
  }

  /* Home sits top right of the sheet as text, set like "Menu" opposite it. */
  function homeBtn() {
    var u = "index.html";
    return '<a class="mp-home" href="' + esc(ROOT + u) + '"' + (here(u) ? ' aria-current="page"' : "") + ">Home</a>";
  }

  /* Search on the left and close on the right, the same on every layer, so
     the footer never shifts as you go deeper. Back is the crumb above, or a
     swipe right. Close sits where the menu button was. */
  function footHtml() {
    return '<div class="mfoot">' +
      '<button type="button" class="msh-x" data-find aria-label="Search components and pages">' + ic("search") + "</button>" +
      '<button type="button" class="msh-x" data-close aria-label="Close menu">' + ic("x") + "</button></div>";
  }

  /* Components: a chip per family above one list, like Gainer's filters. */
  function chipsHtml(s) {
    var all = s.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
    var chip = function (id, label, n) {
      return '<button type="button" class="pan-opt" data-chip="' + id + '" aria-pressed="' + (menuFilter === id) + '">' + esc(label) + '<span class="n">' + n + "</span></button>";
    };
    return '<div class="mchips" role="toolbar" aria-label="Filter by family">' + chip("all", "All", all) +
      s.groups.map(function (g) { return chip(g.id, g.t, g.items.length); }).join("") + "</div>";
  }

  function filtered(s) {
    return s.groups.reduce(function (out, g) {
      return menuFilter === "all" || menuFilter === g.id ? out.concat(g.items) : out;
    }, []);
  }

  function render(dir) {
    box.innerHTML = pageHtml(stack[stack.length - 1]);
    box.scrollTop = 0;
    box.querySelectorAll("[data-sec]").forEach(function (b) {
      b.onclick = function () { push({ kind: "section", id: b.getAttribute("data-sec") }); };
    });
    box.querySelectorAll("[data-group]").forEach(function (b) {
      b.onclick = function () { push({ kind: "group", sec: stack[stack.length - 1].id, id: b.getAttribute("data-group") }); };
    });
    box.querySelectorAll("[data-depth]").forEach(function (b) {
      b.onclick = function () {
        stack = stack.slice(0, Number(b.getAttribute("data-depth")) + 1);
        render(-1);
      };
    });
    box.querySelectorAll("[data-chip]").forEach(function (b) {
      b.onclick = function () {
        menuFilter = b.getAttribute("data-chip");
        var s = section("components");
        box.querySelectorAll("[data-chip]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
        var list = box.querySelector("#mlist");
        list.innerHTML = filtered(s).map(mrow).join("");
        if (!reduce) list.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      };
    });
    var find = box.querySelector("[data-find]");
    if (find) find.onclick = enterSearch;
    box.querySelector("[data-close]").onclick = function () { close(); };
    if (dir && !reduce) {
      box.classList.remove("snext", "sprev");
      void box.offsetWidth;
      box.classList.add(dir > 0 ? "snext" : "sprev");
      clearTimeout(box._nv);
      box._nv = setTimeout(function () { box.classList.remove("snext", "sprev"); }, 420);
    }
    var focus = box.querySelector(".crumb-up:last-of-type") || box.querySelector(".big-link, .mrow, .mcard");
    if (focus && !window.matchMedia("(pointer: coarse)").matches) focus.focus({ preventScroll: true });
  }

  function push(p) {
    stack.push(p);
    render(1);
  }

  function pop() {
    if (searching) return exitSearch();
    if (stack.length < 2) return close();
    stack.pop();
    render(-1);
  }

  function inset(r, b, round) {
    return "inset(" + (r.top - b.top) + "px " + (b.right - r.right) + "px " + (b.bottom - r.bottom) + "px " + (r.left - b.left) + "px round " + round + ")";
  }

  function open() {
    if (!bg.hidden) return;
    searching = false;
    box.classList.remove("is-searching");
    stack = [{ kind: "menu" }];
    render(0);
    bg.hidden = false;
    bg.classList.remove("closing");
    document.body.classList.add("msheet-open");
    /* The pill hides while the sheet is up; its close sits where the menu
       button was. */
    fab.classList.add("gone");
    if (reduce) return;
    /* The sheet grows out of the menu button. */
    var c = menuBtn.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    bg.classList.add("morph");
    box.animate([{ clipPath: inset(c, b, c.height / 2 + "px") }, { clipPath: inset(b, b, "24px") }], { duration: 500, easing: EASE });
    bg.animate([{ backgroundColor: "rgba(0,0,0,0)" }, { backgroundColor: "rgba(0,0,0,.38)" }], { duration: 400, easing: "ease-out" });
    setTimeout(function () { bg.classList.remove("morph"); }, 560);
  }

  function finish() {
    clearTimeout(box._fs);
    searching = false;
    box.classList.remove("is-searching");
    bg.hidden = true;
    bg.classList.remove("closing", "morphout");
    box.style.transform = "";
    box.getAnimations().concat(bg.getAnimations()).forEach(function (a) { a.cancel(); });
    document.body.classList.remove("msheet-open");
    fab.classList.remove("gone");
    stack = [];
  }

  /* plain: a swipe already moved the sheet away, so it just goes. */
  function close(plain) {
    if (bg.hidden || bg.classList.contains("morphout")) return;
    if (reduce) return finish();
    if (plain) {
      bg.classList.add("closing");
      setTimeout(finish, 260);
      return;
    }
    /* It shrinks back into the menu button. */
    fab.classList.remove("gone");
    var c = menuBtn.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    var o = { duration: 440, easing: EASE, fill: "forwards" };
    bg.classList.add("morphout");
    box.animate([{ clipPath: inset(b, b, "24px") }, { clipPath: inset(c, b, c.height / 2 + "px") }], o);
    bg.animate([{ backgroundColor: "rgba(0,0,0,.38)" }, { backgroundColor: "rgba(0,0,0,0)" }], o);
    setTimeout(finish, o.duration);
  }

  menuBtn.addEventListener("click", open);
  bg.addEventListener("click", function (e) { if (e.target === bg) close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (bg.hidden) return;
    e.preventDefault();
    if (searching) exitSearch();
    else close();
  });
  phone.addEventListener && phone.addEventListener("change", function () { if (!phone.matches) finish(); });

  /* Touch: drag down from the top to close, drag right in a layer to go back. */
  (function swipe() {
    var y0 = null, x0 = 0, dy = 0, dx = 0, t0 = 0, drag = null;
    box.addEventListener("touchstart", function (e) {
      y0 = null;
      if (e.touches.length !== 1) return;
      y0 = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      t0 = Date.now();
      dy = dx = 0;
      drag = null;
    }, { passive: true });
    box.addEventListener("touchmove", function (e) {
      if (y0 == null) return;
      var t = e.touches[0];
      dy = t.clientY - y0;
      dx = t.clientX - x0;
      if (!drag) {
        if (box.scrollTop <= 0 && dy > 8 && dy > Math.abs(dx)) drag = "y";
        else if (dx > 10 && dx > Math.abs(dy) * 1.3 && stack.length > 1) drag = "x";
        else {
          if (dy < -6 || Math.abs(dx) > 14) y0 = null;
          return;
        }
      }
      e.preventDefault();
      if (drag === "y") box.style.transform = "translateY(" + Math.max(0, dy) + "px)";
      else {
        box.style.setProperty("--sx", Math.max(0, dx) + "px");
        box.classList.add("hdrag");
      }
    }, { passive: false });
    function end() {
      if (y0 == null || !drag) { y0 = null; return; }
      var ms = Math.max(1, Date.now() - t0);
      var dir = drag;
      y0 = null;
      drag = null;
      if (dir === "x") {
        box.classList.remove("hdrag");
        box.style.removeProperty("--sx");
        if (dx > Math.min(110, box.offsetWidth * 0.28) || (dx / ms > 0.5 && dx > 40)) pop();
        return;
      }
      if (dy > Math.min(140, box.offsetHeight * 0.3) || (dy / ms > 0.6 && dy > 30)) {
        box.style.transition = "transform .24s ease-in";
        box.style.transform = "translateY(100%)";
        setTimeout(function () { box.style.transition = ""; close(true); }, 240);
      } else {
        box.style.transition = "transform .2s ease";
        box.style.transform = "";
        setTimeout(function () { box.style.transition = ""; }, 220);
      }
    }
    box.addEventListener("touchend", end);
    box.addEventListener("touchcancel", end);
  })();

  /* ------------------------------------------------------------- search */

  /* The footer becomes a search field fixed to the bottom of the sheet, and
     the sheet's body shows the results. Closing the field puts the page
     that was showing back. */
  function resultsHtml(q) {
    var words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var hits = INDEX.filter(function (it) {
      var text = (it.t + " " + it.s + " " + it.d).toLowerCase();
      return words.every(function (w) { return text.indexOf(w) >= 0; });
    });
    if (words.length) {
      var whole = words.join(" ");
      hits.sort(function (a, b) {
        var ai = a.t.toLowerCase().indexOf(whole), bi = b.t.toLowerCase().indexOf(whole);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
    }
    var block = function (kind, label, limit) {
      var rows = hits.filter(function (h) { return h.k === kind; }).slice(0, limit);
      return rows.length ? '<p class="q-h">' + label + "</p>" + rows.map(function (h) {
        return '<a class="mrow" href="' + esc(ROOT + h.u) + '"' + (here(h.u) ? ' aria-current="page"' : "") + '><span class="t"><b>' + esc(h.t) + "</b><small>" + esc(h.s) + "</small></span></a>";
      }).join("") : "";
    };
    return hits.length
      ? block("component", "Components", words.length ? 40 : 66) + block("page", "Pages", words.length ? 20 : 0)
      : '<p class="q-none">Nothing matches “' + esc(q.trim()) + "”.</p>";
  }

  /* Swapping the sheet's content for search, and back, is a crossfade: what
     is showing fades out, the sheet takes its new height while nothing is
     visible, and the new content eases up into place, so nothing jumps. */
  var FADE_OUT = 140;
  function fadeSwap(swap, withFoot) {
    if (reduce) return swap();
    var sel = withFoot ? ".mp-head, .mp-body, .mfoot" : ".mp-head, .mp-body";
    box.querySelectorAll(sel).forEach(function (el) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT, easing: "ease-in", fill: "forwards" });
    });
    clearTimeout(box._fs);
    box._fs = setTimeout(function () {
      swap();
      box.querySelectorAll(sel).forEach(function (el, i) {
        el.getAnimations().forEach(function (a) { a.cancel(); });
        el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: i * 50, easing: EASE, fill: "backwards" });
      });
    }, FADE_OUT);
  }

  function enterSearch() {
    if (searching) return;
    searching = true;
    /* The field replaces the footer at once, inside the tap, so a phone
       raises its keyboard; the results fade in above it. */
    box.querySelector(".mfoot").outerHTML =
      '<div class="mfoot msearch"><label class="ms-field">' + ic("search") +
      '<input type="search" placeholder="Search components and pages" aria-label="Search components and pages" autocomplete="off" enterkeyhint="search">' +
      '<button type="button" class="ms-close" aria-label="Close search">' + ic("x") + "</button></label></div>";
    var input = box.querySelector(".msearch input");
    var body = box.querySelector(".mp-body");
    fadeSwap(function () {
      box.classList.add("is-searching");
      box.querySelector(".mp-head").innerHTML = '<p class="crumb"><span class="crumb-cur">Search</span></p>' + homeBtn();
      body.innerHTML = resultsHtml(input.value);
      box.scrollTop = 0;
    });
    input.addEventListener("input", function () {
      body.innerHTML = resultsHtml(input.value);
      box.scrollTop = 0;
    });
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var first = body.querySelector(".mrow");
      if (first) location.href = first.href;
    });
    box.querySelector(".ms-close").onclick = function (e) {
      e.preventDefault();
      exitSearch();
    };
    if (!reduce) box.querySelector(".msearch").animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: EASE });
    input.focus({ preventScroll: true });
  }

  function exitSearch() {
    if (!searching) return;
    searching = false;
    fadeSwap(function () {
      box.classList.remove("is-searching");
      render(0);
    }, true);
  }

  /* Keep the pill above the on-screen keyboard. */
  if (window.visualViewport) {
    var kb = function () {
      document.documentElement.style.setProperty("--kb", Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop) + "px");
    };
    visualViewport.addEventListener("resize", kb);
    visualViewport.addEventListener("scroll", kb);
  }

  window.DovetailMenu = { open: open, close: close, search: function () { open(); enterSearch(); } };
})();
