// Tier 1 core — inlined into the document. Inline islands run at load; lazy islands are an EXPLICIT map
// (a template-literal import() cannot be resolved statically and would fetch every candidate).
import tl from './isl-timeline.js';
import am from './isl-amount.js';

const R = { timeline: tl, amount: am };                                   // inline (tier 1)
const L = {                                                               // lazy (tier 3), served from /i/
  histogram: () => import('/i/histogram.js'),
  wallet:    () => import('/i/wallet.js'),
  demo:      () => import('/i/svelte-demo.js'),
  demo2:     () => import('/i/svelte-demo2.js'),
};

const r = document.documentElement;
addEventListener('click', e => {
  const b = e.target.closest('[data-set-theme]');
  if (b) { r.dataset.t = b.dataset.setTheme; try { localStorage.mui = r.dataset.t } catch {} }
});

const props = el => JSON.parse(el.dataset.props || '{}');
const seen = new WeakSet();
const load = el => { if (seen.has(el)) return; seen.add(el); L[el.dataset.island]().then(m => m.default(el, props(el))) };
const io = 'IntersectionObserver' in window &&
  new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); load(e.target) } }, { rootMargin: '200px' });

for (const el of document.querySelectorAll('[data-island]')) {
  const n = el.dataset.island;
  if (R[n]) R[n](el, props(el));                                          // now
  else if (!L[n]) continue;
  else if (el.dataset.on === 'visible' && io) io.observe(el);             // when scrolled near
  else el.addEventListener(el.dataset.on || 'pointerdown', () => load(el), { once: true });  // on gesture
}
