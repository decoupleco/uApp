# Data-rich μApps — markets, market detail, charts

*Research, 2026-10-17. Every number is measured; the method for each is in the appendix.*

**Question.** The next μApps are data portals: a markets list (DEX pools, lending markets — network, token,
TVL/volume/fees, APR, a sparkline per row) and a market detail view (price and depth charts at 1H/1D, period
switching across 1D/7D/30D/90D/All, a metrics strip, a secondary chart, an order ticket). shadcn/ui's chart
gallery, Morpho's Midnight markets app and Tenor's markets view are the pattern references. They are references
for *what to show*, not for *what to ship* — none of them is light, and one of them fails CLS — so the research
splits into two parts: what the patterns are, and what each of them costs when built the μi way.

**Answer, in one paragraph.** Both views fit in P0 as finished pages, not skeletons. A 20-row markets table with
a sparkline per row is **3,345 B brotli**; a market detail page with a real candlestick chart, a depth chart and
a secondary chart inlined as static SVG from the 1D snapshot is **3,184 B** — each leaving ~5.9 KB of the
9,216 B flight for growth. The chart primitives those pages need cost **326 B (sparkline), 466 B (depth) and
774 B (candles + volume + crosshair)** hand-rolled, against **44.8 KB for lightweight-charts and 139.5 KB for
the React + Recharts stack shadcn uses**. The weight on these pages is the *data*, not the chart: a 90-day 1H
series is 43 KB gzip as JSON objects, 18.8 KB as columnar delta-ints — so the governing rule is that period
and resolution are chosen together such that every data payload is one flight. CLS 0 holds because every
chart box is reserved with `aspect-ratio` and already contains a real chart before any JavaScript runs.

---

## 1. The references — patterns, with their footprint as context

Measured in Chrome on 2026-10-17, cold load, everything the page fetched before idle. These are what the
pattern costs in its native stack; they are not targets.

| site | stack | JS | total | fonts | CLS | rows |
| :-- | :-- | --: | --: | --: | --: | --: |
| ui.shadcn.com/charts/area | Next.js + Recharts | 5.44 MB / 181 files | — | — | — | — |
| app.morpho.org/vaults | custom React build | 3.50 MB / 86 | 4.0 MB | 352 KB Inter Variable | **0** | 63 px |
| markets.morpho.org/fixed (Midnight) | Next.js | 2.01 MB / 71 | 2.64 MB | FK Grotesk + Inter | **0** | 64 px |
| app.tenor.finance/markets | Next.js | 2.61 MB / 113 | 3.18 MB | Inter + Tobias | **0.177** | 78 px |

Tenor's markets view — the one named as a sharp execution — ships a layout shift of 0.177, which is above the
0.1 "needs improvement" line. Sharp to look at and sharp to measure are different things, which is the whole
reason μi has gates.

### 1.1 shadcn/ui charts

A gallery of chart *families* — Area, Bar, Line, Pie, Radar, Radial, Tooltips — with ~10 variants each
(default, linear, step, legend, stacked, stacked-expanded, icons, gradient, axes, interactive). The patterns
worth taking:

- **The card is the unit.** Title, one-line description ("Showing total visitors for the last 3 months"), the
  chart, and a footer that states the trend in words ("Trending up by 5.2% this month"). The chart never
  stands alone.
- **A closed series ramp.** Colours come from `--chart-1` … `--chart-5`, a tonal ramp of one hue in `lab()`
  (measured: five blues from L 77 down to L 30). Series are tints of each other, not a rainbow — exactly
  μi's closed-palette instinct applied to data ink.
- **Interactive = a period selector, not pan/zoom.** The "Interactive" variant is a select ("Last 3 months")
  that swaps the series. Nothing in the gallery pans or zooms.
- **Gradient fills under area lines**, legends as inline pills, tooltips as small cards following the cursor.

Cost of the stack behind it, built through μi's own pipeline: a single area chart with React + Recharts is
**139,521 B brotli**. That is fifteen P0 budgets for one chart, and the reason the gallery page ships 5.4 MB.

### 1.2 Morpho — vaults app and the Midnight markets app

**Vaults list** (`app.morpho.org/vaults`): a true `<table>`, 63 px rows, columns *asset · deposits (token and
USD on two lines) · liquidity · 7-day sparkline (inline SVG) · curator · APY*. One sparkline per row, drawn as
an SVG path, no chart library on the list page at all. Inter Variable with a metric-compatible "Inter Fallback"
so the webfont swap does not shift — that is how they hold CLS 0 while loading 352 KB of font.

**Midnight markets** (`markets.morpho.org/fixed`, the new fixed-rate app) — the dense pattern:

- **Totals strip** above the table: Total deposits · Outstanding loans · Loans originated.
- **Filter chips**: Network, Loan, Collateral, Maturity — plus a "Grouped maturities" toggle that collapses
  the same market across maturities into one row.
- **Columns**: Market family (loan/collateral token icons, chain, LLTV, oracle), Outstanding loans, Borrow
  liquidity, **Borrow at** as a *range* ("4.61% – 4.84%"), Lend at.
- **Bottom dock** instead of a detail page: "My positions / My open orders / My activity", and a Lend / Borrow
  ticket. Clicking a row populates the dock; the URL does not change.
- "Multi-Market Limit Order" as the single primary action. Desktop-only, by their own banner.

**Vault detail** (`…/vault/…/steakhouse-usdg`): sections Overview · Allocation · Performance · Risk · Activity.
The performance chart is a custom SVG (no Recharts, no lightweight-charts, no canvas on the page); the period
control offers "All / MAX". CLS 0.0002.

### 1.3 Tenor — markets and the trading page

**Markets** (`app.tenor.finance/markets`): 78 px rows — *Market · Best borrow (rate, "Fixed · 30 Oct") ·
Best lend (rate, "+2.6% Variable") · Total borrows · Borrow rate by maturity* — the last column being a
**mini bar chart per row** (Oct / Nov / Dec), which is the sparkline idea applied to a term structure.

**Trading page** (`/trading/<id>?mode=borrow`) — the market-detail pattern for an order-book market:

- Header: asset, maturity with countdown ("Oct 30 · in 13 days"), tick size (0.1%), a USD/token toggle.
- Tabs **Liquidation Price · Curve · Offers**, where Offers is an **order book rendered as horizontal depth
  bars**: APR · Size · Cumulative liquidity per level, lend offers above, borrow offers below, mid rate and
  spread between them. This is the depth chart as a table — the same data as a depth curve, read row by row.
- Right rail: the **ticket** — Borrow / Lend tabs, collateral and amount fields, an **LTV slider with the
  liquidation point marked**, Market / Limit, maturity select, the resulting fixed APR, one primary CTA.
- Below: protocol facts (Morpho, total borrow, collateral assets, liquidation LTV).

### 1.4 Pattern inventory

| pattern | seen in | μi recipe |
| :-- | :-- | :-- |
| totals / metrics strip | Midnight, Tenor, (shadcn footers) | `.metrics` — a `.grid` of `.panel`s, `tabular-nums` |
| filter chips with ▾ | Midnight, Tenor | `.btn.sm` row; `[aria-pressed]` |
| dense table, fixed row height | all three | `.table`, row height on `--cell`, sticky `thead` |
| sparkline per row | Morpho vaults (7d line), Tenor (bars by maturity) | `.spark` — inline SVG path, **63 B per row** |
| rate shown as a range | Midnight ("4.61% – 4.84%") | plain text, `tabular-nums` |
| period selector | shadcn "Interactive", Morpho "All/MAX", Tenor | `.seg` (exists) with `data-period` |
| card = title · description · chart · trend footer | shadcn | `.card.stack` with `.eyebrow` + `.d` |
| series tonal ramp | shadcn `--chart-1…5` | `--c1…c3` + `-s` tints (exists) |
| candlestick + volume | (implied by "price chart") | `candles.js` — 774 B |
| depth / order book | Tenor Offers tab | `depth.js` 466 B, or `.book` rows with CSS-width bars |
| LTV slider with liquidation mark | Tenor ticket | `input[type=range]` + `.meter` (exists) |
| bottom dock for positions | Midnight | `.dock` — fixed-bottom `.card` with `.tabs` |
| order ticket | Midnight, Tenor | `.field.big` + `.seg` + `.btn[data-p]` (exists) |

---

## 2. What charts cost

Everything built with the starter's own pipeline — Vite/Rollup, terser, `target: 'es2021'`, brotli q11.

| chart | brotli | notes |
| :-- | --: | :-- |
| sparkline (one polyline, sign-coloured) | **326 B** | `spark.js` |
| depth chart (two cumulative step-areas, mid line) | **466 B** | `depth.js` |
| candlesticks + volume + crosshair readout | **774 B** | `candles.js`: one `<path>` per colour, so 2,000 candles is five DOM nodes |
| whole market island: the three above + period switch + metrics | **1,429 B** | `market.js` |
| uPlot, one line series | 19,744 B + 605 B CSS | canvas; good at 100k points |
| lightweight-charts v5, candlestick only | 44,794 B | TradingView; series do **not** tree-shake |
| lightweight-charts v5, line only | 45,493 B | *larger* than candle-only: nothing is shaken |
| lightweight-charts v5, candle + volume + line + area | 47,505 B | the typical market page |
| React + Recharts, one area chart | 139,521 B | the shadcn stack |

The hand-rolled set is **31× smaller than lightweight-charts** for the market page and renders through the
same token system as the rest of the UI (`var(--ok-f)`, `var(--no-s)`), so it follows all four themes for free.
What it does not do: pan, zoom, drawing tools, log scale, dozens of series, live-tick repaint at 60 Hz. Those
are the TradingView-grade features, and §4.3 is the rule for when they are worth 44.8 KB.

---

## 3. What data costs — and the rule it forces

A price chart's data is routinely larger than its code. Measured on a synthetic random walk with realistic
precision (prices to 2 dp, volumes to 2 dp), gzip because that is what the edge serves:

| series | JSON objects | JSON arrays | columnar ints | **columnar Δ-ints** |
| :-- | --: | --: | --: | --: |
| 1H × 90 days (2,160 candles) | 43,158 | 38,523 | 29,340 | **18,808** |
| 1D × 1 year (365) | 7,604 | 6,760 | 4,047 | **3,344** |
| 1H × 1 day (24) | 566 | 469 | 352 | **313** |
| sparkline, 168 hourly closes | 482 | — | — | **368** |

"Columnar Δ-ints" is `{t0, dt, o:[…], h:[…], l:[…], c:[…], v:[…]}` with prices scaled to integers and each
column delta-encoded — **56% smaller than the JSON people actually ship**, and trivially decoded in a loop.
The μApp API should speak this shape.

Even so, 90 days at 1H is 18.8 KB — more than one flight on a warm connection (the 12,288 B chunk rule is
the same physics). So the period control does not select a period; **it selects a (period, resolution) pair,
sized so every payload is one flight**:

| period | resolution | candles | ≈ gzip |
| :-- | :-- | --: | --: |
| 1D | 5 min | 288 | 2.5 KB |
| 7D | 1H | 168 | 1.5 KB |
| 30D | 1H | 720 | 6.3 KB |
| 90D | 4H | 540 | 4.7 KB |
| All | 1D | ≤ 730 | ≤ 6.5 KB |

The chart draws any resolution the same way, so this costs nothing in code. Twenty sparklines for a markets
table are one request, not twenty: a single columnar payload of 20 × 24 closes is ~1 KB.

---

## 4. The μi design

### 4.1 Markets view

**P0 is the page, not a skeleton.** The document carries the totals strip, the filter chips, and the first
20 rows *with their sparklines*, rendered from a build-time or edge-time snapshot. Measured: **3,345 B
brotli (4,246 B gzip on Pages)** for the whole document including μi's CSS — 63 B per row with its sparkline.
First paint is the real table with real numbers; nothing waits for JavaScript.

| tier | carries | size |
| :-- | :-- | --: |
| P0 | shell, totals, chips, 20 rows + sparklines, sort/filter handlers | 3,345 B |
| on gesture | sort by column, filter chips (client-side over the snapshot) | ~600 B |
| on visible (below row 20) | the rest of the rows, one columnar fetch | ≤ 12 KB |
| on idle | refresh totals and sparklines from the live endpoint | ~1 KB |
| never | a table library, a chart library, a webfont | — |

CLS 0 by construction: every row is `height: 3rem` and every sparkline box is a fixed `6rem × 1.75rem`
`<svg viewBox>` — a refresh replaces path `d` attributes, never the boxes. Numbers are `tabular-nums` so a
refresh never changes a column's width. The `thead` is sticky. Rows that arrive later are appended *below the
fold*, which is a shift of zero by definition.

### 4.2 Market detail

**P0 is a finished detail page for the 1D period.** Header (pair, chain, fee tier or maturity), the metrics
strip, the period control, and three chart boxes — price, depth, secondary — each reserved with
`aspect-ratio` **and each already containing the 1D snapshot as a static SVG**, plus the static ticket.
Measured: **3,184 B brotli** with a real 24-candle chart, a 40-level depth chart and a 24-point secondary
chart inlined. The 1D chart is *content*, and it is cheaper to inline (≈ 400 B) than to fetch.

| tier | carries | size |
| :-- | :-- | --: |
| P0 | the page above, with the 1D period drawn | 3,184 B |
| on visible | `market.js` — adopts the three boxes, adds crosshair and readout, owns the period control | 1,429 B |
| on gesture (period) | one columnar payload for the chosen (period, resolution) | 1.5–6.5 KB |
| on hover (period button) | prefetch that period, so the switch is instant | same payload, earlier |
| on gesture (ticket) | the wallet island, as today | 764 B |

Period switching is a `replaceChildren` of the SVG inside the same `aspect-ratio` box: the box never changes
size, so the swap is CLS 0 at any data size. Hover-prefetch means the second period is usually already in
memory by the time it is clicked; on touch there is no hover, and the fetch is one flight.

The depth view has two renderings of the same payload — the curve (`depth.js`) and the **order-book rows**
Tenor uses (`.book`: APR · size · cumulative, with the bar as a background `linear-gradient` sized by
`--w` percentage). Both come from one `[[price, size], …]` array; the tab switches the rendering, not the data.

### 4.3 Chart primitives, and when a library is allowed

μi ships four chart primitives as islands, all SVG, all token-coloured, all under 1 KB: **spark**, **candles**
(with volume and crosshair), **depth**, and **area/line with gradient** (the shadcn look — `linearGradient`
from `--c1` to transparent, ~120 B over `spark`). Together with a bar-by-category variant for Tenor's
rate-by-maturity column, that is every chart in all three references.

**lightweight-charts is a declared exception, not a default.** It is justified when a view genuinely needs
pan/zoom, drawing, log scale, or many live series — a trading terminal, not a market page. When it is used:

- it is a **heavy island**: `data-on=visible` or behind an explicit "Advanced chart" control, never on
  gesture-less load, never preloaded;
- its box is reserved exactly like the light one, and the light SVG chart stays in the box until the library
  adopts it — so the page is already showing the chart while 44.8 KB arrives, and the swap is CLS 0;
- it is allowed to exceed the 12,288 B chunk rule under a declared `heavy:` entry in the island map, so the
  size gate reports it as a known exception instead of a failure;
- it must be the *only* heavy island in the view.

uPlot (19.7 KB) sits between the two and earns a place only for the one thing SVG is bad at: tens of
thousands of points repainting continuously.

### 4.4 Loading policy — "manageable"

The CLS 0 rule is unchanged. What changes is that a data portal has more things to load, so islands declare a
*class* rather than everyone being `pointerdown`:

| class | fires | used for |
| :-- | :-- | :-- |
| **P0** | in the document | the snapshot: table rows, the 1D charts, the ticket markup |
| **visible** | `IntersectionObserver`, 200 px margin | chart islands, rows below the fold |
| **gesture** | `pointerdown` / `click` | sort, filter, period switch, the wallet |
| **hover** | `pointerenter` on the control | prefetch the period that is about to be asked for |
| **idle** | `requestIdleCallback` after load | refresh the snapshot from the live endpoint |
| **heavy** | visible or explicit, declared | the one library island a view is allowed |

Every class adopts into reserved markup. The loader stays an explicit map; the classes are a `data-on` value
plus one `data-heavy` attribute, so `p0.js` grows by roughly 150 B.

### 4.5 Budgets for the two views

| | markets list | market detail |
| :-- | --: | --: |
| P0 document | 3,345 B | 3,184 B |
| first interaction | ~600 B (sort/filter) | 1,429 B (market island) |
| first data fetch | ≤ 12 KB (rows 21+) | 1.5–6.5 KB (one period) |
| all periods cached | — | ≈ 21 KB total, fetched one at a time |
| heavy island, if declared | — | 44.8 KB, visible-only |

Against the references: Midnight's markets list is 2.64 MB to first interaction; this one is 3.9 KB.

### 4.6 Recipes to add to μi

`.table` (dense, `--cell` row height, sticky head) · `.spark` · `.chart` boxes with `aspect-ratio` tokens
(`--ar-price: 1000/320`, `--ar-depth: 1000/200`, `--ar-secondary: 1000/120`) · `.metrics` · `.book` rows ·
`.dock` · `.chip` as an alias of `.btn.sm[aria-pressed]`. All CSS; measured marginal cost of CSS inside the
document is ~19% of raw, so the whole set is ≈ 300 B.

---

## 5. What this rules out

- **Recharts / any React charting.** 139.5 KB for one chart. The pattern is worth taking; the stack is not.
- **lightweight-charts as the default chart.** 44.8 KB that does not shake, for interactions a market page does
  not have. Declared heavy island only.
- **JSON objects on the wire.** 56% more bytes than columnar Δ-ints for the same series.
- **Fetching 90 days at 1H.** 18.8 KB even when encoded well; the (period, resolution) pairing is the fix.
- **Webfonts.** The references spend 350 KB and need metric-matched fallbacks to stay at CLS 0; μi's system
  stack costs nothing and cannot shift.
- **A detail *page* for order-book markets.** Midnight's bottom dock — row click fills a ticket, URL unchanged —
  is the better pattern for a list-plus-ticket flow, and it is cheaper: one P0, no navigation.
- **Skeleton rows.** A skeleton is a promise of content; a snapshot *is* content, and it is 63 B a row.

---

## 6. Next step

Build the two views as the second μApp in `decoupleco/uApp` — `markets/` — with the four chart primitives as
islands, a columnar mock API, and the loading classes above. Two gates earn their keep immediately: the size
gate on the P0 documents (both predicted under 3.4 KB), and the layout gate across a period switch and a
row-refresh, which is exactly the kind of interaction that produced Tenor's 0.177.

---

## Appendix — method and caveats

- **Reference footprints**: Chrome, cold profile, Resource Timing after 5–6 s idle; transfer sizes as the
  browser reports them; CLS from a buffered `layout-shift` observer. One load each, one location, one day.
  Tenor's CLS was measured once at 0.177; the shift is during data hydration and would need a second run to
  characterise, but a single 0.177 is already above the threshold.
- **Chart and stack sizes**: built with the starter's exact pipeline (Vite 7 / Rollup, terser 3 passes with
  `ecma: 2020`, `target: 'es2021'`, `compact`), brotli q11 w24. lightweight-charts 5.2.1, uPlot 1.6.32, Recharts
  with React 19.
- **Data sizes**: synthetic random-walk OHLCV with 2-dp prices; real series with wider spreads will compress a
  little worse in every format equally. gzip level 9 quoted because GitHub Pages serves gzip only.
- **P0 page sizes**: generated markup with the shipping `p0.css`, 20 rows of plausible tokens and figures, and
  the hand-rolled SVG for the 1D charts. A real page with longer names and more columns will grow by tens of
  bytes a row, not hundreds.
- The shadcn gallery renders its examples client-side in a way the DOM probe could not enumerate; the variant
  list comes from the gallery's own tabs and from the component documentation, and the stack cost was measured
  by building the documented example.
