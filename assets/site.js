/* Site chrome behaviour: the navigation drawer and the navigation filter.

   Theming (colour mode, context, and everything in the Configure sheet) lives in
   assets/theme.js, which owns the one piece of state both the site and the
   system's own theme runtime read. */

(function () {
  "use strict";

  var navToggle = document.getElementById("nav-toggle");
  var sidebar = document.getElementById("sidebar");

  /* The sections are open in the markup because on a wide screen the sidebar is
     always there and a reader scans it. On a phone the drawer is the whole
     screen, and seven open sections is a page of links to scroll past before
     reaching anything, so they start closed, except the one holding the page
     you are on. */
  var narrow = window.matchMedia("(max-width: 900px)");

  function collapseForWidth() {
    if (!sidebar) return;
    Array.prototype.forEach.call(sidebar.querySelectorAll(".nav-section"), function (section) {
      if (!narrow.matches) {
        section.open = true;
        return;
      }
      section.open = !!section.querySelector('[aria-current="page"]');
    });
  }

  collapseForWidth();
  if (narrow.addEventListener) narrow.addEventListener("change", collapseForWidth);
  else if (narrow.addListener) narrow.addListener(collapseForWidth);

  /* On a phone the drawer is a layer over the page, so the page behind it must
     not scroll and Escape has to be a way out. Widening the window puts the
     sidebar back where it always is, so the open state is dropped with it. */
  function setDrawer(open) {
    if (!sidebar || !navToggle) return;
    sidebar.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (navToggle && sidebar) {
    navToggle.addEventListener("click", function () {
      setDrawer(!sidebar.classList.contains("open"));
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !sidebar.classList.contains("open")) return;
      setDrawer(false);
      navToggle.focus();
    });

    var wide = window.matchMedia("(min-width: 901px)");
    var drop = function () {
      if (wide.matches) setDrawer(false);
    };
    if (wide.addEventListener) wide.addEventListener("change", drop);
    else if (wide.addListener) wide.addListener(drop);
  }

  /* Filtering hides links, not sections: an empty section says the filter
     matched nothing there, which is information. */
  var filter = document.getElementById("nav-search");
  if (filter && sidebar) {
    filter.addEventListener("input", function () {
      var q = filter.value.trim().toLowerCase();
      Array.prototype.forEach.call(sidebar.querySelectorAll("li"), function (li) {
        if (li.classList.contains("nav-group")) return;
        var link = li.querySelector("a");
        if (!link) return;
        li.hidden = q ? link.textContent.toLowerCase().indexOf(q) === -1 : false;
      });
      if (q) {
        Array.prototype.forEach.call(sidebar.querySelectorAll(".nav-section"), function (section) {
          section.open = true;
        });
      }
    });
  }
})();
