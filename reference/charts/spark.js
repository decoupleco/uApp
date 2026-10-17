// Sparkline: one polyline, coloured by sign of the period change. 7 days at 1 point/hour is 168 numbers.
const NS = 'http://www.w3.org/2000/svg';
export default function spark(box, pts, { w = 96, h = 28 } = {}) {
  const lo = Math.min(...pts), hi = Math.max(...pts), n = pts.length;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (n - 1) * w).toFixed(1)} ${(h - 2 - (v - lo) / (hi - lo || 1) * (h - 4)).toFixed(1)}`).join('');
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('class', 'spark');
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke-width', '1.5');
  p.setAttribute('stroke', pts[n - 1] >= pts[0] ? 'var(--ok-f)' : 'var(--no-f)');
  svg.append(p); box.replaceChildren(svg); return svg;
}
