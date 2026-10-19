// blocks.js — render the top-ten view blocks, each in 3–5 variants, into blocks.html (deployed as /design/blocks/).
// The page is a review tool: every variant renders live in the viewer's theme, the agent's pick is marked with its
// reason, the reviewer marks theirs and writes what to change, and "Copy review" hands the round back as JSON.
// Tokens and recipes are lifted from preview.html so the blocks are built from the same vocabulary as the gallery.
// A review round is an edit to the BLOCKS data below, then `bun ./blocks.js`.
import { rnd, walk, fmt, short, usd, tok, spark, area, line, tk, netLbl, seg, thead, metric, kv, meter, rangeBar, netIcon, two, stackLbl, candleData, candleSvg, lineSvg, head, readout, hoverBox, prune, layer, esc, COMPOSITES } from './lib/ui.js';

// ---------- deterministic data (seeded, so a rebuild never changes a chart by accident) ----------

// ---------- SVG primitives (the same arithmetic as reference/charts, rendered at build time) ----------
const candles = (n = 48, height = 240, volume = 56) => {
  const w = 1000, hP = height - volume - 8, bw = w / n; let p = 2431.5; const rows = [];
  for (let i = 0; i < n; i++) { const o = p, h = o * (1 + rnd() * .006), l = o * (1 - rnd() * .006), c = l + rnd() * (h - l); p = c; rows.push([o, h, l, c, rnd() * 900 + 50]); }
  let lo = 1e9, hi = -1e9, vm = 0; for (const r of rows) { lo = Math.min(lo, r[2]); hi = Math.max(hi, r[1]); vm = Math.max(vm, r[4]); }
  const y = v => hP - (v - lo) / (hi - lo) * hP; let up = '', dn = '', uw = '', dw = '', vol = '';
  rows.forEach((r, i) => { const x = i * bw + bw / 2, ris = r[3] >= r[0], wick = `M${x.toFixed(0)} ${y(r[1]).toFixed(0)}V${y(r[2]).toFixed(0)}`; ris ? uw += wick : dw += wick;
    const t = y(Math.max(r[0], r[3])), b = y(Math.min(r[0], r[3])), body = `M${(x - bw * .35).toFixed(0)} ${t.toFixed(0)}h${(bw * .7).toFixed(0)}v${Math.max(b - t, 1).toFixed(0)}h-${(bw * .7).toFixed(0)}z`; ris ? up += body : dn += body;
    vol += `M${(x - bw * .35).toFixed(0)} ${height}v-${(r[4] / vm * volume).toFixed(0)}h${(bw * .7).toFixed(0)}v${(r[4] / vm * volume).toFixed(0)}z`; });
  return `<svg class=chart viewBox="0 0 ${w} ${height}" preserveAspectRatio=none aria-hidden=true><path d="${vol}" fill="var(--n3)"/><path d="${uw}" stroke="var(--ok-f)"/><path d="${dw}" stroke="var(--no-f)"/><path d="${up}" fill="var(--ok-f)"/><path d="${dn}" fill="var(--no-f)"/></svg>`;
};
const depthCurve = (h = 180) => { let d1 = 'M0 ' + h, d2 = `M500 ${h}`, q = 0; for (let i = 0; i < 40; i++) { q += rnd() * 20; d1 += `V${(h - q * h / 500).toFixed(0)}H${(i * 12.5).toFixed(0)}`; } d1 += `V${h}z`; q = 0; for (let i = 0; i < 40; i++) { q += rnd() * 20; d2 += `V${(h - q * h / 500).toFixed(0)}H${(500 + i * 12.5).toFixed(0)}`; } d2 += `V${h}z`;
  return `<svg class=chart viewBox="0 0 1000 ${h}" preserveAspectRatio=none aria-hidden=true><path d="${d1}" fill="var(--ok-s)" stroke="var(--ok-f)"/><path d="${d2}" fill="var(--no-s)" stroke="var(--no-f)"/><line x1=500 x2=500 y1=0 y2=${h} stroke="var(--n4)" stroke-dasharray="3 5"/></svg>`; };
const ticks = (n = 40, h = 160, range = [14, 26], cur = 20) => { const bw = 1000 / n; let s = ''; for (let i = 0; i < n; i++) { const v = (Math.sin(i / 5) + 1.2) * 40 + rnd() * 30, fill = i === cur ? 'var(--no-f)' : i >= range[0] && i < range[1] ? 'var(--ok-f)' : 'var(--c1)'; s += `<rect x=${(i * bw + 1).toFixed(0)} y=${(h - v).toFixed(0)} width=${(bw - 2).toFixed(0)} height=${v.toFixed(0)} fill="${fill}"/>`; } return `<svg class=chart viewBox="0 0 1000 ${h}" preserveAspectRatio=none aria-hidden=true>${s}</svg>`; };

// ---------- shared fragments ----------
const chainPill = c => `<span class="pill sm">${c}</span>`;
const MARKETS = [['WETH', 'USDC', 'Base', '0.05%', 184.2e6, 62.1e6, 31.0e3, 12.4], ['mUSD', 'BTC', 'Mezo', '0.30%', 48.7e6, 9.3e6, 27.9e3, 21.1], ['cbBTC', 'USDC', 'Base', 'LLTV 86%', 97.4e6, 4.2e6, 0, 4.61], ['USDC', 'WETH', 'Ethereum', 'LLTV 91.5%', 525.1e6, 18.8e6, 0, 3.99], ['wstETH', 'ETH', 'Ethereum', '0.01%', 310.5e6, 41.0e6, 4.1e3, 2.3]];
const rowDense = ([a, b, chain, kind, tvl, vol, fee, apr]) => `<tr><td>${tk(a, b)}<b>${a}/${b}</b> <span class=muted>${kind}</span></td><td>${chainPill(chain)}</td><td class=num>${usd(tvl)}</td><td class=num>${usd(vol)}</td><td class=num>${fee ? usd(fee) : '—'}</td><td class=num><b>${fmt(apr)}%</b> <span class="xs muted">${fee ? 'APR' : 'borrow'}</span></td><td>${spark(walk(24))}</td></tr>`;

// ---------- the ten blocks ----------
// ===== helpers added for round 2 =====
// Network as a 16px glyph, not a text pill: one path each, currentColor, labelled for screen readers.
const kind = term => term.replace(/^(\w+)/, m => m.toLowerCase());        // 'Fixed · 30 Oct' → 'fixed · 30 Oct'

// chart data is kept so hover readouts can be driven from it
const periods = (on = 1) => seg(['1D', '7D', '30D', 'All'], on);                               // one set, everywhere, right-aligned by the header

// ===== round-2 blocks =====
const LEND = [['USDC', 'cbBTC', 'Base', 86, 1.76e9, 1.59e9, 4.61, 3.99, 'Fixed · 30 Oct'], ['USDC', 'WETH', 'Ethereum', 91.5, 525.1e6, 418.3e6, 4.84, 4.12, 'Variable'], ['mUSD', 'BTC', 'Mezo', 80, 48.7e6, 31.2e6, 6.20, 5.41, 'Variable'], ['USDC', 'wstETH', 'Ethereum', 94.5, 312.4e6, 290.0e6, 4.07, 3.55, 'Fixed · 27 Nov']];
const AMM = [['WETH', 'USDC', 'Base', '0.05%', 10, 184.2e6, 62.1e6, 31.0e3, 12.4], ['mUSD', 'BTC', 'Mezo', '0.30%', 60, 48.7e6, 9.3e6, 27.9e3, 21.1], ['wstETH', 'ETH', 'Ethereum', '0.01%', 1, 310.5e6, 41.0e6, 4.1e3, 2.3], ['USDC', 'USDT', 'Arbitrum', '0.01%', 1, 92.0e6, 88.4e6, 8.8e3, 3.4]];
const lendRow = ([loan, col, net, lltv, supply, borrowed, br, lr, term]) => `<tr><td>${tk(col, loan)}<div><b>${col} / ${loan}</b><div class="xs muted">Collateral ${col} · Loan ${loan} · LLTV ${lltv}%</div></div></td><td class=netc>${netIcon(net)}</td><td class=num>${two(tok(supply, loan), usd(supply))}</td><td class=num>${two(tok(borrowed, loan), usd(borrowed))}</td><td class=num>${two('<b>' + fmt(br) + '%</b>', 'borrow · ' + kind(term))}</td><td class=num>${two('<b>' + fmt(lr) + '%</b>', 'lend · ' + kind(term))}</td><td>${spark(walk(168), 96, 28, 'spark', '7d')}</td></tr>`;
const ammRow = ([a, b, net, fee, ts, tvl, vol, fees, apr]) => `<tr><td>${tk(a, b)}<div><b>${a} / ${b}</b><div class="xs muted">Fee ${fee} · ts ${ts}</div></div></td><td class=netc>${netIcon(net)}</td><td class=num>${two(usd(tvl), tok(tvl / 2431, a))}</td><td class=num>${two(usd(vol), usd(fees) + ' fees')}</td><td class=num>${two('<b>' + fmt(apr) + '%</b>', 'fee APR · 7d')}</td><td class=num>${two('<b>' + fmt(vol / tvl * 100, 1) + '%</b>', 'vol / TVL · 24h')}</td><td>${spark(walk(24), 96, 28, 'spark', '24h')}</td></tr>`;
const toolbar = (kind) => `<div class="row wrap between"><div class="row wrap"><button class="btn sm ghost">Network ▾</button><button class="btn sm ghost">Token ▾</button><button class="btn sm" aria-pressed=${kind === 'lend'}>Lending</button><button class="btn sm" aria-pressed=${kind === 'amm'}>Pools</button></div><input class=field style="max-width:14rem" placeholder="Search markets" aria-label="Search markets"></div>`;

const MARKETS_BLOCK = { id: 'markets', wide: true, name: 'Markets table', products: 'PegCore · Pairs Pro · Mezo · Super Liquid',
  why: 'The index view every product opens on. Lending markets and AMM pools share a row skeleton — identity · network · two amounts · two rates · sparkline — and differ only in which columns fill it.',
  constraint: 'A rate always carries its kind (fixed · date, variable, lend, APR). Network is a 16 px glyph, never a text pill. Rows are a fixed height; sparklines are fixed boxes.',
  agent: { pick: 0, reason: 'Toolbar, two-line amounts and the lending columns: the row every product fills.' },
  variants: [
    { name: 'Lending markets — toolbar and two-line amounts', note: 'Toolbar; collateral / loan / LLTV under the pair; two-line amounts; both rates with their kind; network as a glyph.', html: `<div class=stack>${toolbar('lend')}<div class=scroll tabindex=0><table class="table tall">${thead(['Market', 'Network', 'Lent', 'Borrowed', 'Borrow rate', 'Lend rate', '7d'])}<tbody>${LEND.map(lendRow).join('')}</tbody></table></div><p class="xs muted">184 lending markets · showing 4</p></div>` },
    { name: 'AMM pools — same skeleton', note: 'The pool form of the same row: fee and tick spacing under the pair, two two-line amounts (fees sit under volume), two rates with their basis.', html: `<div class=stack>${toolbar('amm')}<div class=scroll tabindex=0><table class="table tall">${thead(['Pool', 'Network', 'TVL', 'Volume 24h', 'Fee APR', 'Vol / TVL', '24h'])}<tbody>${AMM.map(ammRow).join('')}</tbody></table></div><p class="xs muted">1,284 pools · showing 4</p></div>` },
    { name: 'Dense — single line', note: 'Sharp density; one line per row, kind inline, glyph network column.', html: `<div class=scroll tabindex=0><table class=table>${thead(['Market', 'Network', 'Lent', 'Borrowed', 'Borrow rate', 'Lend rate', '7d'])}<tbody>${LEND.map(([loan, col, net, lltv, supply, borrowed, br, lr, term]) => `<tr><td>${tk(col, loan)}<b>${col}/${loan}</b> <span class="xs muted">LLTV ${lltv}%</span></td><td class=netc>${netIcon(net)}</td><td class=num>${usd(supply)}</td><td class=num>${usd(borrowed)}</td><td class=num><b>${fmt(br)}%</b> <span class="xs muted">${kind(term)}</span></td><td class=num><b>${fmt(lr)}%</b> <span class="xs muted">lend</span></td><td>${spark(walk(168))}</td></tr>`).join('')}</tbody></table></div>` },
    { name: 'Grouped by network', note: 'Group header rows with the glyph and network totals; drops the network column.', html: `<div class=scroll tabindex=0><table class="table tall">${thead(['Market', 'Lent', 'Borrowed', 'Borrow rate', 'Lend rate', '7d'])}<tbody>${['Base', 'Ethereum', 'Mezo'].map(c => `<tr class=group><td colspan=6><span class="row tight">${netIcon(c)}<b>${c}</b><span class="xs muted">${LEND.filter(m => m[2] === c).length} markets · ${usd(LEND.filter(m => m[2] === c).reduce((s, m) => s + m[4], 0))}</span></span></td></tr>${LEND.filter(m => m[2] === c).map(([loan, col, , lltv, supply, borrowed, br, lr, term]) => `<tr><td>${tk(col, loan)}<div><b>${col} / ${loan}</b><div class="xs muted">Collateral ${col} · Loan ${loan} · LLTV ${lltv}%</div></div></td><td class=num>${two(tok(supply, loan), usd(supply))}</td><td class=num>${two(tok(borrowed, loan), usd(borrowed))}</td><td class=num>${two('<b>' + fmt(br) + '%</b>', 'borrow · ' + kind(term))}</td><td class=num>${two('<b>' + fmt(lr) + '%</b>', 'lend · ' + kind(term))}</td><td>${spark(walk(168))}</td></tr>`).join('')}`).join('')}</tbody></table></div>` },
    { name: 'Card list (mobile)', note: 'The phone form: one card per market, glyph beside the pair, 2×2 metrics, sparkline across the bottom.', html: `<div class=grid style="grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))">${LEND.slice(0, 3).map(([loan, col, net, lltv, supply, borrowed, br, lr, term]) => `<div class="card stack"><div class="row between"><div class=row>${tk(col, loan)}<b>${col} / ${loan}</b></div>${netIcon(net)}</div><div class="grid grid-2 tight"><div><span class="xs muted">Lent</span><div class=num>${usd(supply)}</div></div><div><span class="xs muted">Borrowed</span><div class=num>${usd(borrowed)}</div></div><div><span class="xs muted">Borrow · ${kind(term)}</span><div class=num><b>${fmt(br)}%</b></div></div><div><span class="xs muted">Lend</span><div class=num><b>${fmt(lr)}%</b></div></div></div>${spark(walk(168), 320, 32, 'spark wide', '7d')}</div>`).join('')}</div>` },
  ] };

// one skeleton for every position card: header · bar · three rows · actions; the bar can sit above or below the rows
const posCard = ({ a, b, kind, kind2, status, v, bar, rows, actions, barPos = 'top' }) => {
  const barHtml = `<div class="stack tight">${bar}</div>`;
  return `<div class="card stack narrow"><div class="row between start"><div class=row>${tk(a, b)}<div><b>${a} / ${b}</b><div class="xs muted">${kind}</div></div></div>${stackLbl(status, kind2)}</div>${barPos === 'top' ? barHtml : ''}${kv(rows)}${barPos === 'bottom' ? barHtml : ''}<div class=row>${actions.map(x => `<button class="btn grow">${x}</button>`).join('')}</div></div>`;
};
const healthBar = () => `${meter(Math.round(61 / 86 * 100), 'ok', 'LTV', '61%, liquidation at 86%, health 1.41')}<div class="row between xs muted"><span><b class=num>0%</b></span><span class="sm you">LTV <b class=num>61%</b> · health <b class=num>1.41</b></span><span>liquidation <b class=num>86%</b></span></div>`;
const rangeBarFull = () => `${rangeBar(30, 70, 52)}<div class="row between xs muted"><span><b class=num>2,250</b> min</span><span class="sm you">spot <b class=num>2,431.14</b> · in range</span><span><b class=num>2,650</b> max</span></div>`;
const termBar = () => `${meter(72, 'wa', 'Term', '13 d left, matures 30 Oct')}<div class="row between xs muted"><span>Filled <b class=num>18 Sep</b></span><span class="sm you"><b class=num>13 d</b> left</span><span>Matures <b class=num>30 Oct</b></span></div>`;

const POSITION_BLOCK = { id: 'position', name: 'Position card', products: 'PegCore · Pairs Pro · Mezo · Super Liquid',
  why: 'Risk is read from it. One information architecture for every position: identity, a bar that says how close to the edge, three rows (size · rate · accrued), the next action.',
  constraint: 'The bar — health, range or term — always has three labels: low edge, where you are, high edge. "Accrued" means the same thing on every card: signed, + owed to you, − owed by you. Header labels stack vertically to keep the header short.',
  agent: { pick: 0, reason: 'A and B share one skeleton; only the bar\'s place differs. Pick by eye.' },
  variants: [
    { name: 'Borrow — bar on top', note: 'Borrow rate on the card; the bar reads 0% · LTV · liquidation; term and due stacked at the right.', html: posCard({ a: 'cbBTC', b: 'USDC', kind: 'Borrow · Base', kind2: 'Due in 13 d', status: 'Fixed · 30 Oct', bar: healthBar(), rows: [['Debt', '<span class=num>28,000 USDC</span> · <span class="xs muted">0.50 cbBTC collateral</span>'], ['Borrow rate', '<b class=num>4.61%</b> fixed · 30 Oct'], ['Accrued', '<b class=num>−$89.41</b> <span class="xs muted">interest owed</span>']], actions: ['Repay', 'Add collateral'] }) },
    { name: 'Borrow — bar at bottom', note: 'Identical content with the bar after the rows: the numbers lead, the risk read closes the card.', html: posCard({ a: 'cbBTC', b: 'USDC', kind: 'Borrow · Base', kind2: 'Due in 13 d', status: 'Fixed · 30 Oct', bar: healthBar(), rows: [['Debt', '<span class=num>28,000 USDC</span> · <span class="xs muted">0.50 cbBTC collateral</span>'], ['Borrow rate', '<b class=num>4.61%</b> fixed · 30 Oct'], ['Accrued', '<b class=num>−$89.41</b> <span class="xs muted">interest owed</span>']], actions: ['Repay', 'Add collateral'], barPos: 'bottom' }) },
    { name: 'Liquidity — same skeleton', note: 'The range bar has the same three labels as the health bar (min · spot · max); accrued carries the fees, same semantics as the borrow card.', html: posCard({ a: 'WETH', b: 'USDC', kind: 'Liquidity · 0.05% · Mezo', kind2: 'since 14 Oct', status: 'In range', bar: rangeBarFull(), rows: [['Liquidity', '1.00 WETH + 2,431 USDC · $4,862'], ['Fee APR', '<b>12.4%</b> 7d'], ['Accrued', '<b class=num>+$31.20</b> <span class="xs muted">fees · 0.0088 WETH + 9.81 USDC</span>']], actions: ['Collect', 'Adjust range'] }) },
    { name: 'Fixed lend — same skeleton', note: 'The term bar has the same three labels (filled · left · matures); lend rate and accrued read exactly like the borrow card.', html: posCard({ a: 'USDC', b: 'WETH', kind: 'Lend · Ethereum', kind2: 'Due in 13 d', status: 'Fixed · 30 Oct', bar: termBar(), rows: [['Lent', '50,000 USDC'], ['Lend rate', '<b>4.61%</b> fixed'], ['Accrued', '<b class=num>+$89.41</b> <span class="xs muted">interest · auto-renew on</span>']], actions: ['Set renewal', 'Withdraw at maturity'] }) },
    { name: 'Compact rows — aligned', span: true, note: 'A grid, so pairs, sizes, accrued, health and actions sit in columns; the money column is the same accrued figure as the cards. Stacks on a phone.', html: `<div class="card posrows">${[['cbBTC', 'USDC', 'Borrow · Base', '28,000 USDC', '−$89.41', 'down', 'ok', '1.41'], ['WETH', 'USDC', 'Liquidity · 0.05% · Mezo', '$4,862', '+$31.20', 'up', 'wa', 'near edge'], ['USDC', 'WETH', 'Lend · Ethereum', '50,000 USDC', '+$89.41', 'up', 'ok', '13 d left']].map(([a, b, k, size, pnl, d, v, h]) => `<div class=prow>${tk(a, b)}<div><b>${a} / ${b}</b><div class="xs muted">${k}</div></div><span class=num>${size}</span><span class="delta sm" data-d=${d}>${pnl}</span><span class="pill sm" data-v=${v}>${h}</span><button class="btn sm">Manage</button></div>`).join('')}</div>` },
  ] };

const OHLC = candleData(48);
const CHART_BLOCK = { id: 'chart', name: 'Chart card', products: 'price · rate · performance — every product',
  why: 'The card is the unit: title, period control, the chart, a footer that states the trend in words. Values appear on hover, never as a permanent readout.',
  constraint: 'One period set everywhere — 1D · 7D · 30D · All — right-aligned in the header. Boxes have aspect-ratio and already hold the snapshot. Hover shows the values for the candle or point under the cursor.',
  agent: { pick: 4, reason: 'E carries the CL band, show-range and type switch a Mezo position page needs.' },
  variants: [
    { name: 'Candles — with volume', note: 'Readout on hover or keyboard only; period control right-aligned.', html: (() => { const d = OHLC; return `<div class="card stack">${head('Price', 'WETH / USDC · 1H', periods(1))}${readout()}${hoverBox(candleSvg(d), { kind: 'ohlc', unit: 'WETH', rows: d })}</div>`; })() },
    { name: 'Line — gradient and trend footer', note: 'Description, area line, trend in words; hover gives the value at the point.', html: (() => { const pts = walk(90, 100, .04).map(v => +(v * 1.842e6).toFixed(0)); return `<div class="card stack">${head('Deposits', 'Total deposits, last 30 days', periods(2))}${readout()}${hoverBox(area(pts.map(v => v / 1e6)), { kind: 'series', names: ['Deposits'], fmt: 'usd', series: [pts] }, '1000/240')}<p class="sm"><b class=num>Up 12.4% over 30 days</b> <span class=muted>· $184.2M today</span></p></div>`; })() },
    { name: 'Rates — lend, mid, borrow', note: 'Three lines with a legend; hover reads all three at the cursor.', html: (() => { const lend = walk(30, 4.0, .04), borrow = lend.map(v => v + .62 + (rnd() - .5) * .1), mid = lend.map((v, i) => (v + borrow[i]) / 2); return `<div class="card stack">${head('Rates', 'Lend · mid · borrow, 30 days', periods(2))}<div class="row between wrap"><div class=legend><span><i style="--k:var(--c2)"></i>Lend</span><span><i style="--k:var(--fg3)"></i>Mid</span><span><i style="--k:var(--c1)"></i>Borrow</span></div>${readout()}</div>${hoverBox(lineSvg([{ pts: lend, color: 'var(--c2)' }, { pts: mid, color: 'var(--fg3)' }, { pts: borrow, color: 'var(--c1)' }]), { kind: 'series', names: ['Lend', 'Mid', 'Borrow'], fmt: 'pct', series: [lend, mid, borrow] }, '1000/240')}</div>`; })() },
    { name: 'Rate — range band', note: 'Fixed-term rates as a daily min–max band around the mid.', html: (() => { const m = walk(30, 4.6, .04), n = m.length, lo = 3, hi = 6.5, Y = v => (236 - (v - lo) / (hi - lo) * 232).toFixed(0), X = i => (i / (n - 1) * 1000).toFixed(0); const top = m.map((v, i) => `${X(i)} ${Y(v * 1.08)}`), bot = m.map((v, i) => `${X(i)} ${Y(v * .92)}`).reverse(); const svg = `<svg class=chart viewBox="0 0 1000 240" preserveAspectRatio=none aria-hidden=true><path d="M${top.join('L')}L${bot.join('L')}z" fill="var(--n2)"/>${line(m, 1000, 240, 'var(--c1)', lo, hi)}<line class=xh y1=0 y2=240 stroke="var(--fg3)" stroke-dasharray="4 4" visibility=hidden/></svg>`; return `<div class="card stack">${head('Borrow rate', 'Daily range and mid, 30 days', periods(2))}${readout()}${hoverBox(svg, { kind: 'series', names: ['Low', 'Mid', 'High'], fmt: 'pct', series: [m.map(v => v * .92), m, m.map(v => v * 1.08)] }, '1000/240')}</div>`; })() },
    { name: 'Price — CL allocation band', note: 'The position’s range drawn as a band over price, a show-range toggle, and a type switch.', html: (() => { const d = OHLC; const lo = Math.min(...d.map(r => r[2])), hi = Math.max(...d.map(r => r[1])), band = [lo + (hi - lo) * .3, lo + (hi - lo) * .7]; return `<div class="card stack">${head('Price', 'WETH / USDC', periods(1))}<div class="row between wrap"><div class=row>${seg(['1H candles', '1D candles', 'Line'], 0, 'data-type', 'Chart type')}<label class="check sm"><input type=checkbox class=switch checked data-band> show range</label></div>${readout()}</div>${hoverBox(candleSvg(d, 240, 56, band), { kind: 'ohlc', unit: 'WETH', rows: d })}<div class="row between xs muted"><span>range <b class=num>${fmt(band[0], 0)} – ${fmt(band[1], 0)}</b></span><span>in range <b class=num>78%</b> of the last 7 d</span><span>spot <b class=num>${fmt(d[d.length - 1][3])}</b></span></div></div>`; })() },
  ] };

const BLOCKS = [
  MARKETS_BLOCK,
  { id: 'ticket', name: 'Ticket', products: 'swap · lend / borrow · liquidity — every product',
    why: 'Money moves through it. Swap, lend/borrow and add/remove liquidity are one form with different field sets.',
    constraint: 'Slippage, fees and the route are visible before confirm, not behind a disclosure. One [data-p] per ticket.',
    agent: { pick: 1, reason: 'Two fields with balances and an inline route line is the shape all four products can fill; the big-field variant is its mobile form.' },
    variants: [
      { name: 'Amount first', note: 'One big field, token pill, USD under; the lightest manage surface.', html: `<div class="card stack narrower"><p class=eyebrow>Deposit</p><div class=row><input class="field big" inputmode=decimal placeholder="0.00" aria-label="Amount"><button class="btn sm ghost">USDC ▾</button></div><p class=d>≈ $0.00 · balance <span class=num>12,480.22</span> <a href="#">max</a></p><button class="btn lg" data-p>Deposit</button></div>` },
      { name: 'From / to — swap', note: 'Two fields with balances and max, flip control, route and fee as plain lines, slippage in the header.', html: `<div class="card stack narrower"><div class="row between"><p class=eyebrow>Swap</p><button class="btn sm ghost">0.5% ▾</button></div><label class=lbl>You pay<div class=row><input class="field big" inputmode=decimal value="1.25"><button class="btn sm ghost">WETH ▾</button></div><span class="xs muted">balance 3.1402 · <a href="#">max</a></span></label><div class=row style="justify-content:center"><button class="btn sm ghost" aria-label="Flip">⇅</button></div><label class=lbl>You receive<div class=row><input class="field big" inputmode=decimal value="3,038.92" readonly><button class="btn sm ghost">USDC ▾</button></div><span class="xs muted">≈ $3,038.92</span></label>${kv([['Rate', '1 WETH = 2,431.14 USDC'], ['Route', 'Tigris → UniV3 0.05%'], ['Min. received', '3,023.73 USDC'], ['Network fee', '$1.52']])}<button class="btn lg" data-p>Swap</button></div>` },
      { name: 'Lend / borrow — with LTV', note: 'Tabs, collateral and borrow fields, a native range slider with the liquidation point marked.', html: `<div class="card stack narrower"><div class=tabs role=tablist><button role=tab aria-selected=false>Lend</button><button role=tab aria-selected=true>Borrow</button></div><label class=lbl>Collateral<div class=row><input class="field big" inputmode=decimal value="0.50"><button class="btn sm ghost">cbBTC ▾</button></div></label><label class=lbl>Borrow<div class=row><input class="field big" inputmode=decimal value="28,000"><button class="btn sm ghost">USDC ▾</button></div><span class="xs muted">max 39,475 USDC</span></label><label class=lbl>LTV <span class="num">61%</span><input type=range min=0 max=86 value=61></label><div class="row between xs muted"><span>0%</span><span>liquidation 86%</span></div>${kv([['Borrow rate', '<b class=num>4.61%</b> fixed · 30 Oct'], ['Liquidation price', '<span class=num>$52,410</span>'], ['Health', '<span class="pill sm" data-v=ok>1.41</span>']])}<button class="btn lg" data-p>Borrow</button></div>` },
      { name: 'Liquidity — add and remove', note: 'Two token fields, range summary, fee tier segmented control.', html: `<div class="card stack narrower"><div class=tabs role=tablist><button role=tab aria-selected=true>Add</button><button role=tab aria-selected=false>Remove</button></div>${seg(['0.01%', '0.05%', '0.30%', '1%'], 1, 'data-fee', 'Fee tier')}<label class=lbl>WETH<input class="field big" inputmode=decimal value="1.00"></label><label class=lbl>USDC<input class="field big" inputmode=decimal value="2,431.14"></label>${kv([['Range', '2,250 – 2,650 USDC'], ['Current', '2,431.14 · in range'], ['Share of pool', '0.012%']])}<button class="btn lg" data-p>Add liquidity</button></div>` },
      { name: 'Review step', note: 'The confirm state: summary rows, a warning panel, one primary action — the same card after the first click.', html: `<div class="card stack narrower"><p class=eyebrow>Review swap</p><div class="row between"><b class=num>1.25 WETH</b><span class=muted>→</span><b class=num>3,038.92 USDC</b></div>${kv([['Rate', '1 WETH = 2,431.14 USDC'], ['Price impact', '<span class=delta data-d=down>−0.12%</span>'], ['Route', 'Tigris → UniV3'], ['Network fee', '$1.52'], ['Min. received', '3,023.73 USDC']])}<div class="panel sm" data-v=wa>Quote refreshes in 12 s. Min. received is enforced on-chain.</div><div class=row><button class="btn grow ghost">Back</button><button class="btn grow" data-p>Confirm</button></div></div>` },
    ] },

  POSITION_BLOCK,
  { id: 'metrics', name: 'Metrics strip', products: 'every view in every product',
    why: 'The first thing read on a market or a portfolio: three to five numbers that say whether to keep reading.',
    constraint: 'tabular-nums; deltas signed and coloured by intent; a delta always names its window.',
    agent: { pick: 0, reason: 'Four panels survive density changes and stack to 2×2 on a phone; the hero variant is for the one page where a single number is the point.' },
    variants: [
      { name: 'Four panels', note: 'Equal panels, delta under each number.', html: `<div class="grid grid-4">${metric('TVL', '$184.2M', '+2.1% 24h')}${metric('Volume 24h', '$62.1M', '−4.8% 24h')}${metric('Fees 24h', '$31.0k', '+1.2% 24h')}${metric('Fee APR · 7d', '12.4%', '+0.3 pp 7d')}</div>` },
      { name: 'Inline chips', note: 'One row of label–value pairs; the compact form for a sticky header or a card top.', html: `<div class="row wrap loose">${[['TVL', '$184.2M'], ['Volume 24h', '$62.1M'], ['Fees 24h', '$31.0k'], ['Fee APR · 7d', '12.4%'], ['Markets', '1,284']].map(([k, v]) => `<span class="row tight"><span class="xs muted">${k}</span><b class=num>${v}</b></span>`).join('')}</div>` },
      { name: 'Hero number', note: 'One big number with its delta, three small ones beside it.', html: `<div class="card row wrap loosest end"><div><span class=eyebrow>Total value locked</span><div class="row baseline"><b class=num style="font-size:2.25rem;letter-spacing:-.02em">$1.24B</b><span class=delta data-d=up>+2.1% 24h</span></div></div><div class="row wrap looser">${[['Volume 24h', '$312.4M'], ['Fees 24h', '$0.94M'], ['Markets', '1,284']].map(([k, v]) => `<div><span class="xs muted">${k}</span><div class=num><b>${v}</b></div></div>`).join('')}</div></div>` },
      { name: 'Panels — with sparklines', note: 'Each metric carries its own 7-day line; denser, more to read.', html: `<div class="grid grid-4">${[['TVL', '$184.2M'], ['Volume 24h', '$62.1M'], ['Fees 24h', '$31.0k'], ['Fee APR · 7d', '12.4%']].map(([k, v]) => `<div class="panel stack tighter"><span class=eyebrow>${k}</span><div class="row between"><b class="num lg">${v}</b>${spark(walk(28), 64, 24)}</div></div>`).join('')}</div>` },
    ] },

  { id: 'header', name: 'Market header', products: 'PegCore · Pairs Pro · Mezo · Super Liquid',
    why: 'Identity of the thing on screen: tokens, network, the kind (fee tier · LLTV · maturity), its status.',
    constraint: 'Network is a glyph with its name, never a theme. Maturity shows the date and the countdown. Status uses the intent colours.',
    agent: { pick: 2, reason: 'Inline key stats on the right mean the page starts with price and change without a second block above the chart.' },
    variants: [
      { name: 'Identity — icons, name, pills', note: 'The minimum: pair, chain, kind, status.', html: `<div class="row between wrap"><div class=row>${tk('WETH', 'USDC', true)}<div><h2 aria-level=4>WETH / USDC</h2><div class="row tight">${netLbl('Base')}<span class="pill sm">0.05%</span><span class="pill sm">Uniswap v3</span></div></div></div><span class="pill" data-v=ok>Active</span></div>` },
      { name: 'Breadcrumbs — with countdown', note: 'Markets / Base / pair; the fixed-term form with maturity and days left.', html: `<div class=stack><nav class=crumbs aria-label="Breadcrumb"><a href="#">Markets</a><span>/</span><a href="#">Base</a><span>/</span><span aria-current=page>cbBTC / USDC</span></nav><div class="row between wrap"><div class=row>${tk('cbBTC', 'USDC', true)}<div><h2 aria-level=4>cbBTC / USDC</h2><div class="row wrap tight">${netLbl('Base')}<span class="xs muted">Collateral cbBTC · Loan USDC · LLTV 86%</span><span class="pill sm">Morpho Midnight</span></div></div></div><div class="stk"><span class="pill sm">Matures <b class=num>30 Oct 2026</b></span><span class="xs muted">in 13 d</span></div></div></div>` },
      { name: 'Inline key stats', note: 'Price and 24h change sit in the header, right-aligned; the chart below needs no title.', html: `<div class="row between wrap"><div class=row>${tk('WETH', 'USDC', true)}<div><h2 aria-level=4>WETH / USDC</h2><div class="row tight">${netLbl('Base')}<span class="pill sm">0.05%</span></div></div></div><div class="row wrap looser"><div><span class="xs muted">Price</span><div class="row baseline"><b class="num lg">$2,431.14</b><span class="delta sm" data-d=up>+1.8% 24h</span></div></div><div><span class="xs muted">TVL</span><div class=num><b>$184.2M</b></div></div><div><span class="xs muted">Volume 24h</span><div class=num><b>$62.1M</b></div></div></div></div>` },
      { name: 'Compact — sticky', note: 'One line for a sticky bar once the page scrolls.', html: `<div class="panel row between"><div class=row>${tk('WETH', 'USDC')}<b>WETH / USDC</b>${netLbl('Base')}<span class="pill sm">0.05%</span></div><div class=row><b class=num>$2,431.14</b><span class="delta sm" data-d=up>+1.8% 24h</span><button class="btn sm" data-p>Trade</button></div></div>` },
    ] },

  CHART_BLOCK,
  { id: 'depth', name: 'Depth', products: 'PegCore virtual depth · Mezo ticks · Super Liquid order book',
    why: 'One payload — [[price or rate, size], …] — with three renderings. The tab switches the rendering, not the data.',
    constraint: 'The mid is always marked. The current price or rate is always visible against the range.',
    agent: { pick: 2, reason: 'Order-book rows read on a phone and carry exact numbers; the curve and the histogram are the desktop forms of the same data.' },
    variants: [
      { name: 'Depth curve', note: 'Cumulative bids and asks as step areas, mid line dashed.', html: `<div class="card stack"><div class="row between"><p class=eyebrow>Depth</p><span class="xs muted num">mid 2,431.14</span></div><div style="aspect-ratio:1000/180">${depthCurve()}</div><div class="row between xs muted"><span>2,250</span><span>2,431</span><span>2,650</span></div></div>` },
      { name: 'Ticks — with range', note: 'Liquidity per tick; in-range bars in --ok, the current tick in --no; the CL manager view.', html: `<div class="card stack"><div class="row between"><p class=eyebrow>Liquidity by tick</p><span class="xs muted">range 2,250 – 2,650 · current 2,431</span></div><div style="aspect-ratio:1000/160">${ticks()}</div><div class=legend><span><i class=rect style="--k:var(--ok-f)"></i>in range</span><span><i class=rect style="--k:var(--no-f)"></i>current</span><span><i class=rect style="--k:var(--c1)"></i>other</span></div></div>` },
      { name: 'Order book rows', note: 'APR · size · cumulative with the bar as the row background; lend above, borrow below, mid between.', html: `<div class="card stack narrow"><div class="row between xs muted"><span>Offers to lend — <b>borrow at</b></span><span>rate · size · cumulative</span></div><div class=book>${[[5.2, 10, 584.4], [5.0, 84.5, 499.8], [4.9, 84.6, 415.2], [4.8, 11.7, 403.4], [4.7, 21.4, 381.9]].map(([r, s, c]) => `<div class=row style="--w:${(c / 600 * 100).toFixed(0)}%" data-side=lend><span class=num>${fmt(r)}%</span><span class=num>$${fmt(s, 1)}k</span><span class="num muted">$${fmt(c, 1)}k</span></div>`).join('')}</div><div class="row between" style="padding:.3rem 0;border-block:1px solid var(--n3)"><b class=num>Mid 4.61%</b><span class="xs muted num">spread 0.10 pp</span></div><div class=book>${[[4.6, 0.5, 381.4], [3.5, 57.6, 323.7], [2.2, 48.2, 275.5], [2.1, 65.6, 209.8], [1.9, 56.1, 153.7]].map(([r, s, c]) => `<div class=row style="--w:${(c / 600 * 100).toFixed(0)}%" data-side=borrow><span class=num>${fmt(r)}%</span><span class=num>$${fmt(s, 1)}k</span><span class="num muted">$${fmt(c, 1)}k</span></div>`).join('')}</div><div class="row between xs muted"><span>Offers to borrow — <b>lend at</b></span><span>rate · size · cumulative</span></div></div>` },
    ] },

  { id: 'span', name: 'Span selector', products: 'price range (Mezo) · term (Super Liquid) · period (all)',
    why: 'Choosing a span — of price, of time, of history — is one interaction in three forms.',
    constraint: 'A price range always shows the spot. A term always shows the date and the rate it buys. Native inputs under any custom drag.',
    agent: { pick: 1, reason: 'The maturity list with the rate per date is the one of the three that changes what a product can do; range and period are already in the gallery as parts.' },
    variants: [
      { name: 'Price range — fields and presets', note: 'Min / max fields, preset chips, native sliders beneath, the spot marked.', html: `<div class="card stack narrow"><div class="row between"><p class=eyebrow>Price range</p><span class="xs muted">spot 2,431.14</span></div><div class="row wrap tight">${['±5%', '±10%', '±25%', 'Full'].map((p, i) => `<button class="btn sm" aria-pressed=${i === 1}>${p}</button>`).join('')}</div>${rangeBar(30, 70, 52)}<div class="grid grid-2"><label class=lbl>Min<input class=field inputmode=decimal value="2,250" aria-label="Min price"><input type=range min=1800 max=3200 value=2250 aria-label="Min price slider"></label><label class=lbl>Max<input class=field inputmode=decimal value="2,650" aria-label="Max price"><input type=range min=1800 max=3200 value=2650 aria-label="Max price slider"></label></div><p class="xs muted">Fee capture est. 0.64% / 30d at current volume</p></div>` },
      { name: 'Term — maturity list', note: 'One row per maturity with the rate it buys and liquidity available; pick a row.', html: `<div class="card stack narrow"><div class="row between"><p class=eyebrow>Maturity · borrow</p><span class="xs muted">rate · available</span></div><div class="list">${[['30 Oct', '13 d', '4.61%', '$381.4k', true], ['27 Nov', '41 d', '4.84%', '$212k', false], ['25 Dec', '69 d', '5.02%', '$98k', false], ['Variable', 'open', '3.99%', '$2.1M', false]].map(([d, left, r, liq, on]) => `<button class="pickrow row between" aria-pressed=${on}><span><b class=num>${d}</b> <span class="xs muted">${left}</span></span><span class="row loose"><span class=num><b>${r}</b> <span class="xs muted">${d === 'Variable' ? 'variable' : 'fixed'}</span></span><span class="xs muted num">${liq}</span></span></button>`).join('')}</div><label class="check sm"><input type=checkbox class=switch checked> Auto-renew at maturity</label></div>` },
      { name: 'Period — segmented and custom', note: 'The chart control, with a custom range disclosure; resolution shown so the trade-off is visible.', html: `<div class="row wrap between" style="max-width:30rem">${seg(['1D', '7D', '30D', '90D', 'All'], 2)}<span class="xs muted">30D · 1H candles · 720 points</span><button class="btn sm ghost">Custom ▾</button></div>` },
    ] },

  { id: 'timeline', wide: true, name: 'Timeline / activity', products: 'PegCore epochs · settlement · withdrawals · every history view',
    why: 'Progress and history are the same events: shown as steps while they happen, as rows once they have.',
    constraint: 'Every step has a time or a countdown. Failed steps use --no, never a different shape.',
    agent: { pick: 2, reason: 'The activity table is what every product has to show anyway; the steppers are its live-state views and the gallery already has the vertical one.' },
    variants: [
      { name: 'Vertical stepper', note: 'Done · now · next with times; the reference P0 timeline.', html: `<div class="card stack narrower"><p class=eyebrow>Withdrawal</p><ol class=tl><li data-s=done><span class=n>✓</span><div><p class=t>Initiated on Base</p><p class=d>14 Oct · 09:12</p></div></li><li data-s=done><span class=n>✓</span><div><p class=t>Proved on Ethereum</p><p class=d>14 Oct · 11:48</p></div></li><li data-s=now><span class=n>3</span><div><p class=t>Challenge window</p><p class=d>6 d 4 h left</p></div></li><li><span class=n>4</span><div><p class=t>Finalize</p><p class=d>claimable 21 Oct</p></div></li></ol></div>` },
      { name: 'Horizontal stepper', note: 'The same four steps in one row; for a card top or a sticky bar.', html: `<div class="card"><ol class="row between hs"><li data-s=done><span class=n>✓</span><span class=t>Initiated</span></li><li data-s=done><span class=n>✓</span><span class=t>Proved</span></li><li data-s=now><span class=n>3</span><span class=t>Challenge · 6 d</span></li><li><span class=n>4</span><span class=t>Finalize</span></li></ol></div>` },
      { name: 'Activity table', note: 'Events as rows: time, action, amount, status, transaction.', html: `<div class=scroll tabindex=0><table class=table>${thead(['Time', 'Action', 'Market', 'Amount', 'Status', 'Tx'])}<tbody>${[['Today 09:12', 'Borrow', 'cbBTC / USDC', '28,000 USDC', ['ok', 'Confirmed'], '0x7b7c…9e21'], ['Today 08:40', 'Add liquidity', 'WETH / USDC', '1.00 WETH + 2,431 USDC', ['ok', 'Confirmed'], '0x11a0…4c3f'], ['Yesterday', 'Settle epoch 42', 'mUSD / BTC', '—', ['wa', 'Pending'], '0x9fd2…0a77'], ['12 Oct', 'Swap', 'WETH → USDC', '1.25 WETH', ['no', 'Reverted'], '0x03be…7710']].map(([t, a, m, amt, [v, s], tx]) => `<tr><td class="muted">${t}</td><td><b>${a}</b></td><td>${m}</td><td class=num>${amt}</td><td><span class="pill sm" data-v=${v}>${s}</span></td><td class="mono xs"><a href="#">${tx}</a></td></tr>`).join('')}</tbody></table></div>` },
      { name: 'Status — pill and progress', note: 'A single line: where it is and how far along; for lists and notifications.', html: `<div class="stack" style="max-width:26rem">${[['Withdrawal · 1.25 WETH', 'wa', 'Challenge window', 62, '6 d 4 h left'], ['Epoch 42 settlement', 'ac', 'Folding', 25, '~2 h left'], ['Fixed loan · 50,000 USDC', 'ok', 'Accruing', 88, '13 d left']].map(([t, v, s, p, when]) => `<div class="panel stack tight"><div class="row between"><b>${t}</b><span class="row tight"><span class="xs muted num">${when}</span><span class="pill sm" data-v=${v}>${s}</span></span></div>${meter(p, v === 'ac' ? 'ok' : v, t, s + ', ' + when)}</div>`).join('')}</div>` },
    ] },

  { id: 'wallet', name: 'Wallet & network', products: 'every product',
    why: 'Connect, account, chain, balance. Static button in P0; the state arrives with the wallet island.',
    constraint: 'Connect is secondary, never [data-p]. Wrong-network is a state of this block, not an alert elsewhere.',
    agent: { pick: 1, reason: 'A pill with the address and the chain, that opens the panel, is the shape the other two collapse into.' },
    variants: [
      { name: 'Button — then address pill', note: 'Disconnected: a secondary button. Connected: an address pill. Wrong chain: a --wa pill.', html: `<div class="row wrap loose"><button class=btn>Connect wallet</button><button class="pill" style="cursor:pointer">0x7b7c…9e21 <span class="xs muted">· Base</span></button><button class="pill" data-v=wa style="cursor:pointer">Switch to Base</button></div>` },
      { name: 'Pill — avatar and network switch', note: 'Avatar, address, network; the network is a control.', html: `<div class="row wrap loose"><span class="pill acct"><span class=tk><i>7</i></span><b class="mono sm">0x7b7c…9e21</b><button class="pill sm">${netIcon('Base')} Base ▾</button></span><span class="pill acct" data-v=wa><span class=tk><i>7</i></span><b class="mono sm">0x7b7c…9e21</b><button class="pill sm" data-v=wa>Wrong network ▾</button></span></div>` },
      { name: 'Account panel', note: 'What the pill opens: balances, networks, copy, disconnect.', html: `<div class="card stack narrower"><div class="row between"><div class=row><span class="tk lg"><i>7</i></span><div><b class="mono">0x7b7c…9e21</b><div class="xs muted">MetaMask · Base</div></div></div><button class="btn sm ghost" aria-label="Copy">⧉</button></div>${kv([['ETH', '3.1402'], ['USDC', '12,480.22'], ['cbBTC', '0.5000']])}<div><span class=eyebrow>Network</span><div class="row wrap tight">${['Base', 'Ethereum', 'Mezo'].map((c, i) => `<button class="btn sm" aria-pressed=${i === 0}>${c}</button>`).join('')}</div></div><button class="btn ghost">Disconnect</button></div>` },
    ] },
];

// ---------- page ----------
// drop gallery rules whose class selectors never appear in the rendered page (measured: 70 rules, 5.3 KB raw)

const blockHtml = (b, n) => `<section class=block id="${b.id}">
<div class=sec-h><span class=eyebrow>Block ${n + 1} · ${esc(b.products)}</span><h2>${esc(b.name)}</h2><p>${esc(b.why)}</p><p class="sm"><b>Constraint:</b> ${esc(b.constraint)}</p></div>
<div class="variants${b.wide ? ' wide' : ''}">${b.variants.map((v, i) => `<article class="variant${v.span ? ' span' : ''}" data-block="${b.id}" data-variant="${i}" aria-label="${String.fromCharCode(65 + i)} · ${esc(v.name)}">
<header class="row between wrap"><label class="check sm"><input type=radio name="pick-${b.id}" value="${i}"> <b>${String.fromCharCode(65 + i)} · ${esc(v.name)}</b></label>${b.agent.pick === i ? `<span class="pill sm" data-v=ac title="${esc(b.agent.reason)}">agent pick</span>` : ''}</header>
<div class=stage>${v.html}</div>
<p class="xs muted">${esc(v.note)}</p>
</article>`).join('')}</div>
<details class=agent><summary class="sm">Why the agent picked ${String.fromCharCode(65 + b.agent.pick)}</summary><p class="sm muted">${esc(b.agent.reason)}</p></details>
<label class=lbl>What to change <textarea class=field data-note="${b.id}" placeholder="What works, what doesn't, what a better variant would do…"></textarea></label>
</section>`;

const BODY = BLOCKS.map(blockHtml).join('\n');
const html = `<!doctype html><html lang=en data-t=base><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>μi — blocks</title>
<style>
@layer reset,theme,base,comp,chart,blocks;
${['reset', 'theme', 'base'].map(layer).join('\n')}
${['comp', 'chart'].map(nm => prune(layer(nm), BODY)).join('\n')}
@layer blocks{
/* the page, plus the few composite classes the blocks need that the gallery does not define */
.page{max-width:76rem;margin-inline:auto;padding:calc(1.5rem*var(--sp)) 1.25rem 8rem;display:flex;flex-direction:column;gap:calc(2.5rem*var(--sp))}
.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--n1) 88%,transparent);backdrop-filter:blur(8px);border-block-end:1px solid var(--n3)}
.top .in{max-width:76rem;margin-inline:auto;padding:.6rem 1.25rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.brand{font-weight:700;letter-spacing:-.02em}.brand span{color:var(--fg3);font-weight:500}
.top nav{display:flex;gap:.125rem;flex-wrap:wrap}.top nav a{padding:.375rem .625rem;border-radius:var(--r1);font-size:.8125rem;font-weight:500;color:var(--fg2);text-decoration:none}.top nav a:hover{background:var(--n2);color:var(--fg)}
.sec-h{display:flex;flex-direction:column;gap:.25rem;max-width:70ch}.sec-h p{color:var(--fg2);text-wrap:pretty}
.block{scroll-margin-top:5rem;display:flex;flex-direction:column;gap:calc(1rem*var(--sp))}
.variants{display:grid;gap:calc(1rem*var(--sp));grid-template-columns:1fr}@media(min-width:60rem){.variants:not(.wide){grid-template-columns:1fr 1fr}}
.variant{border:1px solid var(--n3);border-radius:var(--r3);background:var(--n0);display:flex;flex-direction:column;gap:.75rem;padding:.75rem;min-width:0}
.variant:has(> header input[type=radio]:checked){border-color:var(--ac);box-shadow:0 0 0 3px var(--ac-r)}
.variant header{gap:.5rem}
.variant.span{grid-column:1/-1}
.stage{background:var(--n1);border-radius:var(--r2);padding:1rem;overflow:auto;min-width:0}
.stage>*{min-width:0}
.agent summary{cursor:pointer;color:var(--fg3)}
textarea.field{min-height:3.5rem;field-sizing:content;resize:vertical}
.toc{display:flex;flex-wrap:wrap;gap:.25rem}.toc a{padding:.3rem .6rem;border-radius:var(--rf);background:var(--n2);font-size:.8125rem;color:var(--fg2);text-decoration:none}.toc a:hover{background:var(--n3);color:var(--fg)}.toc a[data-done]{background:var(--ok-s);color:var(--ok-f)}
.bar{position:fixed;inset-inline:0;bottom:0;z-index:6;background:color-mix(in srgb,var(--n0) 92%,transparent);backdrop-filter:blur(8px);border-block-start:1px solid var(--n3)}
.bar .in{max-width:76rem;margin-inline:auto;padding:.6rem 1.25rem;display:flex;gap:.75rem;align-items:center;flex-wrap:wrap}
/* composites used by the variants */
${COMPOSITES}
.outpanel{position:fixed;inset-inline:0;bottom:3.5rem;z-index:6;max-width:76rem;margin-inline:auto;padding:.75rem 1.25rem;background:var(--n0);border:1px solid var(--n3);border-radius:var(--r3) var(--r3) 0 0;box-shadow:var(--sh);display:flex;flex-direction:column;gap:.5rem}
.outpanel textarea{width:100%;min-height:11rem;font-family:var(--fm);font-size:.75rem;line-height:1.4}
}
</style>

<header class=top><div class=in>
<div class=brand>μi <span>blocks</span></div>
<nav aria-label="Site"><a href="../">Design language</a><a href="../paper/">The paper</a><a href="../pairs-pro/">Pairs Pro</a><a href="../app/">μApp demo ↗</a></nav>
<div class=seg role=group aria-label=Density style="margin-inline-start:auto"><button data-den=base aria-pressed=true>Base</button><button data-den=sharp>Sharp</button></div>
<div class=seg role=group aria-label=Luminance><button data-lum=light aria-pressed=true>Light</button><button data-lum=dark>Dark</button></div>
</div></header>

<main class=page>
<section class=sec-h style="max-width:72ch">
<span class=eyebrow>Review round 2 · ${BLOCKS.length} blocks · ${BLOCKS.reduce((s, b) => s + b.variants.length, 0)} variants</span>
<h1>The ten view blocks</h1>
<p>The reusable views that index pools and lending markets, show one market, and manage a position — chosen over twenty review rounds against PegCore, Pairs Pro, Mezo Swap and Super Liquid. Each block has three to five variants, rendered live in your theme. The agent has marked a pick with its reason. Mark yours, say what to change, then <b>Copy review</b> and paste it back: the next round replaces the losing variants with ones built from your notes.</p>
<p class="sm muted">Markets table, Position card and Chart card follow the first human review; four agent review rounds (design language · information architecture · accessibility · budget and copy) have been applied since. Charts read out on hover or keyboard; the review text appears in a panel as well as on the clipboard.</p>
<nav class=toc aria-label="Blocks">${BLOCKS.map((b, i) => `<a href="#${b.id}" data-toc="${b.id}">${i + 1} · ${esc(b.name)}</a>`).join('')}</nav>
</section>
${BODY}
</main>

<div class=outpanel id=outpanel hidden><div class="row between"><b class=sm id=outtitle>Your review — paste this back</b><span class="xs muted" id=outstatus aria-live=polite></span></div><textarea id=outtext readonly aria-labelledby=outtitle></textarea><div class=row><button class="btn sm" data-p id=copy2>Copy to clipboard</button><button class="btn sm ghost" id=outclose>Close</button></div></div>
<div class=bar><div class=in>
<b id=progress>0 / ${BLOCKS.length} decided</b>
<span class="xs muted">choices stay in this browser</span>
<span class=grow></span>
<button class="btn sm ghost" id=reset>Reset</button>
<button class="btn sm" data-p id=copy>Copy review</button>
</div></div>

<script type=module>
const r=document.documentElement, KEY='mui.blocks.r2';
const S=()=>{try{return JSON.parse(localStorage.mui||'{}')}catch{return{}}};
const apply=s=>{const d=s.den||'base',l=s.lum||'light';r.dataset.t=d==='sharp'?(l==='dark'?'sharp-dark':'sharp'):(l==='dark'?'dark':'base');
  for(const b of document.querySelectorAll('[data-den]'))b.setAttribute('aria-pressed',b.dataset.den===d);
  for(const b of document.querySelectorAll('[data-lum]'))b.setAttribute('aria-pressed',b.dataset.lum===l)};
let s=S();apply(s);
addEventListener('click',e=>{const b=e.target.closest('[data-den],[data-lum]');if(!b)return;
  s={...S(),...(b.dataset.den?{den:b.dataset.den}:{lum:b.dataset.lum})};try{localStorage.mui=JSON.stringify(s)}catch{}apply(s)});

// review state
const blocks=${JSON.stringify(BLOCKS.map(b => ({ id: b.id, name: b.name, agent: b.agent.pick, variants: b.variants.map(v => v.name) })))};
const load=()=>{try{return JSON.parse(localStorage[KEY]||'{}')}catch{return{}}};
const save=v=>{try{localStorage[KEY]=JSON.stringify(v)}catch{}};
let review=load();
const paint=()=>{let n=0;for(const b of blocks){const rv=review[b.id]||{};const radio=document.querySelector(\`input[name="pick-\${b.id}"][value="\${rv.pick}"]\`);if(radio)radio.checked=true;
  const ta=document.querySelector(\`[data-note="\${b.id}"]\`);if(ta&&rv.note!=null&&ta.value!==rv.note)ta.value=rv.note;
  const t=document.querySelector(\`[data-toc="\${b.id}"]\`);if(rv.pick!=null){n++;t?.setAttribute('data-done','');t?.setAttribute('aria-label',b.name+' — decided')}else{t?.removeAttribute('data-done');t?.removeAttribute('aria-label')}}
  document.getElementById('progress').textContent=\`\${n} / \${blocks.length} decided\`};
paint();
addEventListener('change',e=>{const i=e.target;if(i.type==='radio'&&i.name.startsWith('pick-')){const id=i.name.slice(5);review[id]={...(review[id]||{}),pick:+i.value};save(review);paint()}});
addEventListener('input',e=>{const ta=e.target.closest('[data-note]');if(!ta)return;const id=ta.dataset.note;review[id]={...(review[id]||{}),note:ta.value};save(review);});
document.getElementById('reset').onclick=()=>{if(!confirm('Clear all choices and notes?'))return;review={};save(review);for(const i of document.querySelectorAll('input[type=radio]'))i.checked=false;for(const t of document.querySelectorAll('[data-note]'))t.value='';paint()};
const build=()=>{const out={round:2,theme:r.dataset.t,when:new Date().toISOString(),blocks:blocks.map(b=>{const rv=review[b.id]||{};return{id:b.id,name:b.name,agentPick:String.fromCharCode(65+b.agent),yourPick:rv.pick!=null?String.fromCharCode(65+rv.pick):null,variant:rv.pick!=null?b.variants[rv.pick]:null,agree:rv.pick!=null?rv.pick===b.agent:null,note:rv.note||''}})};
  return ['# μi blocks — review round 2',\`theme \${out.theme} · \${out.when.slice(0,16)}\`,'',...out.blocks.map(b=>\`- **\${b.name}** — you: \${b.yourPick??'—'}\${b.variant?' ('+b.variant+')':''} · agent: \${b.agentPick}\${b.agree===false?' · disagree':b.agree?' · agree':''}\${b.note?'\\n  '+b.note.replace(/\\n/g,'\\n  '):''}\`),'','\`\`\`json',JSON.stringify(out),'\`\`\`'].join('\\n')};
const panel=document.getElementById('outpanel'),ta=document.getElementById('outtext'),st=document.getElementById('outstatus');
const toClipboard=async()=>{try{await navigator.clipboard.writeText(ta.value);st.textContent='copied to clipboard ✓'}catch{ta.focus();ta.select();st.textContent='clipboard blocked — the text is selected, press ⌘C / Ctrl+C'}};
document.getElementById('copy').onclick=()=>{ta.value=build();panel.hidden=false;ta.focus();ta.select();toClipboard()};
document.getElementById('copy2').onclick=()=>{ta.focus();ta.select();toClipboard()};
document.getElementById('outclose').onclick=()=>{panel.hidden=true;document.getElementById('copy').focus()};
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;document.getElementById('copy').focus()}});
// charts: values on hover, crosshair follows the cursor
for(const box of document.querySelectorAll('[data-hover]')){
  const data=JSON.parse(box.dataset.hover),svg=box.querySelector('svg'),xh=svg.querySelector('.xh'),out=box.closest('.card').querySelector('.readout');
  const n=data.kind==='ohlc'?data.rows.length:data.series[0].length,vb=svg.viewBox.baseVal.width;
  const num=(v,d=2)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const f=v=>data.fmt==='pct'?num(v)+'%':data.fmt==='usd'?'$'+num(v/1e6,1)+'M':num(v);
  let cur=n-1;
  const show=i=>{cur=i;const x=(i+.5)/n*vb;xh.setAttribute('x1',x);xh.setAttribute('x2',x);xh.setAttribute('visibility','visible');
    out.textContent=data.kind==='ohlc'?(([o,h,l,c,v])=>\`O \${num(o)} · H \${num(h)} · L \${num(l)} · C \${num(c)} · V \${num(v,1)} \${data.unit||''}\`)(data.rows[i]):data.names.map((nm,k)=>\`\${nm} \${f(data.series[k][i])}\`).join(' · ');out.classList.remove('muted')};
  const hide=()=>{xh.setAttribute('visibility','hidden');out.textContent='hover or focus and use ← → for values';out.classList.add('muted')};
  box.addEventListener('pointermove',e=>{const rc=box.getBoundingClientRect();show(Math.max(0,Math.min(n-1,Math.floor((e.clientX-rc.left)/rc.width*n))))});
  box.addEventListener('pointerleave',hide);
  box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(Math.max(0,Math.min(n-1,cur+(e.key==='ArrowRight'?1:-1))))}else if(e.key==='Home'){show(0)}else if(e.key==='End'){show(n-1)}});
  box.addEventListener('focus',()=>show(cur));box.addEventListener('blur',hide);
}
// show-range toggle and segmented controls inside variants behave
addEventListener('change',e=>{const t=e.target;if(t.matches('[data-band]')){const b=t.closest('.card').querySelector('.band');if(b)b.setAttribute('visibility',t.checked?'visible':'hidden')}});
addEventListener('click',e=>{const b=e.target.closest('.variant .seg button,.variant [role=tab],.variant .pickrow,.variant .btn[aria-pressed]');if(!b)return;
  if(b.matches('.pickrow,.btn[aria-pressed]')&&!b.closest('.seg')){const grp=b.parentElement.querySelectorAll(b.matches('.pickrow')?'.pickrow':'.btn[aria-pressed]');for(const x of grp)x.setAttribute('aria-pressed',x===b);return}
  for(const x of b.parentElement.children)x.setAttribute(x.hasAttribute('aria-selected')?'aria-selected':'aria-pressed',x===b)});
addEventListener('keydown',e=>{const t=e.target.closest('[role=tab],.seg button');if(!t||!/^Arrow(Left|Right)$/.test(e.key))return;const sib=e.key==='ArrowRight'?t.nextElementSibling:t.previousElementSibling;if(sib){e.preventDefault();sib.focus();sib.click()}});
</script>
`;

await Bun.write('blocks.html', html);
const { brotliCompressSync, constants: Z } = await import('node:zlib');
const br = b => brotliCompressSync(Buffer.from(b), { params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_LGWIN]: 24 } }).length;
console.log(`  blocks.html   raw ${html.length}  brotli ${br(html)}   ${BLOCKS.length} blocks, ${BLOCKS.reduce((s, b) => s + b.variants.length, 0)} variants`);
