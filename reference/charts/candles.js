// Candlestick + volume in one SVG. OHLC rows [t,o,h,l,c,v]. Token fills only; no axis library, no DPR math.
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
export default function candles(box, rows, { height = 320, volume = 72, pad = 8 } = {}) {
  const w = 1000, hPrice = height - volume - pad, n = rows.length, bw = w / n;
  let lo = Infinity, hi = -Infinity, vmax = 0;
  for (const r of rows) { if (r[3] < lo) lo = r[3]; if (r[2] > hi) hi = r[2]; if (r[5] > vmax) vmax = r[5]; }
  const y = v => hPrice - (v - lo) / (hi - lo) * hPrice;
  const svg = el('svg', { viewBox: `0 0 ${w} ${height}`, preserveAspectRatio: 'none', class: 'chart' });
  // one path per colour: thousands of candles are still four DOM nodes
  const up = [], dn = [], upW = [], dnW = [], vol = [];
  rows.forEach((r, i) => {
    const x = i * bw + bw / 2, rising = r[4] >= r[1];
    (rising ? upW : dnW).push(`M${x.toFixed(1)} ${y(r[2]).toFixed(1)}V${y(r[3]).toFixed(1)}`);
    const top = y(Math.max(r[1], r[4])), bot = y(Math.min(r[1], r[4]));
    (rising ? up : dn).push(`M${(x - bw * .35).toFixed(1)} ${top.toFixed(1)}h${(bw * .7).toFixed(1)}v${Math.max(bot - top, 1).toFixed(1)}h-${(bw * .7).toFixed(1)}z`);
    vol.push(`M${(x - bw * .35).toFixed(1)} ${height}v-${(r[5] / vmax * volume).toFixed(1)}h${(bw * .7).toFixed(1)}v${(r[5] / vmax * volume).toFixed(1)}z`);
  });
  svg.append(el('path', { d: vol.join(''), fill: 'var(--n3)' }),
    el('path', { d: upW.join(''), stroke: 'var(--ok-f)', 'stroke-width': 1.5 }), el('path', { d: dnW.join(''), stroke: 'var(--no-f)', 'stroke-width': 1.5 }),
    el('path', { d: up.join(''), fill: 'var(--ok-f)' }), el('path', { d: dn.join(''), fill: 'var(--no-f)' }));
  // crosshair + readout: one line, one text, pointer events only
  const cross = el('line', { y1: 0, y2: hPrice, stroke: 'var(--fg3)', 'stroke-dasharray': '4 4', visibility: 'hidden' });
  const label = el('text', { y: 14, fill: 'var(--fg)', 'font-size': 12, 'font-family': 'var(--fm)', visibility: 'hidden' });
  svg.append(cross, label);
  svg.addEventListener('pointermove', e => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(e.offsetX / svg.clientWidth * n))), r = rows[i], x = i * bw + bw / 2;
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
    label.textContent = `O ${r[1]} H ${r[2]} L ${r[3]} C ${r[4]} V ${r[5]}`; label.setAttribute('x', x < w / 2 ? x + 8 : x - 8); label.setAttribute('text-anchor', x < w / 2 ? 'start' : 'end'); label.setAttribute('visibility', 'visible');
  });
  svg.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); label.setAttribute('visibility', 'hidden'); });
  box.replaceChildren(svg);
  return svg;
}
