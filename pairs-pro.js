// pairs-pro.js — the Pairs.pro refresh wireframe: twenty-four frames in Sharp outline, grouped by role, laid out as a
// sheet (phone frames side by side, wide frames below) the way the PEG.markets wireframe PDF is. Renders pairs-pro.html
// (published as /design/pairs-pro/) and, with --pdf, prints it through headless Chrome to the pairs-pro docs folder.
// Every frame has an id (W-01 … W-24) that the STE user-story spec cites. Data is seeded; controls hold a static state.
// A review round is an edit to FRAMES below, then `bun ./pairs-pro.js`.
import { rnd, walk, fmt, short, usd, tok, spark, tk, netIcon, seg, thead, metric, kv, rangeBar, two, candleData, candleSvg, lineSvg, head, readout, hoverBox, prune, layer, esc, COMPOSITES } from './lib/ui.js';

// ---------- data ----------
const POOL = { dex: 'UniV3', a: 'WETH', b: 'USDC', fee: '5bp', ts: 10, net: 'Base', price: 2431.5, addr: '0x7b7c…9e21', strat: '0x9fd2…0a77', block: '31,204,118', route: '/base/0x7b7c…9e21' };
const ME = '0x5610…283e';
// strategy bands per candle: EMA(10) as the reference, a base band ±6 % recomputed every `every` candles, a one-sided
// limit band on the side of the excess token; rows before `deployFrom` and inside `gap` are projected (backfill).
const bandData = (rows, { deployFrom = 0, every = 6, gap = null, bw = .01, lw = .015 } = {}) => {
  let ema = rows[0][3], base = null, limit = null; const out = [];
  rows.forEach((r, i) => {
    ema += (r[3] - ema) * 2 / 11;
    const recompute = i % every === 0;
    if (recompute) { base = [+(ema * (1 - bw)).toFixed(2), +(ema * (1 + bw)).toFixed(2)]; limit = r[3] > ema ? [+ema.toFixed(2), +(ema * (1 + lw)).toFixed(2)] : [+(ema * (1 - lw)).toFixed(2), +ema.toFixed(2)]; }
    const src = i < deployFrom || (gap && i >= gap[0] && i < gap[1]) ? 'backfill' : 'keeper';
    out.push({ base, limit, ref: +ema.toFixed(2), src, update: src === 'keeper' && recompute });
  });
  return out;
};
const OHLC36 = candleData(36), BANDS7 = bandData(OHLC36, { every: 6 });
const OHLC64 = candleData(64, .03), BANDS_ALL = bandData(OHLC64, { deployFrom: 26, every: 8, gap: [40, 46], bw: .05, lw: .075 });
// depth: active liquidity per tick around the current tick; [tick, price, active, net, where]
const CUR = 201540, BASE = [200940, 202140], LIMIT = [201600, 201980];
const tickData = (n = 41, spacing = 60) => { const rows = []; for (let i = 0; i < n; i++) { const t = CUR + (i - (n - 1) / 2) * spacing, active = +(Math.exp(-(((i - 20) / 9) ** 2)) * 100 + rnd() * 15).toFixed(2), net = +((rnd() - .5) * 8).toFixed(2);
  rows.push([t, +(POOL.price * 1.0001 ** (t - CUR)).toFixed(2), active, net, t >= LIMIT[0] && t < LIMIT[1] ? 'limit' : t >= BASE[0] && t < BASE[1] ? 'base' : 'none']); } return rows; };
const TICKS = tickData(), TICK_TOTAL = +TICKS.reduce((a, r) => a + r[2], 0).toFixed(2);
const tickSvg = (rows, h = 160) => { const bw = 1000 / rows.length, vm = Math.max(...rows.map(r => r[2])); let s = ''; rows.forEach((r, i) => { const v = r[2] / vm * (h - 8), f = r[4] === 'limit' ? 'var(--c3)' : r[4] === 'base' ? 'var(--ok-f)' : 'var(--c1)'; s += `<rect x=${(i * bw + 1).toFixed(0)} y=${(h - v).toFixed(0)} width=${(bw - 2).toFixed(0)} height=${v.toFixed(0)} fill="${f}"/>`; });
  const cx = ((rows.findIndex(r => r[0] === CUR) + .5) * bw).toFixed(0);
  return `<svg class=chart viewBox="0 0 1000 ${h}" preserveAspectRatio=none aria-hidden=true>${s}<line class=cur x1=${cx} x2=${cx} y1=0 y2=${h} stroke="var(--fg)" stroke-width=2/><line class=xh y1=0 y2=${h} stroke="var(--fg3)" stroke-dasharray="4 4" visibility=hidden/></svg>`; };
const SHARES = (() => { const w = walk(30, 1, .02); return w.map(v => +(v / w[0] * 10000).toFixed(2)); })();
const TVL = walk(30, 2.41, .03).map(v => +v.toFixed(3));
const bars = (n = 30, h = 56) => { const bw = 1000 / n; let s = ''; for (let i = 0; i < n; i++) { const v = (10 + rnd() * 40).toFixed(0); s += `<rect x=${(i * bw + 1).toFixed(0)} y=${h - v} width=${(bw - 2).toFixed(0)} height=${v} fill="var(--ok-s)" stroke="var(--ok-f)"/>`; } return `<svg class=chart viewBox="0 0 1000 ${h}" preserveAspectRatio=none aria-hidden=true style="aspect-ratio:1000/${h}">${s}</svg>`; };
const POOLS = [['UniV3', 'WETH', 'USDC', '5bp', 10, 2431.5, 184.2e6, 12.4, true], ['UniV3', 'cbBTC', 'USDC', '30bp', 60, 97412, 62.1e6, 8.9, false], ['VeloV3', 'WETH', 'USDC', '5bp', 100, 2431.2, 41.0e6, 21.1, true], ['VeloV3', 'AERO', 'USDC', '30bp', 200, 1.284, 9.3e6, 34.6, false]];

// ---------- fragments ----------
const pill = (t, v, cls = 'sm') => `<span class="pill ${cls}"${v ? ` data-v=${v}` : ''}>${t}</span>`;
const btn = (t, cls = '', attrs = '') => `<button class="btn ${cls}"${attrs ? ' ' + attrs : ''}>${t}</button>`;
const chips = (list, on = 0) => `<div class="row wrap tight">${list.map((c, i) => `<button class="btn sm" aria-pressed=${i === on}>${c}</button>`).join('')}</div>`;
const tabs = (on = 0) => `<div class=tabs role=tablist aria-label="Pool view">${['Overview', 'Price', 'Liquidity', 'Fee'].map((t, i) => `<button role=tab aria-selected=${i === on}>${t}</button>`).join('')}</div>`;
const table = (cols, rows, cls = '') => `<table class="table ${cls}">${thead(cols)}<tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i && !/^</.test(c) && /[\d%—]/.test(c) ? ' class=num' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const panel = (v, html) => `<div class="panel stack tighter"${v ? ` data-v=${v}` : ''}>${html}</div>`;
const note = t => `<p class="xs muted">${t}</p>`;
const src = (kind, block = POOL.block) => `<span class="xs muted">${kind} · block ${block}</span>`;
const poolCard = ([dex, a, b, fee, ts, price, tvl, apy, keeper]) => `<div class="card stack tight"><div class="row between start"><div class="row tight">${tk(a, b)}<div><b>${a} / ${b}</b><div class="xs muted">${dex} · ${fee}/${ts}ts</div></div></div>${keeper ? pill('● keeper', 'ok', 'xs') : ''}</div><div class="grid grid-3 tight">${metric('Price', fmt(price, price < 10 ? 3 : 2))}${metric('TVL', usd(tvl))}${metric('APY', fmt(apy, 1) + '%')}</div><div class="row between baseline"><span class="xs muted">${two(tok(tvl / price, a), usd(tvl))}</span>${spark(walk(168), 96, 28, 'spark', '7d')}</div></div>`;
const poolHeader = (extra = '', pos = '$2.41M · 14.2%') => `<div class="stack tight"><div class="row between start"><div class="row tight">${tk(POOL.a, POOL.b, true)}<div><div class="row tight baseline"><b>${POOL.a} / ${POOL.b}</b>${pill(POOL.dex, null, 'xs')}</div><div class="xs muted">${POOL.fee}/${POOL.ts}ts · ${netIcon(POOL.net)} ${POOL.net} · <span class=mono>${POOL.addr}</span> ⧉</div></div></div>${extra}</div><div class="grid grid-2 tight">${metric('Price', fmt(POOL.price), '+1.2% · 24h')}${metric('Pool TVL', '$184.2M')}${metric('Pool APY', '12.4%')}${metric('Position', pos)}</div>${kv([['Reserves', '37,410 WETH · 93.2M USDC'], ['Strategy', `<span class=mono>${POOL.strat}</span> ⧉`], ['Tokens', '<span class=mono>0x4200…0006</span> ⧉ · <span class=mono>0x8335…2913</span> ⧉'], ['Updated', `block ${POOL.block} · lag 2 blocks · 12 s ago`]])}</div>`;
const chartHead = (title, sub, right) => head(title, sub, right);
const bandSwitch = (on = true) => `<label class="check xs"><input type=checkbox class=switch data-band${on ? ' checked' : ''}> show range</label>`;
const legend = items => `<div class=legend>${items.map(([k, t]) => `<span><i style="--k:${k}"></i>${t}</span>`).join('')}</div>`;
const bandRow = b => [b.ref, b.base[0], b.base[1], b.limit ? b.limit[0] : null, b.limit ? b.limit[1] : null, b.src === 'keeper' ? 1 : 0];
const ohlcReadout = (r, b) => `O ${fmt(r[0], 1)} H ${fmt(r[1], 1)} L ${fmt(r[2], 1)} C ${fmt(r[3], 1)} V ${fmt(r[4], 0)} · EMA ${fmt(b.ref, 1)} · base ${fmt(b.base[0], 0)}–${fmt(b.base[1], 0)}${b.limit ? ` · limit ${fmt(b.limit[0], 0)}–${fmt(b.limit[1], 0)}` : ''} · ${b.src === 'keeper' ? 'keeper' : 'projected'}`;
const priceCard = (rows, bands, period, typeOn, foot) => `<div class="card stack tight">${chartHead('Price', `${POOL.a} / ${POOL.b} · ${typeOn === 1 ? '1D' : '1H'} candles`, seg(['7D', '30D', 'All'], period, 'data-period', 'Period'))}<div class="row between wrap">${seg(['1H', '1D', 'Line'], typeOn, 'data-type', 'Chart type')}${bandSwitch()}</div>${readout(ohlcReadout(rows[rows.length - 1], bands[bands.length - 1]))}${hoverBox(candleSvg(rows, 240, 56, bands), { kind: 'ohlc', rows, bands: bands.map(bandRow) }, '1000/360')}${legend([['var(--ok-f)', 'base band'], ['var(--c3)', 'limit band'], ['var(--c1)', 'EMA · update price'], ['var(--fg)', 'current']])}${foot || ''}</div>`;
const allocationTable = () => table(['Allocation', 'Tick', 'Price'], [['baseUpper', '202,140', '2,581.80'], ['limitUpper', '201,980', '2,540.90'], ['limitLower', '201,600', '2,446.10'], ['<b>currTick</b>', '<b>201,540</b>', '<b>2,431.50</b>'], ['baseLower', '200,940', '2,289.70']]);
const positionsTable = () => table(['Positions', 'WETH', 'USDC'], [['base', '412.18', '1,003,200'], ['limit', '0.00', '408,110'], ['unused', '1.42', '2,544'], ['<b>total</b>', '<b>413.60</b>', '<b>1,413,854</b>']]);
const sharesTable = (user = '—', ratio = '—') => table(['Shares', 'Total', 'You', 'Ratio'], [['amount', '1,404,689.16', user, ratio], ['pricePerShare', '1.7154 USDC', '—', '—']]);
const feesTable = () => table(['Rewards', 'WETH', 'USDC'], [['baseFee', '0.382', '1,257.3'], ['limitFee', '0.088', '228.5'], ['<b>unclaimed</b>', '<b>0.470</b>', '<b>1,485.8</b>']]);
const settingsKv = () => kv([['Config hash', '<span class=mono>0x51c3…77ab</span>'], ['Signer', `<span class=mono>${ME}</span>`], ['Saved at', '19 Oct 14:02 UTC · block 31,198,402 · v7'], ['Projected bands', 'computed · v7']]) + kv(CONFIG);
const CONFIG = [['limitAtr', '3'], ['baseAtr', '5'], ['interval', '1 h'], ['dayEma', '20'], ['hourEma', '20'], ['dayOffsetEma', '20'], ['hourOffsetEma', '20'], ['offset', 'base'], ['offsetMultiplier', '5'], ['anchorPool', 'none'], ['baseRatio', '8000 bps'], ['limitRatio', '2000 bps'], ['chase', '2/3'], ['targetBaseRatio', '0.5'], ['targetTolerance', '0.3'], ['reduceLogic', 'A'], ['offsetInitialStrength', '0'], ['slippageControl', 'off'], ['refreshDataIntervalInMin', '15']];
const READONLY = [['quoteTokenAddr', '<span class=mono>0x8335…2913</span> · set on save'], ['baseWeight', '0.00091 · computed'], ['plotDetails', 'off · keeper local']];
const configForm = () => `<div class="grid grid-2 tight">${CONFIG.map(([k, v]) => `<label class="lbl xs">${k}<input class="field sm" value="${v}" aria-label="${k}"></label>`).join('')}</div><label class="check xs"><input type=checkbox class=switch checked> Enabled</label>${kv(READONLY)}`;
const advance = (open, user) => `<details class="stack tight"${open ? ' open' : ''}><summary class="btn sm ghost">${open ? 'Hide' : 'Show'} Advance</summary>${allocationTable()}${note('Rebalance: reduce token0 · 2 h ago · config <span class=mono>0x51c3…77ab</span>')}${positionsTable()}${sharesTable(user ? '12,480.22' : '—', user ? '0.89%' : '—')}${feesTable()}<div><span class=eyebrow>Settings</span>${settingsKv()}</div></details>`;
const txs = () => `<div class="stack tight">${panel('', `<div class="row tight"><span class=spin aria-hidden=true></span><b class=sm>Pending</b></div>${note('deposit 1.2 WETH + 2,920 USDC · <span class=mono>0x3a42…c8d1</span> · 14 s · <a href="#">view on explorer ↗</a>')}`)}${panel('ok', `<b class=sm>Mined</b>${note('block 31,204,120 · <a href="#">view on explorer ↗</a>')}`)}${panel('no', `<b class=sm>Failed</b>${note('Reverted: <span class=mono>SlippageExceeded</span> · <a href="#">view on explorer ↗</a>')}`)}</div>`;
const stale = () => panel('wa', `<b class=sm>240 blocks behind</b>${note('updatedBlock 31,204,118 · lagBlocks 240 · APY disabled beyond lag · live values from RPC')}`);
const connectRow = () => `<div class="row between"><span class="xs muted">Read-only · no wallet</span>${btn('Connect wallet', 'sm ghost')}</div>`;
const acct = () => `<span class="pill acct sm"><span class=tk><i>5</i></span><span class=mono>${ME}</span></span>`;
const actions = (primary = 'Deposit') => `<div class="row tight">${primary === 'Deposit' ? btn('Deposit', 'grow', 'data-p') + btn('Redeem', 'grow ghost') : btn('Deposit', 'grow ghost') + btn('Redeem', 'grow', 'data-p')}</div>`;

// ---------- frames ----------
const F = (id, group, caption, route, html, w = 'phone') => ({ id, group, caption, route, html, w });
const FRAMES = [
  F('W-01', 'guest', 'Pools', '/', `${chips(['All', 'Active', 'UniV3', 'VeloV3', 'PancakeV3', 'UniV4'])}<div class="row tight"><input class=field placeholder="0x… pool address or V4 id" aria-label="Find a pool">${pill(netIcon('Base') + ' Base', null, 'sm')}</div><div class="stack tight">${POOLS.map(poolCard).join('')}</div>${note('4 pools · updated block 31,204,118 · 12 s ago')}`),
  F('W-02', 'guest', 'Pools · Watch pool', '/', `<input class=field value="0x3a420c9e1b7d44f0a8c2e65d9b1f0e7a4c3d2b1a" aria-label="Find a pool"><div class="card stack tight"><div class="row tight">${tk('WETH', 'tBTC')}<div><b>WETH / tBTC</b><div class="xs muted">UniV3 · 30bp/60ts · not indexed yet</div></div></div>${kv([['Pool', '<span class=mono>0x3a42…2b1a</span>'], ['Factory', 'UniV3 · Base']])}${btn('Watch pool', 'lg', 'data-p')}</div>${panel('wa', `<b class=sm>Published, awaiting indexer confirmation.</b>${note('1 receiver · the card appears after the first indexer update')}`)}${note('0 receivers would read: "No subscriber. Try again later."')}`),
  F('W-03', 'guest', 'Pool · Overview', POOL.route, `${poolHeader()}${tabs(0)}${connectRow()}${priceCard(OHLC36, BANDS7, 0, 0)}${note('Performance and Advance follow below (W-11, W-07).')}`),
  F('W-04', 'guest', 'Pool · Price · 7D', POOL.route, `${tabs(1)}${priceCard(OHLC36, BANDS7, 0, 0, `<div class="row between xs muted"><span>range <b class=num>2,289.70 – 2,581.80</b></span><span>spot <b class=num>2,431.50</b></span></div>`)}${note('solid = run by the keeper · ▼ = allocation update · hover or ← → reads the candle and its bands')}`),
  F('W-05', 'guest', 'Pool · Price · All', POOL.route, `${tabs(1)}${priceCard(OHLC64, BANDS_ALL, 2, 1, `<div class="row between xs muted"><span>projected to 14 Aug · deployed since</span><span>keeper gap 22–27 Sep</span></div>`)}${note('dashed = projected from the current config (backfill) · solid = run by the keeper · the gap shows the strategy where the keeper was down')}`),
  F('W-06', 'guest', 'Pool · Liquidity · depth', POOL.route, `${tabs(2)}<div class="card stack tight">${chartHead('Liquidity', '±1,200 ticks · spacing 10', bandSwitch())}${readout(`tick ${fmt(CUR, 0)} · ${fmt(POOL.price, 1)} · 100.0M · ${fmt(100 / TICK_TOTAL * 100, 1)} % of total · limit`)}${hoverBox(tickSvg(TICKS), { kind: 'depth', rows: TICKS, total: TICK_TOTAL }, '1000/320')}${legend([['var(--ok-f)', 'base band'], ['var(--c3)', 'limit band'], ['var(--c1)', 'other liquidity'], ['var(--fg)', 'current tick']])}<div class="row between xs muted"><span>2,156.6</span><span><b class=num>2,431.5</b></span><span>2,741.5</span></div></div>${note('hover or ← → reads tick · price · active · share of total · base / limit / none')}`),
  F('W-07', 'guest', 'Pool · Advance', POOL.route, `${tabs(0)}${advance(true, false)}${note('read-only for a guest · each value carries its source and block')}`),
  F('W-08', 'user', 'Pool · Overview', POOL.route, `${poolHeader(acct())}${tabs(0)}<div class="row between baseline"><span class="sm">Your shares <b class=num>12,480.22</b> · 0.89%</span><span class="xs muted">$21,410 · derived</span></div>${actions('Deposit')}<div class="row between"><span class=eyebrow>Fees</span>${btn('Collect', 'sm ghost')}</div>${note('Collect is public on the singleton · role 0 on a legacy family')}${priceCard(OHLC36, BANDS7, 0, 0)}${note('Without role 1: Deposit disabled · "Deposit needs the user role on this vault."')}`),
  F('W-09', 'user', 'Pool · Deposit', POOL.route, `<div class="card stack tight"><div class="row between"><h3>Deposit</h3>${pill('role 1 · user', 'ok', 'xs')}</div><label class=lbl>WETH<input class="field big num" value="1.2000"><span class="xs muted">Balance 3.1402 · <a href="#">max</a></span></label><label class=lbl>USDC<input class="field big num" value="2,920.00"><span class="xs muted">Balance 12,480.22 · <a href="#">max</a></span></label>${kv([['Shares to mint', '≈ 4,118.40 · derived'], ['Share of vault', '0.29%'], ['Min shares', '4,097.81 · 0.5% slippage'], ['Deadline', '10 min'], ['Approvals', '1.2000 WETH · 2,920.00 USDC'], ['Network fee', '$0.42']])}${btn('Deposit', 'lg', 'data-p')}</div>`),
  F('W-10', 'user', 'Pool · Redeem · queued exit', POOL.route, `<div class="card stack tight"><div class="row between"><h3>Redeem</h3>${pill('holder · no role needed', null, 'xs')}</div><input class="field big num" value="6,240.11" aria-label="Shares"><div class="row wrap tight">${['25%', '50%', '75%', '100%'].map((p, i) => `<button class="btn sm" aria-pressed=${i === 1}>${p}</button>`).join('')}</div>${kv([['You receive', '0.598 WETH + 1,458.20 USDC · block 31,204,118'], ['Minimum', '0.595 WETH + 1,450.91 USDC'], ['Deadline', '10 min']])}${btn('Request redeem', 'lg', 'data-p')}<ul class="hs row"><li data-s=done><span class=n>1</span><span class=t>Requested</span></li><li data-s=now><span class=n>2</span><span class=t>Pending</span></li><li><span class=n>3</span>Settled</li><li><span class=n>4</span>Claimed</li></ul><div class="row between"><span class="xs muted">AeroCL2 queued exit · epoch 412 · mature in ≈ 2 h · "Claim" after settlement</span>${btn('Cancel', 'sm ghost')}</div></div>`),
  F('W-11', 'guest', 'Pool · Performance', POOL.route, `${tabs(0)}<div class="card stack tight">${chartHead('Performance', 'Shares index from 10,000', seg(['7D', '30D', 'All'], 1, 'data-period', 'Period'))}<div class=tabs role=tablist aria-label="Series"><button role=tab aria-selected=true>Shares</button><button role=tab aria-selected=false>TVL</button></div>${readout(`Shares ${fmt(SHARES[SHARES.length - 1])}`)}${hoverBox(lineSvg([{ pts: SHARES, color: 'var(--c1)' }]), { kind: 'series', names: ['Shares'], series: [SHARES] }, '1000/300')}${bars()}<div class="row between xs muted"><span>${src('derived')}</span><span><b class=num>$31.0k</b> collected · 30 d · TVL in USDC</span></div></div>`),
  F('W-12', 'user', 'Account', '/me', `<div class="row between"><div class="row tight">${acct()}${pill('user · Base', null, 'xs')}</div>${btn('⧉', 'sm ghost', 'aria-label="Copy address"')}</div><div class="row between xs muted"><span>updated 12 s ago · block 31,204,118</span>${btn('Refresh', 'sm ghost')}</div><div><span class=eyebrow>${netIcon('Base')} Base · 1 position</span></div><div class="card stack tight"><div class="row between"><div class="row tight">${tk('WETH', 'USDC')}<b>WETH / USDC</b></div>${pill('VeloV3 · 5bp', null, 'xs')}</div>${kv([['Shares held', '12,480.22 ' + pill('observed', null, 'xs')], ['Redeemable now', '0.598 WETH + 1,458 USDC ' + pill('observed', null, 'xs')], ['Value per share', '1.7154 USDC ' + pill('observed', null, 'xs')], ['Share of vault', '0.89% ' + pill('derived', null, 'xs')], ['Claimable emissions', '12.4 AERO ' + pill('pro-rata estimate', null, 'xs')], ['PnL vs HODL', '<span class=delta data-d=up>+2.4%</span> ' + pill('estimate', null, 'xs')]])}<div class="row tight">${btn('Redeem', 'sm ghost')}${btn('History', 'sm ghost')}</div></div><div><span class=eyebrow>Roles</span>${table(['Strategy', 'Chain', 'Role'], [[`<span class=mono>${POOL.strat}</span>`, 'Base', 'user'], [`<span class=mono>${POOL.strat}</span>`, 'Ethereum', 'none']])}</div>${note('Ethereum · timed out · <a href="#">Refresh</a> · PnL reads "unknown" for transferred shares with no cost basis')}${note('No wallet: "Connect wallet to see your positions." as the only action')}`),
  F('W-13', 'manager', 'Pool · Overview · Manage', POOL.route, `${poolHeader(acct())}${tabs(0)}<div class="row between baseline"><span class="sm">${pill('role 0 · manager', 'ac', 'xs')}</span><span class="xs muted">intent: none pending</span></div><div class="row tight">${btn('Deposit', 'grow', 'data-p')}${btn('Redeem', 'grow ghost')}${btn('Manage ▾', 'ghost', 'aria-expanded=true')}</div><div class="menu" role=menu>${['Allocate', 'Free', 'Collect', 'Config'].map(m => `<button role=menuitem>${m}</button>`).join('')}</div>${note('Stake, Unstake and Claim rewards appear on gauge venues only')}<div class="row between"><span class=eyebrow>Fees</span>${btn('Collect', 'sm', 'data-v=ok')}</div>${kv([['Unclaimed', '0.470 WETH · 1,485.8 USDC']])}`),
  F('W-14', 'manager', 'Manage · Allocate', POOL.route, `<div class="card stack tight"><div class="row between"><h3>Allocate</h3>${pill('from decision · 2 min ago', null, 'xs')}</div>${kv([['Base', '200,940 – 202,140 · 2,289.70 – 2,581.80'], ['Limit', '201,600 – 201,980 · 2,446.10 – 2,540.90'], ['Current tick', '201,540 · 2,431.50'], ['Base ratio', '8000 bps'], ['Rebalance', 'reduce token0']])}<div><span class="xs muted">base</span>${rangeBar(20, 80, 44)}</div><div><span class="xs muted">limit</span>${rangeBar(50, 72, 44)}</div>${tickSvg(TICKS, 72)}${panel('wa', `<b class=sm>Preflight</b>${note('slot0 moved 0.1% since the decision · within the ±0.5% guard · no intent in flight')}`)}${btn('Allocate', 'lg', 'data-p')}</div>`),
  F('W-15', 'manager', 'Manage · Config', POOL.route, `<div class="card stack tight"><div class="row between"><h3>Config</h3>${seg(['Form', 'JSON'], 0, 'data-view', 'Editor view')}</div>${note('v7 · signer <span class=mono>0x5610…283e</span> · hash <span class=mono>0x51c3…77ab</span> · saved at 19 Oct 14:02 UTC')}${configForm()}${panel('', `<b class=sm>Preview · dry run</b>${note('would allocate base 2,250 – 2,650 · limit 2,431 – 2,650 · reduce token0 · "preview" bands drawn on the price chart')}`)}<div class="row tight">${btn('Preview', 'grow ghost')}${btn('Save', 'grow', 'data-p')}</div>${note('Save signs EIP-712 SetConfig · gateway checks role 0 or owner on-chain · writes config + configMeta to KeyDB · a refusal reads: no role · expired deadline · used nonce · schema error · other deployment')}</div>`),
  F('W-16', 'manager', 'Manage · Config saved', POOL.route, `${panel('ok', `<b class=sm>Config saved</b>${kv([['Signer', `<span class=mono>${ME}</span>`], ['Hash', '<span class=mono>0x51c3…77ab</span>'], ['Saved at', '19 Oct 14:02 UTC · block 31,204,131'], ['Version', '7'], ['Pickup', 'waiting for the keeper · last intent mined · next decision in ≈ 4 min']])}${note('The keeper reads this config at its next decision. Interval: 1 h.')}`)}<div class="card stack tight"><div class="row between"><h3>Config</h3>${pill('read-only · v7', null, 'xs')}</div>${kv(CONFIG.slice(0, 8))}${btn('Edit again', 'sm ghost')}</div>${note('Projected bands: computing · old-hash rows hidden until the recompute lands')}`),
  F('W-17', 'admin', 'Pool · Initialize', POOL.route, `${poolHeader(pill('No vault', 'wa', 'xs'), 'unavailable')}<div class="card stack tight"><h3>Initialize pool</h3>${kv([['Family', 'in-kind singleton · UniV3'], ['Pool', `<span class=mono>${POOL.addr}</span>`]])}<label class=lbl>Manager<input class="field mono" value="0xa11c…4e02"></label><label class=lbl>Reference fee<div class="row tight">${['1bp', '5bp', '30bp', '100bp'].map((f, i) => `<button class="btn sm" aria-pressed=${i === 1}>${f}</button>`).join('')}</div></label><label class=lbl>Swap limits<div class="row tight"><input class="field num" value="50 bps · per tx"><input class="field num" value="1 h · epoch"></div></label>${panel('wa', note('Two transactions in order: create, then setReferenceFee. The admin wallet signs both.'))}${btn('Initialize pool', 'lg', 'data-p')}</div>`),
  F('W-18', 'admin', 'Admin', '/admin', `<div class="row between"><div class="row tight">${acct()}${pill('admin', 'ac', 'xs')}</div><span class="xs muted">another wallet reads "Owner only"</span></div><div class="stack tight"><span class=eyebrow>Roles · UniV3 strategy · Base</span>${table(['Wallet', 'Role', ''], [['<div><span class=mono>0xa11c…4e02</span><div class="xs muted">granted 31,190,004 · ✓ 31,204,118</div></div>', 'manager · 0', btn('Revoke', 'sm ghost')], ['<div><span class=mono>0x5610…283e</span><div class="xs muted">granted 31,190,004 · ✓ 31,204,118</div></div>', 'manager · 0', btn('Revoke', 'sm ghost')], ['<input class="field sm mono" placeholder="0x…" aria-label="Wallet">', '<select class="field sm" aria-label="Role"><option>user · 1</option><option>manager · 0</option></select>', btn('Grant', 'sm', 'data-p')]])}</div><div class="stack tight"><span class=eyebrow>Visibility</span><div class="row between"><label class="check sm"><input type=checkbox class=switch checked> WETH / USDC public</label>${btn('Save', 'sm ghost')}</div>${note('<b>Hidden does not mean blocked.</b> Visibility does not restrict contract access.')}</div><div class="stack tight"><span class=eyebrow>Vault</span>${kv([['Reference fee', '5bp'], ['Swap limits', '50 bps · 1 h'], ['Deposit', 'role 1 · <a href="#">Open deposit to the public</a>']])}</div><div class="stack tight"><span class=eyebrow>Ownership</span><label class=lbl>Transfer to<input class="field mono" placeholder="0x…"></label><label class=lbl>Type the last 6 characters of the address<input class="field mono" placeholder="…"></label>${note('You lose admin access after this transaction.')}${btn('Transfer ownership', 'sm ghost', 'disabled')}</div><div class="stack tight"><span class=eyebrow>Signed actions</span>${table(['Action', 'Signer', 'Hash'], [['<div>config<div class="xs muted">WETH / USDC · 14:02</div></div>', '<span class=mono>0x5610…283e</span>', '<span class=mono>0x51c3…77ab</span>'], ['<div>public<div class="xs muted">WETH / USDC · yesterday</div></div>', '<span class=mono>0x5610…283e</span>', '<span class=mono>0x0c9a…e1d4</span>']])}</div>`),
  F('W-19', 'states', 'Connect · wrong network', POOL.route, `${poolHeader(acct())}${panel('wa', `<div class="row between"><b class=sm>Wallet on Ethereum · pool on Base</b>${pill(netIcon('Base') + ' Base', 'wa', 'xs')}</div>${note('Actions are disabled until the networks match. Data stays visible.')}${btn('Switch to Base', 'sm', 'data-v=wa')}`)}<div class="row tight">${btn('Deposit', 'grow ghost', 'disabled')}${btn('Redeem', 'grow ghost', 'disabled')}</div>${note('No wallet: the same view with "Connect wallet" as the only action.')}`),
  F('W-20', 'states', 'Stale data', POOL.route, `${stale()}<div class="stack tight"><div class="row between start"><div class="row tight">${tk(POOL.a, POOL.b, true)}<div><b>${POOL.a} / ${POOL.b}</b><div class="xs muted">${POOL.dex} · ${POOL.fee}/${POOL.ts}ts</div></div></div>${pill('stale', 'wa', 'xs')}</div><div class="grid grid-2 tight">${metric('Price', fmt(POOL.price), 'live · RPC')}${metric('Pool TVL', '$184.2M')}${metric('Pool APY', 'stale')}${metric('Position', '$2.41M · stale')}</div></div>${tabs(0)}${note('APY shows "stale" beyond the lag threshold · the label names the block · clears on the next live update')}`),
  F('W-21', 'states', 'Gateway down · RPC-only', POOL.route, `${panel('wa', `<b class=sm>Gateway unavailable. Live values only.</b>${note('RPC-only mode: balances and the current price are live; charts, APY and history are unavailable. Funds remain on-chain.')}`)}<div class="grid grid-2 tight">${metric('Price', fmt(POOL.price), 'live · RPC')}${metric('Your shares', '12,480.22')}</div><div class="empty" style="aspect-ratio:1000/240">History unavailable</div><div class="empty" style="aspect-ratio:1000/160">Depth unavailable</div><div class="row tight">${btn('Deposit', 'grow', 'data-p')}${btn('Redeem', 'grow ghost')}</div>${note('Sibling panels, same layout: keeper down → "Ranges are not managed." · RPC down → "RPC unavailable. Transactions disabled." · HyperIndex down → "All" disabled with "History unavailable"')}`),
  F('W-22', 'states', 'Transaction states', POOL.route, `${txs()}${note('Inline, never alert() · each state names the hash and links the explorer')}`),
  F('W-23', 'guest', 'Pools · responsive', '/', `<div class="row wrap between">${chips(['All', 'Active', 'UniV3', 'VeloV3', 'PancakeV3', 'UniV4'])}<input class=field style="max-width:16rem" placeholder="0x… pool address or V4 id" aria-label="Find a pool"></div><div class=scroll tabindex=0>${table(['Pool', 'DEX', 'Fee/ts', 'Price', 'TVL', 'APY', '7d', 'Keeper'], POOLS.concat([['PancakeV3', 'cbBTC', 'WETH', '5bp', 10, 0.0251, 4.9e6, 6.2, false]]).map(([dex, a, b, fee, ts, price, tvl, apy, keeper]) => [`${tk(a, b)}<b>${a} / ${b}</b>`, dex, `${fee}/${ts}ts`, fmt(price, price < 1 ? 4 : 2) + ' ' + b, two(usd(tvl), tok(tvl / price, a)), fmt(apy, 1) + '%', spark(walk(168), 96, 28, 'spark', '7d'), keeper ? pill('● keeper', 'ok', 'xs') : '—']), 'tall')}</div>`, 'wide'),
  F('W-24', 'user', 'Pool view · responsive', POOL.route, `<div class="grid grid-31 loose"><div class="stack">${poolHeader(acct())}${tabs(0)}${priceCard(OHLC36, BANDS7, 0, 0)}<div class="card stack tight">${chartHead('Liquidity', '±1,200 ticks', bandSwitch())}${tickSvg(TICKS)}${legend([['var(--ok-f)', 'base'], ['var(--c3)', 'limit'], ['var(--c1)', 'other'], ['var(--fg)', 'current']])}</div></div><div class="stack"><div class="card stack tight"><div class="row between"><h3>Your position</h3>${pill('role 1', 'ok', 'xs')}</div>${kv([['Shares', '12,480.22 · 0.89%'], ['Value', '$21,410 · derived'], ['Vault unclaimed fees', '0.470 WETH · 1,485.8 USDC']])}${actions('Deposit')}</div>${advance(false, true)}</div></div>`, 'wide'),
];
const GROUPS = [['guest', 'Guest', 'No wallet, or a wallet with no role and no shares. Everything public on-chain is visible: the list, the charts with the strategy bands, the Advance tables. The only call to action is Connect, and it is secondary.'], ['user', 'User and holder', 'A connected wallet. A user (role 1) can deposit; any holder can redeem, role or not. The primary action is Deposit or Redeem, never both.'], ['manager', 'Manager', 'Role 0. The Manage menu, Allocate as a review step from the latest decision, and the Config editor whose Save signs and writes to KeyDB. An admin with role 0 sees the same frames; without role 0 the admin sees no Manage menu and acts on /admin.'], ['admin', 'Admin', 'The owner of RolesAuthority. Initialize a pool, grant and revoke roles, visibility, vault parameters, ownership.'], ['states', 'States', 'Cross-cutting: wrong network, stale data, gateway down, transaction feedback. Each keeps the layout and swaps one panel.']];

// ---------- page ----------
const frameHtml = f => `<article class="frame ${f.w}" id="${f.id}" aria-label="${f.id} · ${esc(f.caption)} · ${f.group}"><div class=cap><b>${f.id}</b><span>${esc(f.caption)}</span><span class=mono>${esc(f.route)}</span></div><div class=sb aria-hidden=true><span>9:41</span><span>●●●● ▲ ▮</span></div><div class=body>${f.html}</div></article>`;
const groupHtml = ([g, title, why]) => { const fs = FRAMES.filter(f => f.group === g); return `<section class=role id="${g}">
<div class=sec-h><span class=eyebrow>${g} · ${fs.length} frame${fs.length > 1 ? 's' : ''}</span><h2>${title}</h2><p>${why}</p></div>
<div class=sheet tabindex=0 role=region aria-label="${title} frames">${fs.filter(f => f.w === 'phone').map(frameHtml).join('')}</div>
${fs.filter(f => f.w === 'wide').map(frameHtml).join('')}
</section>`; };
const BODY = GROUPS.map(groupHtml).join('\n');

// one primary per frame, at build time
for (const f of FRAMES) { const n = (f.html.match(/\bdata-p\b/g) || []).length; if (n > 1) throw new Error(`${f.id} has ${n} primary actions`); }

const SCRIPT = `
const r=document.documentElement;
const S=()=>{try{return JSON.parse(localStorage.mui||'{}')}catch{return{}}};
const apply=s=>{const d=s.den||'sharp',l=s.lum||'light';r.dataset.t=d==='sharp'?(l==='dark'?'sharp-dark':'sharp'):(l==='dark'?'dark':'base');
  for(const b of document.querySelectorAll('[data-den]'))b.setAttribute('aria-pressed',b.dataset.den===d);
  for(const b of document.querySelectorAll('[data-lum]'))b.setAttribute('aria-pressed',b.dataset.lum===l)};
apply(S());
addEventListener('click',e=>{const b=e.target.closest('[data-den],[data-lum]');if(!b)return;
  const s={...S(),...(b.dataset.den?{den:b.dataset.den}:{lum:b.dataset.lum})};try{localStorage.mui=JSON.stringify(s)}catch{}apply(s)});
addEventListener('beforeprint',()=>{r.dataset.t='sharp'});addEventListener('afterprint',()=>apply(S()));
// charts: values on hover or keyboard; the readout is the one line above the chart in the same card
const num=(v,d=2)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
for(const box of document.querySelectorAll('[data-hover]')){
  const data=JSON.parse(box.dataset.hover),svg=box.querySelector('svg'),xh=svg.querySelector('.xh'),out=box.closest('.card').querySelector('.readout');
  const rows=data.rows||data.series[0],n=rows.length,vb=svg.viewBox.baseVal.width;let cur=n-1;const hint=out.textContent;
  const show=i=>{cur=i;const x=(i+.5)/n*vb;xh.setAttribute('x1',x);xh.setAttribute('x2',x);xh.setAttribute('visibility','visible');
    out.textContent=data.kind==='ohlc'?(([o,h,l,c,v])=>{const b=data.bands&&data.bands[i];return 'O '+num(o,1)+' H '+num(h,1)+' L '+num(l,1)+' C '+num(c,1)+' V '+num(v,0)+(b?' · EMA '+num(b[0],1)+' · base '+num(b[1],0)+'–'+num(b[2],0)+(b[3]!=null?' · limit '+num(b[3],0)+'–'+num(b[4],0):'')+' · '+(b[5]?'keeper':'projected'):'')})(rows[i])
      :data.kind==='depth'?(([t,p,a,nt,w])=>'tick '+num(t,0)+' · '+num(p,1)+' · '+num(a,1)+'M · '+num(a/data.total*100,1)+' % of total · '+w)(rows[i])
      :data.names.map((nm,k)=>nm+' '+num(data.series[k][i])).join(' · ')};
  const hide=()=>{xh.setAttribute('visibility','hidden');out.textContent=hint};
  box.addEventListener('pointermove',e=>{const rc=box.getBoundingClientRect();show(Math.max(0,Math.min(n-1,Math.floor((e.clientX-rc.left)/rc.width*n))))});
  box.addEventListener('pointerleave',hide);
  box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(Math.max(0,Math.min(n-1,cur+(e.key==='ArrowRight'?1:-1))))}else if(e.key==='Home')show(0);else if(e.key==='End')show(n-1)});
  box.addEventListener('focus',()=>show(cur));box.addEventListener('blur',hide);
}
// show-range hides the whole band layer; segmented controls, tabs and pressed buttons hold their state
addEventListener('change',e=>{const t=e.target;if(!t.matches('[data-band]'))return;for(const b of t.closest('.card').querySelectorAll('.band'))b.setAttribute('visibility',t.checked?'visible':'hidden')});
addEventListener('click',e=>{const b=e.target.closest('.frame .seg button,.frame [role=tab],.frame .btn[aria-pressed]');if(!b)return;
  if(b.matches('.btn[aria-pressed]')&&!b.closest('.seg')){for(const x of b.parentElement.querySelectorAll('.btn[aria-pressed]'))x.setAttribute('aria-pressed',x===b);return}
  for(const x of b.parentElement.children)x.setAttribute(x.hasAttribute('aria-selected')?'aria-selected':'aria-pressed',x===b)});
addEventListener('keydown',e=>{const t=e.target.closest('[role=tab],.seg button');if(!t||!/^Arrow(Left|Right)$/.test(e.key))return;const sib=e.key==='ArrowRight'?t.nextElementSibling:t.previousElementSibling;if(sib){e.preventDefault();sib.focus();sib.click()}});
`;
new Function(SCRIPT);   // a syntax error fails the build, not the page

const html = `<!doctype html><html lang=en data-t=sharp><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Pairs.pro — wireframe</title>
<style>
@layer reset,theme,base,comp,chart,kit,page;
${['reset', 'theme', 'base'].map(layer).join('\n')}
${['comp', 'chart'].map(nm => prune(layer(nm), BODY)).join('\n')}
${prune(`@layer kit{\n${COMPOSITES}\n}`, BODY)}
@layer page{
.page{max-width:90rem;margin-inline:auto;padding:calc(1.5rem*var(--sp)) 1.25rem 6rem;display:flex;flex-direction:column;gap:calc(2.5rem*var(--sp))}
.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--n1) 88%,transparent);backdrop-filter:blur(8px);border-block-end:1px solid var(--n3)}
.top .in{max-width:90rem;margin-inline:auto;padding:.6rem 1.25rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.brand{font-weight:700;letter-spacing:-.02em}.brand span{color:var(--fg3);font-weight:500}
.top nav{display:flex;gap:.125rem;flex-wrap:wrap}.top nav a{padding:.375rem .625rem;border-radius:var(--r1);font-size:.8125rem;font-weight:500;color:var(--fg2);text-decoration:none}.top nav a:hover{background:var(--n2);color:var(--fg)}
.sec-h{display:flex;flex-direction:column;gap:.25rem;max-width:70ch}.sec-h p{color:var(--fg2);text-wrap:pretty}
.role{scroll-margin-top:5rem;display:flex;flex-direction:column;gap:calc(1rem*var(--sp))}
.toc{display:flex;flex-wrap:wrap;gap:.25rem}.toc a{padding:.3rem .6rem;border-radius:var(--rf);background:var(--n2);font-size:.8125rem;color:var(--fg2);text-decoration:none}.toc a:hover{background:var(--n3);color:var(--fg)}
/* the sheet: phone frames side by side, wide frames full width; the chrome is an outline in every theme */
.sheet{display:flex;gap:.75rem;overflow-x:auto;padding:.5rem .25rem 1rem;scroll-snap-type:x proximity}
.frame{flex:0 0 auto;width:22.5rem;border:1px solid var(--n4);border-radius:var(--r2);background:transparent;display:flex;flex-direction:column;scroll-snap-align:start;scroll-margin-top:5rem}
.frame.wide{width:100%}
.frame>.cap{display:flex;gap:.5rem;align-items:baseline;padding:.3rem .6rem;border-block-end:1px dashed var(--n4);font-size:.6875rem;color:var(--fg3)}.frame>.cap b{color:var(--fg)}.frame>.cap .mono{margin-inline-start:auto}
.frame>.sb{display:flex;justify-content:space-between;padding:.15rem .6rem;font:.625rem var(--fm);color:var(--fg3);border-block-end:1px solid var(--n4)}
.frame>.body{padding:.75rem;display:flex;flex-direction:column;gap:.75rem;min-width:0}
.frame.phone .grid-2,.frame.phone .grid-3,.frame.phone .grid-4{grid-template-columns:1fr 1fr}.frame.phone .grid-3{grid-template-columns:1fr 1fr 1fr}.frame.phone .grid-31{grid-template-columns:1fr}
.frame.wide .grid-31{grid-template-columns:1.6fr 1fr;align-items:start}.frame.wide .grid-2{grid-template-columns:repeat(4,1fr)}.frame.wide .grid-3{grid-template-columns:repeat(3,1fr)}
.frame .table{font-size:.75rem}.frame .table th,.frame .table td{padding:.35rem .45rem;height:2.25rem}.frame.phone .table td:not(.num){white-space:normal}
.frame h3{margin:0;font-size:1rem}.frame .metric,.frame .panel.stack{padding:.5rem .6rem}.frame .num.lg{font-size:1.0625rem}
.frame .field.sm{padding:.3rem .5rem;font-size:.75rem}.frame .lbl.xs{font-size:.6875rem;gap:.2rem}
.frame .menu{display:flex;flex-direction:column;border:1px solid var(--n3);border-radius:var(--r2);padding:.25rem}.frame .menu button{text-align:left;padding:.4rem .6rem;border-radius:var(--r1)}.frame .menu button:hover{background:var(--n2)}
.frame .empty{display:grid;place-items:center;border:1px dashed var(--n4);border-radius:var(--r2);color:var(--fg3);font-size:.75rem}
.frame .hs{display:flex;font-size:.75rem}
.frame details>summary{list-style:none;cursor:pointer;width:max-content}.frame details>summary::-webkit-details-marker{display:none}
.frame .spin{width:.9rem;height:.9rem;border:2px solid var(--n3);border-top-color:var(--ac);border-radius:50%;display:inline-block;animation:sp 1s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.frame .spin{animation:none}}
.readout{min-height:1.25em;min-height:1lh}.frame.phone .readout{font-size:.625rem;white-space:normal;min-height:3lh;max-height:3lh;overflow:hidden;line-height:1.3}
@media print{
  @page{size:2600px 2000px;margin:48px}
  *{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  body{background:var(--n0)}
  .top,.toc,.intro p.muted{display:none}
  .page{max-width:none;padding:0;gap:1rem}
  .sheet{flex-wrap:wrap;overflow:visible;padding:0}
  .frame{break-inside:avoid}.frame.wide{break-before:page}
  section.role{break-before:page}.intro+section.role{break-before:auto}
}
}
</style>

<header class=top><div class=in>
<div class=brand>μi <span>pairs.pro wireframe</span></div>
<nav aria-label="Site"><a href="../">Design language</a><a href="../paper/">The paper</a><a href="../blocks/">Blocks</a><a href="../app/">μApp demo ↗</a></nav>
<div class=seg role=group aria-label=Density style="margin-inline-start:auto"><button data-den=base>Base</button><button data-den=sharp aria-pressed=true>Sharp</button></div>
<div class=seg role=group aria-label=Luminance><button data-lum=light aria-pressed=true>Light</button><button data-lum=dark>Dark</button></div>
</div></header>

<main class=page>
<section class="sec-h intro" style="max-width:72ch">
<span class=eyebrow>Pairs.pro refresh · ${FRAMES.length} frames · ${GROUPS.length} groups</span>
<h1>Pairs.pro, in frames</h1>
<p>The refresh of the Pairs.pro web app as a wireframe sheet: the pools list, the pool view with its price, depth and performance charts and the Advance tables, the account view and the admin view, drawn for each role in the μi Sharp outline. Every frame has an id that the user-story spec cites (<span class=mono>pairs-pro/docs/refresh-user-stories.md</span>); the same sheet prints to <span class=mono>refresh-wireframe.pdf</span>.</p>
<p class="sm muted">Controls hold a static state: period, chart type and tabs press but do not switch data. Charts read out on hover or with ← →. The strategy bands cover the whole history — dashed where they are projected from the current config, solid where the keeper ran them. Every number carries source · block · kind on hover; the sheet draws the kind where it changes the reading.</p>
<nav class=toc aria-label="Frames">${FRAMES.map(f => `<a href="#${f.id}">${f.id} · ${esc(f.caption)}</a>`).join('')}</nav>
</section>
${BODY}
</main>

<script type=module>${SCRIPT}</script>
`;

await Bun.write('pairs-pro.html', html);
const { brotliCompressSync, constants: Z } = await import('node:zlib');
const br = b => brotliCompressSync(Buffer.from(b), { params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_LGWIN]: 24 } }).length;
console.log(`  pairs-pro.html   raw ${html.length}  brotli ${br(html)}   ${FRAMES.length} frames, ${GROUPS.length} groups`);
console.log('  primary per frame: ' + FRAMES.map(f => `${f.id}:${(f.html.match(/\bdata-p\b/g) || []).length}`).join(' '));

// --pdf[=path]: print the sheet through headless Chrome; a fresh profile means no stored theme, so it prints Sharp
const pdfArg = process.argv.find(a => a.startsWith('--pdf'));
if (pdfArg) {
  const { existsSync } = await import('node:fs');
  const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
  if (!CHROME) { console.error('✗ no Chrome found for --pdf'); process.exit(1); }
  const out = pdfArg.includes('=') ? pdfArg.slice(pdfArg.indexOf('=') + 1) : `${import.meta.dir}/../../pairs-pro/docs/refresh-wireframe.pdf`;
  const tmp = `${process.env.TMPDIR || '/tmp'}/pairs-pro-pdf-profile`;
  const p = Bun.spawnSync([CHROME, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${tmp}`, '--no-pdf-header-footer', '--virtual-time-budget=2000', `--print-to-pdf=${out}`, `file://${import.meta.dir}/pairs-pro.html`], { stdout: 'ignore', stderr: 'pipe' });
  if (p.exitCode !== 0 || !existsSync(out)) { console.error('✗ print failed', p.stderr?.toString().slice(-400)); process.exit(1); }
  console.log(`  ${out}   ${(Bun.file(out).size / 1024).toFixed(0)} KB`);
}
