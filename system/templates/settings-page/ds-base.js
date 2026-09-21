// Loads this design system into the template. In a consuming project, point
// base at the bound DS folder relative to this file (e.g. '_ds/<folder>' at
// the project root, '../_ds/<folder>' one level down) — one line to edit.
(() => {
  const base = '../..';
  for (const p of ["tokens/primitive/color.css","tokens/primitive/dimension.css","tokens/primitive/typography.css","tokens/primitive/motion.css","tokens/primitive/elevation.css","tokens/semantic/color.css","tokens/semantic/space.css","tokens/semantic/typography.css","tokens/semantic/shape.css","tokens/semantic/size.css","tokens/semantic/elevation.css","tokens/semantic/motion.css","tokens/themes/base-dark.css","tokens/component/button.css","tokens/component/input.css","tokens/component/card.css","tokens/component/dialog.css","tokens/component/table.css","tokens/contexts/context-product.css","tokens/contexts/context-marketing.css","tokens/base.css","styles.css"]) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + '/' + p;
    document.head.appendChild(l);
  }
  const s = document.createElement('script');
  s.src = base + '/_ds_bundle.js';
  s.onerror = () => console.error('ds-base.js: failed to load ' + s.src + ' — if this is a consuming project, point the base line in ds-base.js at the bound _ds/<folder> tree relative to this page (e.g. _ds/<folder> at the project root, ../_ds/<folder> one level down); in a fresh design system this can just mean the bundle is not compiled yet');
  document.head.appendChild(s);
})();
