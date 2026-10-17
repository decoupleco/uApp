// A whole market-detail island: candles+volume, depth, a secondary line, period switch, metrics strip.
import candles from './candles.js'; import depth from './depth.js'; import spark from './spark.js';
export default (root, api) => {
  const price = root.querySelector('[data-chart=price]'), dep = root.querySelector('[data-chart=depth]'), sec = root.querySelector('[data-chart=secondary]');
  let period = '1D';
  const load = async () => {
    const d = await fetch(`${api}?p=${period}`).then(r => r.json());
    candles(price, d.candles); depth(dep, d.bids, d.asks); spark(sec, d.secondary, { w: 1000, h: 120 });
    for (const [k, v] of Object.entries(d.metrics)) { const m = root.querySelector(`[data-metric=${k}]`); if (m) m.textContent = v; }
  };
  root.addEventListener('click', e => { const b = e.target.closest('[data-period]'); if (!b) return; period = b.dataset.period;
    for (const x of root.querySelectorAll('[data-period]')) x.setAttribute('aria-pressed', x === b); load(); });
  return load();
};
