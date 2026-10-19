// lib/ui.js — the build-time helpers shared by the design pages (blocks.js, pairs-pro.js): seeded data, SVG charts,
// HTML fragments, and the composite CSS those fragments rely on. Pure functions over strings; no side effects except
// reading preview.html once. Each page keeps its own data, layout and inline script.
export const preview = await Bun.file(`${import.meta.dir}/../preview.html`).text();

// ---------- deterministic data (seeded, so a rebuild never changes a chart by accident) ----------
let seed = 7;
export const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
export const walk = (n, p = 100, vol = .03) => { const a = []; for (let i = 0; i < n; i++) { p *= 1 + (rnd() - .5) * vol; a.push(p); } return a; };
export const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const short = (n, d) => n.toLocaleString('en-US', { maximumFractionDigits: d });
export const usd = n => n >= 1e9 ? `$${short(n / 1e9, 2)}B` : n >= 1e6 ? `$${short(n / 1e6, 1)}M` : n >= 1e3 ? `$${short(n / 1e3, 1)}k` : `$${fmt(n)}`;
export const tok = (n, sym) => (n >= 1e9 ? `${short(n / 1e9, 2)}B` : n >= 1e6 ? `${short(n / 1e6, 1)}M` : n >= 1e3 ? `${short(n / 1e3, 1)}k` : fmt(n)) + ' ' + sym;

// ---------- SVG primitives (the same arithmetic as reference/charts, rendered at build time) ----------
export const spark = (pts, w = 96, h = 28, cls = 'spark', label = 'trend') => {
  const wide = /wide/.test(cls);
  const lo = Math.min(...pts), hi = Math.max(...pts), n = pts.length, up = pts[n - 1] >= pts[0];
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (n - 1) * w).toFixed(0)} ${(h - 2 - (v - lo) / (hi - lo || 1) * (h - 4)).toFixed(0)}`).join('');
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}"${wide ? ' preserveAspectRatio=none' : ''} role=img aria-label="${label} ${up ? 'up' : 'down'}"><title>${label} ${up ? 'up' : 'down'}</title><path d="${d}" stroke="var(--${up ? 'ok' : 'no'}-f)"/></svg>`;
};
export const area = (pts, w = 1000, h = 240, id = 'g') => {
  const lo = Math.min(...pts) * .98, hi = Math.max(...pts) * 1.02, n = pts.length;
  const P = pts.map((v, i) => `${(i / (n - 1) * w).toFixed(0)} ${(h - 4 - (v - lo) / (hi - lo) * (h - 8)).toFixed(0)}`);
  return `<svg class=chart viewBox="0 0 ${w} ${h}" preserveAspectRatio=none aria-hidden=true><defs><linearGradient id="${id}" x1=0 y1=0 x2=0 y2=1><stop offset=0 stop-color="var(--c1)" stop-opacity=.35/><stop offset=1 stop-color="var(--c1)" stop-opacity=0/></linearGradient></defs><path d="M${P[0]}L${P.join('L')}V${h}H0z" fill="url(#${id})"/><path d="M${P.join('L')}" fill=none stroke="var(--c1)" stroke-width=2/><line class=xh y1=0 y2=${h} stroke="var(--fg3)" stroke-dasharray="4 4" visibility=hidden/></svg>`;
};
export const line = (pts, w, h, color, lo, hi) => { const n = pts.length; return `<path d="M${pts.map((v, i) => `${(i / (n - 1) * w).toFixed(0)} ${(h - 4 - (v - lo) / (hi - lo) * (h - 8)).toFixed(0)}`).join('L')}" fill=none stroke="${color}" stroke-width=2/>`; };

// ---------- shared fragments ----------
export const tk = (a, b, lg) => `<span class="tk${lg ? ' lg' : ''}"><i>${a[0]}</i><i>${b[0]}</i></span>`;
export const netLbl = c => `<span class="net-lbl">${netIcon(c)}${c}</span>`;
export const seg = (opts, on = 0, attr = 'data-period', label = 'Period') => `<div class=seg role=group aria-label="${label}">${opts.map((o, i) => `<button ${attr}="${o}" aria-pressed=${i === on}>${o}</button>`).join('')}</div>`;
export const thead = cols => `<thead><tr>${cols.map(c => `<th${/TVL|Vol|Fees|APR|Rate|Supply|Borrow|Lend|Amount|Size|Cumul|Price|APY|Shares|Value/.test(c) ? ' class=num' : ''}>${c}</th>`).join('')}</tr></thead>`;
export const metric = (k, v, d) => `<div class="panel stack tighter"><span class=eyebrow>${k}</span><b class="num lg">${v}</b>${d ? `<span class="delta sm" data-d="${/^[-−]/.test(d) ? 'down' : 'up'}">${d}</span>` : ''}</div>`;
export const kv = pairs => `<dl class=kv>${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
export const meter = (pct, v, label = 'Progress', text = `${pct}%`) => `<div class=meter data-v=${v} role=meter aria-label="${label}" aria-valuenow=${pct} aria-valuemin=0 aria-valuemax=100 aria-valuetext="${text}"><i style="width:${pct}%"></i></div>`;
export const rangeBar = (lo, hi, cur) => `<div class=rangebar aria-hidden=true><i class=band style="left:${lo}%;width:${hi - lo}%"></i><i class=cur style="left:${cur}%"></i></div>`;
export const NET = {
  Base: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  Ethereum: 'M8 1 3.2 8.3 8 11.2l4.8-2.9zM3.2 9.4 8 15l4.8-5.6L8 12.2z',
  Mezo: 'M8 1.5 13.6 4.7v6.6L8 14.5 2.4 11.3V4.7zM8 4.3 4.9 6.1v3.8L8 11.7l3.1-1.8V6.1z',
  Arbitrum: 'M8 1.5 14 5v6L8 14.5 2 11V5zm0 3.2L5.1 10h5.8z',
  Sonic: 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm-3 5h6v1.5H5zm0 3h6V11H5z',
};
export const netIcon = n => `<svg class=net viewBox="0 0 16 16" role=img aria-label="${n}"><title>${n}</title><path d="${NET[n] || NET.Base}"/></svg>`;
export const two = (a, b) => `<div class=num>${a}<div class="xs muted">${b}</div></div>`;        // token amount over its USD
export const stackLbl = (a, b) => `<div class="stk"><span class="pill sm">${a}</span><span class="xs muted">${b}</span></div>`;  // two short labels, stacked

// ---------- charts with data kept for hover readouts ----------
export const candleData = (n, vol = .006, p0 = 2431.5) => { let p = p0; const rows = []; for (let i = 0; i < n; i++) { const o = p, h = o * (1 + rnd() * vol), l = o * (1 - rnd() * vol), c = l + rnd() * (h - l); p = c; rows.push([+o.toFixed(2), +h.toFixed(2), +l.toFixed(2), +c.toFixed(2), +(rnd() * 900 + 50).toFixed(1)]); } return rows; };
// band series: one object per candle — { base:[lo,hi], limit:[lo,hi]|null, ref, src:'keeper'|'backfill', update } —
// drawn as step polygons per run of equal source (backfill dashed, keeper solid), a reference line through the row
// centres (EMA while projected, update price once deployed) and a ▼ at every allocation update. Everything is `.band`.
const bandSeries = (bands, y, bw) => {
  const poly = rows => rows.map(([i, v], k) => `${k ? 'L' : 'M'}${(i * bw).toFixed(0)} ${y(v[1]).toFixed(0)}H${((i + 1) * bw).toFixed(0)}`).join('')
    + rows.slice().reverse().map(([i, v]) => `L${((i + 1) * bw).toFixed(0)} ${y(v[0]).toFixed(0)}H${(i * bw).toFixed(0)}`).join('') + 'z';
  let out = '';
  for (const key of ['base', 'limit']) {
    let cur = null;
    const flush = () => { if (!cur) return; const dash = cur.src === 'backfill' ? ' stroke-dasharray="4 3"' : '';
      out += key === 'base' ? `<path class="band base" d="${poly(cur.rows)}" fill="var(--ok-s)" stroke="var(--ok-f)"${dash}/>` : `<path class="band limit" d="${poly(cur.rows)}" fill=none stroke="var(--c3)"${dash}/>`; cur = null; };
    bands.forEach((b, i) => { const v = b[key]; if (!v) { flush(); return; } if (cur && cur.src === b.src) cur.rows.push([i, v]); else { flush(); cur = { src: b.src, rows: [[i, v]] }; } });
    flush();
  }
  let ref = '', k = 0; bands.forEach((b, i) => { if (b.ref == null) { k = 0; return; } ref += `${k++ ? 'L' : 'M'}${(i * bw + bw / 2).toFixed(0)} ${y(b.ref).toFixed(0)}`; });
  if (ref) out += `<path class="band ref" d="${ref}" fill=none stroke="var(--c1)" stroke-width=1.5/>`;
  const upd = bands.map((b, i) => b.update ? `M${(i * bw + bw / 2 - 4).toFixed(0)} 0h8l-4 7z` : '').join('');
  if (upd) out += `<path class="band upd" d="${upd}" fill="var(--fg)"/>`;
  return out;
};
export const candleSvg = (rows, height = 240, volume = 56, band = null) => {
  const w = 1000, hP = height - volume - 8, n = rows.length, bw = w / n;
  let lo = 1e9, hi = -1e9, vm = 0; for (const r of rows) { lo = Math.min(lo, r[2]); hi = Math.max(hi, r[1]); vm = Math.max(vm, r[4]); }
  if (band && typeof band[0] === 'object') for (const b of band) for (const v of [b.base, b.limit]) if (v) { lo = Math.min(lo, v[0]); hi = Math.max(hi, v[1]); }
  const y = v => hP - (v - lo) / (hi - lo) * hP; let up = '', dn = '', uw = '', dw = '', vol = '';
  rows.forEach((r, i) => { const x = i * bw + bw / 2, ris = r[3] >= r[0], wick = `M${x.toFixed(0)} ${y(r[1]).toFixed(0)}V${y(r[2]).toFixed(0)}`; ris ? uw += wick : dw += wick;
    const t = y(Math.max(r[0], r[3])), b = y(Math.min(r[0], r[3])), body = `M${(x - bw * .35).toFixed(0)} ${t.toFixed(0)}h${(bw * .7).toFixed(0)}v${Math.max(b - t, 1).toFixed(0)}h-${(bw * .7).toFixed(0)}z`; ris ? up += body : dn += body;
    vol += `M${(x - bw * .35).toFixed(0)} ${height}v-${(r[4] / vm * volume).toFixed(0)}h${(bw * .7).toFixed(0)}v${(r[4] / vm * volume).toFixed(0)}z`; });
  const bandRect = !band ? '' : typeof band[0] === 'object' ? bandSeries(band, y, bw) : `<path class=band d="M0 ${y(band[1]).toFixed(0)}H${w}V${y(band[0]).toFixed(0)}H0z" fill="var(--ok-s)" stroke="var(--ok-b)"/>`;
  return `<svg class=chart viewBox="0 0 ${w} ${height}" preserveAspectRatio=none aria-hidden=true>${bandRect}<path d="${vol}" fill="var(--n3)"/><path d="${uw}" stroke="var(--ok-f)"/><path d="${dw}" stroke="var(--no-f)"/><path d="${up}" fill="var(--ok-f)"/><path d="${dn}" fill="var(--no-f)"/><line class=xh y1=0 y2=${height} stroke="var(--fg3)" stroke-dasharray="4 4" visibility=hidden/></svg>`;
};
export const lineSvg = (series, w = 1000, h = 240) => { const all = series.flatMap(s => s.pts), lo = Math.min(...all) * .97, hi = Math.max(...all) * 1.03;
  return `<svg class=chart viewBox="0 0 ${w} ${h}" preserveAspectRatio=none aria-hidden=true>${series.map(s => line(s.pts, w, h, s.color, lo, hi)).join('')}<line class=xh y1=0 y2=${h} stroke="var(--fg3)" stroke-dasharray="4 4" visibility=hidden/></svg>`; };
export const head = (title, sub, right) => `<div class="row between wrap start"><div><h3>${title}</h3>${sub ? `<p class="sm muted">${sub}</p>` : ''}</div>${right}</div>`;
export const readout = (text = 'hover or focus and use ← → for values') => `<p class="readout mono xs muted" aria-live=polite>${text}</p>`;
export const hoverBox = (svg, data, ar = '1000/240') => `<div class=chartbox tabindex=0 role=group aria-label="Chart — use ← → to read values" data-hover='${JSON.stringify(data, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v).replace(/'/g, '&#39;')}'${ar === '1000/240' ? '' : ` style="aspect-ratio:${ar}"`}>${svg}</div>`;

// ---------- page assembly ----------
export const prune = (css, html) => css.replace(/@layer (\w+)\{([\s\S]*)\}$/, (m, name, body) => {
  const out = []; let i = 0;
  while (i < body.length) {
    const b = body.indexOf('{', i); if (b < 0) break;
    let d = 1, j = b + 1; while (j < body.length && d) { if (body[j] === '{') d++; else if (body[j] === '}') d--; j++; }
    const sel = body.slice(i, b).trim(), rule = body.slice(i, j); i = j;
    if (sel.startsWith('@') || !sel) { out.push(rule); continue; }                       // keep @media blocks and the like
    const classes = [...sel.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(x => x[1]);
    if (!classes.length || classes.some(c => new RegExp(`class=["']?[^"'>]*\\b${c}\\b`).test(html))) out.push(rule);
  }
  return `@layer ${name}{${out.join('')}}`;
});
export const layer = name => {                      // every @layer <name>{…} block in the gallery, concatenated
  const out = []; let from = 0;
  for (;;) {
    const start = preview.indexOf(`@layer ${name}{`, from); if (start < 0) break;
    let depth = 1, j = start + `@layer ${name}{`.length;
    while (j < preview.length && depth) { if (preview[j] === '{') depth++; else if (preview[j] === '}') depth--; j++; }
    out.push(preview.slice(start, j)); from = j;
  }
  return out.join('\n');
};
export const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// composite classes the fragments depend on; a page pastes this into its own @layer and may prune it
export const COMPOSITES = String.raw`.table{width:100%;border-collapse:collapse;font-size:.8125rem;line-height:1.3}.table th,.table td{padding:.45rem .6rem;border-block-end:1px solid var(--n3);white-space:nowrap;vertical-align:middle;height:2.75rem}.table th{text-align:left;font-size:.6875rem;font-weight:650;text-transform:uppercase;letter-spacing:.1em;color:var(--fg3)}.table th.num,.table td.num{text-align:right;font-variant-numeric:tabular-nums lining-nums}.table td .tk{margin-inline-end:.4rem;vertical-align:middle}.table.tall td{height:3.9rem}.table tr.group td{background:var(--n1);height:2.2rem}.table tbody tr:last-child td{border-block-end:0}
.spark{width:6rem;height:1.75rem;display:block}
.rangebar{position:relative;height:.5rem;border-radius:var(--rf);background:var(--n3)}.rangebar .band{position:absolute;top:0;bottom:0;background:var(--ok-b);border-radius:var(--rf)}.rangebar .cur{position:absolute;top:-.25rem;width:2px;height:1rem;background:var(--fg);border-radius:1px;transform:translateX(-1px)}
.book{display:flex;flex-direction:column;font-size:.8125rem}.book .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;padding:.25rem .4rem;background:linear-gradient(to left,var(--s,var(--ac-s)) var(--w),transparent var(--w));border-radius:.25rem}.book .row[data-side=lend]{--s:var(--ok-s)}.book .row[data-side=borrow]{--s:var(--no-s)}.book .row>:last-child,.book .row>:nth-child(2){text-align:right}
.hs{list-style:none;padding:0;margin:0;gap:.5rem;flex-wrap:wrap}.hs li{display:flex;align-items:center;gap:.5rem;color:var(--fg3)}.hs .n{width:1.6rem;height:1.6rem;border-radius:var(--rf);border:1px solid var(--n3);display:grid;place-items:center;font-size:.7rem;font-weight:700;background:var(--n0)}.hs [data-s=done] .n{background:var(--ok-s);border-color:var(--ok-b);color:var(--ok-f)}.hs [data-s=now] .n{background:var(--ac-s);border-color:var(--ac-b);color:var(--ac-f);box-shadow:0 0 0 3px var(--ac-r)}.hs [data-s] .t{color:var(--fg);font-weight:600}
.net{width:1rem;height:1rem;fill:var(--fg3);display:inline-block;vertical-align:middle}td.netc{text-align:center;width:3.5rem}
.stk{display:flex;flex-direction:column;align-items:flex-end;gap:.2rem;white-space:nowrap}
.posrows{display:grid;grid-template-columns:auto 1fr auto auto auto auto;gap:.6rem 1rem;align-items:center}.posrows .prow{display:contents}.posrows .prow>*{white-space:nowrap}
@media(max-width:48rem){.posrows{grid-template-columns:auto 1fr auto}.posrows .prow>.num,.posrows .prow>.delta{grid-column:2;justify-self:start}}
@media(max-width:60rem){.variant .grid-4,.variant .grid-2{grid-template-columns:1fr 1fr}}
.readout{min-height:1.25em;min-height:1lh;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.row>.readout{flex:1 1 auto;text-align:end}
.chartbox .xh{opacity:1}
.btn[aria-pressed=true]{background:var(--ac-s);color:var(--ac-f);box-shadow:inset 0 0 0 1px var(--ac-b)}
.variant h2,.variant h3{margin:0}.narrow{max-width:24rem}.narrower{max-width:22rem}.tight{gap:.4rem}.tighter{gap:.25rem}.loose{gap:1rem}.looser{gap:1.5rem}.loosest{gap:2rem}.start{align-items:flex-start}.end{align-items:flex-end}.baseline{align-items:baseline}.num.lg{font-size:1.25rem}.spark.wide{width:100%;height:2rem}
.you{color:var(--fg)}           /* the middle label of a bar: where you are, at body colour */
.pickrow{width:100%;text-align:left;padding:.5rem .25rem;border-radius:var(--r1)}.pickrow[aria-pressed=true]{background:var(--ac-s)}
.net-lbl{display:inline-flex;align-items:center;gap:.3rem;font-size:.75rem;color:var(--fg2)}
.legend i{background:var(--k,var(--fg3))}
.pill.acct{gap:.4rem;padding:.25rem .5rem .25rem .25rem;border:1px solid var(--b,var(--n3));background:var(--s,var(--n0))}.chartbox{position:relative;cursor:crosshair;touch-action:pan-y;aspect-ratio:1000/240}.chartbox:focus-visible{outline:2px solid var(--ac);outline-offset:2px}`;
