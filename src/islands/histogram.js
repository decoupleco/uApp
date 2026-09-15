// Tier 3: liquidity histogram — one SVG, no dependencies (lightweight-charts' floor is 44.8 KB brotli; this is ~0.5 KB).
// props: { ticks:[{tick,liquidity}], range:[lower,upper], current } — renders into el's `.chart` box (height reserved in CSS → CLS 0).
export default function histogram(el, { ticks = [], range = [0, 0], current = 0, onHover } = {}) {
  const box = el.querySelector('.chart') || el;
  const W = box.clientWidth || 640, H = box.clientHeight || 192, n = ticks.length || 1;
  const max = Math.max(...ticks.map(t => Number(t.liquidity)), 1), bw = W / n;
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'img'); svg.style.cssText = 'width:100%;height:100%;display:block';
  const rect = (x, y, w, h, fill, opacity = 1) => {
    const q = document.createElementNS(NS, 'rect');
    q.setAttribute('x', x); q.setAttribute('y', y); q.setAttribute('width', w); q.setAttribute('height', h);
    q.style.fill = fill; q.style.opacity = opacity; return q;
  };
  const idx = t => ticks.findIndex(k => k.tick >= t);
  const lo = idx(range[0]), hi = idx(range[1]);
  if (lo >= 0 && hi > lo) svg.append(rect(lo * bw, 0, (hi - lo) * bw, H, 'var(--ok-f)', .12));         // selected range overlay
  const spacing = ticks.length > 1 ? ticks[1].tick - ticks[0].tick : 1;
  ticks.forEach((t, i) => {
    const h = Number(t.liquidity) / max * (H - 8), inRange = t.tick >= range[0] && t.tick < range[1];
    const fill = Math.abs(t.tick - current) < spacing ? 'var(--no-f)' : inRange ? 'var(--ok-f)' : 'var(--ac)';   // current · in range · rest
    const q = rect(i * bw + .5, H - h, Math.max(bw - 1, 1), h, fill);
    q.addEventListener('pointerenter', () => onHover?.(t, i * bw, H - h));
    svg.append(q);
  });
  svg.addEventListener('pointerleave', () => onHover?.(null));
  box.replaceChildren(svg);
  return svg;
}
