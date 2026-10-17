// Depth chart: cumulative bids (left) and asks (right) as two step-area paths. levels: [[price, size], …] sorted.
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
export default function depth(box, bids, asks, { height = 200 } = {}) {
  const w = 1000, cum = (ls, rev) => { let s = 0; const out = (rev ? [...ls].reverse() : ls).map(([p, q]) => [p, s += q]); return rev ? out.reverse() : out; };
  const b = cum(bids, true), a = cum(asks, false);
  const lo = b[0][0], hi = a[a.length - 1][0], max = Math.max(b[0][1], a[a.length - 1][1]);
  const X = p => (p - lo) / (hi - lo) * w, Y = q => height - q / max * height;
  const step = (ls, startX) => { let d = `M${startX} ${height}`; for (const [p, q] of ls) d += `V${Y(q).toFixed(1)}H${X(p).toFixed(1)}`; return d + `V${height}z`; };
  const svg = el('svg', { viewBox: `0 0 ${w} ${height}`, preserveAspectRatio: 'none', class: 'chart' });
  svg.append(el('path', { d: step(b, 0), fill: 'var(--ok-s)', stroke: 'var(--ok-f)' }), el('path', { d: step(a, X(a[0][0])), fill: 'var(--no-s)', stroke: 'var(--no-f)' }),
    el('line', { x1: X(b[b.length - 1][0]), x2: X(a[0][0]), y1: 0, y2: height, stroke: 'var(--n4)', 'stroke-dasharray': '2 4' }));
  box.replaceChildren(svg);
  return svg;
}
