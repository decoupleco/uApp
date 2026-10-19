# Blocks — twenty review rounds to the top ten

*2026-10-17. The convergence log behind `/design/blocks/`. Each round applies one lens to the candidate list,
records what it changed, and hands the list to the next. The lens is the feedback; the edit is the review.*

## Baseline — what exists today

**Deployed** (`decouple.co/design`): the philosophy page with the vocabulary, seven rules and tiering cards; the
recipe gallery in four themes (Foundations · Base · Sharp · CL manager · Matte); the paper; the μApp demo. The
gallery already contains working versions of: card, panel, pill, button (primary / secondary / intent /
ghost), field (incl. big amount field), segmented control, tabs, breadcrumbs, list rows, token-icon stack,
vertical timeline, meter, skeleton, dialog, popover menu, tooltip, toast, a CL position manager composition
(range, tick histogram, fee tier), markets/pools/positions tables in the Sharp section, and the Matte overlay.

**Project folder** (`design/`): the starter (P0 + islands + gates), `reference/p0`, `reference/charts`
(sparkline 326 B · depth 466 B · candles 774 B · market island 1,429 B), the whitepaper, and
`research-data-portals.md` with the pattern inventory from shadcn, Morpho Midnight and Tenor.

**Portfolio** (`~/workspace`):

| product | what it is | views it needs |
| :-- | :-- | :-- |
| **peg-markets / PegCore** | immutable peg lending + MA-LP swap core: ERC-6909 ledger, isolated markets, virtual LP depth, epoch settlement, bounded liquidation | lending-market index, market detail with LP depth, position (collateral/debt) management, LP add/remove, swap, epoch and liquidation status |
| **pairs-pro** | trading surface on `pairs.pro` (SvelteKit 5 + Tailwind 4), collect-and-swap contracts, backtest reports | pair/market index, price and performance charts, positions and PnL, order ticket, report views |
| **mezo-swap** | routed swaps across Tigris (Solidly v2) and Uniswap v3 on Mezo; `min-ui` is the CL position manager | swap ticket with route, pool index, CL position manager (range + ticks), portfolio positions |
| **superliquid** | B2B credit and yield: Morpho market curation, options vaults, fixed-term financing on Midnight/Iris | market and vault index, fixed-term offers by maturity, borrower origination ticket, operator dashboard (exposure, health, activity) |

**Starting candidates (22):** markets table · totals strip · filter toolbar · sparkline · market header ·
price/rate chart card · depth curve · tick histogram · order book · ticket (swap) · ticket (lend/borrow) ·
ticket (liquidity) · route display · position card · health/LTV meter · range selector · maturity picker ·
period control · transaction timeline · activity table · wallet connect · bottom dock · empty/error states ·
portfolio summary.

---

## The rounds

**R1 — portfolio coverage.** Score each candidate by how many of the four products need it. All four:
markets table, totals strip, market header, price/rate chart, ticket, position card, wallet connect,
activity. Three: depth (PegCore virtual depth, mezo ticks, superliquid order book), range/maturity selection,
period control, timeline. Two: sparkline (pairs, superliquid), route display (mezo, pairs), bottom dock
(superliquid, PegCore). → Nothing cut yet; the scores drive later rounds.

**R2 — reuse count within a product.** A block that appears on three screens of one product outranks one
that appears once on four. Ticket appears on every manage screen; metrics strip on every view; period control
on every chart. Route display appears once. → *Route display* demoted to a ticket variant.

**R3 — P0 fit.** Can the block be a finished snapshot in the first flight? Table, strip, header, chart (as
static SVG), position card, timeline, activity — yes, all measured under 3.4 KB for a whole page. Wallet
connect — the button is static, the state is not. Order book — yes as rows. → No cuts; confirms the
snapshot-first design for every block.

**R4 — CLS 0 feasibility.** Which blocks have an intrinsic size? Chart boxes (aspect-ratio), table rows
(`--cell`), meters, pills: fixed. Risky: toast, dialog, bottom dock (it changes the page height when it opens),
and route display (variable rows). → *Bottom dock* must reserve its height or be an overlay; noted as a
constraint, not cut. Toast/dialog are already in the gallery and are overlays by nature.

**R5 — one data shape per block.** Does a single payload serve all four products? Markets table: yes if the
row is `{id, pair, chain, kind, tvl, vol, fee, rate|apr, spark}` — lending markets are pools with a rate
column. Depth: `[[price|rate, size]…]` serves ticks, virtual depth *and* an order book. Chart: columnar
OHLCV or `{t, v}`. Position: `{collateral, debt, health|range, pnl}`. → *Order book* and *depth curve* and
*tick histogram* merge into one block, **Depth**, with three renderings of one payload.

**R6 — mobile.** Which blocks have a phone form? Table → card list. Ticket → full width, stays. Chart → aspect
holds. Metrics strip → 2×2. Range selector → stacked. Bottom dock → becomes a sheet. Order book rows → fine.
Side-by-side depth + chart → stacked. → Every block needs one mobile variant on the page; *bottom dock* is the
mobile form of ticket + positions and stops being its own block.

**R7 — theme and density.** Base for human views (superliquid partner views, PegCore position pages), Sharp for
dense markets (pairs-pro, mezo). Blocks must read in both. Tables and metrics are where density matters most;
tickets and timelines barely change. → No cut; the page shows every variant in the viewer's chosen theme.

**R8 — accessibility.** Keyboard: segmented controls and tabs (exist, `aria-pressed`/`aria-selected`);
sliders need `input[type=range]` not a custom drag; sortable headers need `aria-sort`; the meter needs
`role=meter`. → *Range selector* variants must be built on native range inputs; the custom dual-handle drag
from min-ui is a variant, not the default.

**R9 — view vs manage balance.** Count: view blocks 8 (table, strip, header, chart, depth, sparkline,
activity, portfolio summary), manage blocks 6 (three tickets, position card, range, maturity), plumbing 2
(wallet, dock). The portfolio's "manage" need is as large as "view". → *Portfolio summary* merges into
**Metrics strip** (it is the strip with a wallet filter); the three tickets become one block, **Ticket**,
with intent variants — swap, lend/borrow, add/remove liquidity are the same form with different field sets.

**R10 — overlap.** Sparkline is a cell of the markets table and a variant of the chart. Period control is a
control inside the chart card. Maturity picker and range selector are both "choose a span": price span for
CL, time span for fixed-term. → *Sparkline* and *period control* fold into their parents. *Range selector* and
*maturity picker* merge into **Span selector** (price range · term · period), one block, three variants.

**R11 — primitive or composition?** A block on this page should be a composition people place whole, not a
primitive they style. Pill, button, field are primitives (already in the gallery). Market header is a
composition (icons + name + chain + status). Health meter is a primitive inside the position card. → *Health /
LTV meter* folds into **Position card**; *filter toolbar* stays — it is a composition (chips + sort + search).

**R12 — chain-agnostic.** Mezo, Base, Ethereum, and PegCore's own chain. Anything that hard-codes a chain's
look fails. Chain is a pill or a small icon in the header and the table, never a theme. → No cut; the header
block gets a chain pill in every variant.

**R13 — where can a block mislead?** Rates shown without their basis (APR vs APY, fixed vs variable, borrow
vs lend); ranges without the current price; depth without the mid; slippage hidden in a disclosure. These are
financial-correctness surfaces and they decide variants: a rate always carries its kind, a range always shows
the spot, a depth always marks the mid. → Constraints recorded on **Markets table**, **Span selector**,
**Depth**, **Ticket**.

**R14 — cost of choosing the wrong variant.** Where does the choice matter most? Markets table (every product,
every day), ticket (money moves through it), position card (risk is read from it). Where does it matter
least? Activity table, wallet button. → Ranking input: the first three get five variants, the rest three or
four.

**R15 — a shared vocabulary of danger.** PegCore liquidation, CL out-of-range, superliquid health, pairs-pro
drawdown: four products, one idea — "how close to the edge". The position card's meter must use one scale and
one colour rule (`--ok` safe, `--wa` near, `--no` at risk) everywhere. → Constraint on **Position card**; it
is why the card outranks a generic "portfolio" block.

**R16 — time axes.** Periods (1D…All), maturities (Oct 30 · in 13 days), epochs (PegCore settlement), and
transaction stages (initiated → proved → finalised). Two blocks own time: **Span selector** for choosing, and
**Timeline** for showing progress. Epochs are a timeline variant. → *Activity table* merges into **Timeline /
activity**: the same events, as steps or as rows.

**R17 — numbers.** One rule, owned by no block and obeyed by all: `tabular-nums`, four significant figures,
unit after the number, USD in `.d` under the token amount, deltas signed and coloured by intent. → Written
into the page's shared CSS, not a block.

**R18 — empty, loading, error.** Which blocks need states? Table (no results / loading rows), chart (no data),
ticket (insufficient balance / wrong network / pending), position card (no positions), wallet (disconnected /
wrong chain). → Not a block; each of those five blocks shows its states inside its variants.

**R19 — naming.** Names must survive DEX and lending: "Markets" (not pools, not vaults), "Market header",
"Depth" (not order book, not ticks), "Ticket" (not swap box), "Position", "Span", "Timeline", "Metrics",
"Filters", "Wallet". → Final names fixed.

**R20 — final ranking.** coverage × reuse × decision-value:

| # | block | products | variants |
| --: | :-- | :-- | --: |
| 1 | **Markets table** | all four | 5 |
| 2 | **Ticket** (swap · lend/borrow · liquidity) | all four | 5 |
| 3 | **Position card** (health · range · PnL) | all four | 5 |
| 4 | **Metrics strip** | all four | 4 |
| 5 | **Market header** | all four | 4 |
| 6 | **Chart card** (price · rate · performance) | all four | 4 |
| 7 | **Depth** (curve · ticks · order book) | PegCore, mezo, superliquid | 3 |
| 8 | **Span selector** (price range · term · period) | mezo, superliquid, pairs | 3 |
| 9 | **Timeline / activity** | all four | 4 |
| 10 | **Wallet & network** | all four | 3 |
| — | Filter toolbar | — | folded into Markets table variants |

Cut or merged along the way: sparkline → table cell / chart variant; period control → chart card; route
display → ticket variant; health meter → position card; order book, tick histogram → Depth; maturity picker,
range selector → Span; activity table → Timeline; portfolio summary → Metrics strip; bottom dock → the
mobile form of Ticket + Position; empty/error states → inside each block; number rules → shared CSS.

---

## The review loop

`/design/blocks/` shows the ten blocks, each variant rendered live in the viewer's theme. For every block the
agent's own pick is marked with a one-line reason. A reviewer marks the variant they prefer, writes what to
change, and **Copy review** puts the whole set on the clipboard as JSON. Paste it back into the session; the
next round replaces the losing variants with new ones built from the notes, and the page is republished.
Choices persist in the browser, so a review can be finished across several visits.

---

## Review round 1 → round 2 (2026-10-19)

**Human review, round 1** (three blocks reviewed; seven untouched):

- *Markets table* — combine B and C; the column is **Network**, not Chain; lending rows need borrow rate, lend
  rate and loan / collateral / LLTV; AMM rows need fee and tick spacing; network as an SVG glyph to save width.
- *Position card* — the borrow rate must be on the card; the health bar and the liquidity bar need one
  information architecture (try bar-on-top and bar-at-bottom); "Fees earned" and "Accrued" need one semantics;
  the fixed-lend card follows the same design; the compact rows must align; the two header labels
  (Fixed · 30 Oct / Due in 13 d) stack vertically to free header width.
- *Chart card* — values on hover, not as a permanent readout; one period set, right-aligned; add a variant
  with the CL allocation band under a show-range toggle and a type switch (1H · 1D · line); the rate chart
  shows mid, lend and borrow.
- *Theme* — base/quote chips read better in dark than light.
- *Tooling* — Copy review produced nothing.

**Changes in round 2:**

- Markets: one row skeleton for both kinds — identity (pair + loan/collateral/LLTV or fee/ts) · network glyph ·
  two two-line amounts · two rates with their kind · sparkline. Variants A (lending) and B (AMM) carry the
  toolbar; dense, grouped and mobile forms keep the glyph.
- Position: one skeleton — header with stacked labels · bar with three labels (edge · you · edge) · three rows
  (size · rate · earned) · actions. A/B differ only in bar position; C (CL) and D (fixed lend) are the same
  skeleton with range and term bars; E is a grid so rows align.
- Chart: readout only on hover with a crosshair; `1D · 7D · 30D · All` right-aligned on every card; C is
  lend · mid · borrow; E is price with the position's range as a band, a show-range switch and 1H · 1D · line.
- Light chips brought up to the dark pair's chroma (`--tb #a9c8ff`, `--tq #a3e6c0`); gate still 5.10 worst.
- Copy review now opens a panel with the text selected and attempts the clipboard; nothing is lost if the
  clipboard is blocked.

---

## Agent review rounds against the goals (2026-10-19)

Four rounds, each a different lens, each applied before the next reviewer reads the page.

### Round 1 — design-language conformance (Rule 4, one primary, rates carry kind, numbers, Base/Sharp, naming)

Ten findings, all applied:
1. **Sign bug.** `metric()` tested for ASCII `-`; the data used the typographic minus, so `−4.8% 24h` rendered as an *up* delta. Now `/^[-−]/`.
2. Rates without a kind in the cell (dense table lend/borrow, maturity list, order book) — the kind is now in every cell; order-book captions read "lend rate · size · cumulative".
3. "APR" / "Rate" where lending needs "Borrow rate" / "Lend rate" (ticket, dense headers).
4. Inline looks that would fight Sharp (sticky header, wallet pills, maturity rows, legend swatches) → recipes: `.panel`, `.pill.acct`, `.pickrow`, `.legend i{--k}`.
5. The CL band was a `<rect>` Sharp's stroke-only rule could not strip → a `<path>`.
6. `--ac` used as data ink (tick histogram "other" bars, rate-band stroke/fill) → `--c1` and `--n2`.
7. Sparklines were `aria-hidden` and colour-only → `role=img aria-label="7d up|down"` with a `<title>`.
8. "Chain" survived in header copy and variants → network glyph with its name (`.net-lbl`).
9. Position A/B folded accrued interest into the rate row → three rows (debt · borrow rate · earned), earned signed.
10. Figures without `.num`; `thead` only right-aligned four header words; vocabulary drift (Vol/Volume, Fee/Network fee, Pools/Markets, LP/Liquidity) → one spelling each.

Confirmed conforming and protected: one `[data-p]` per ticket variant, none on Connect; `--tb/--tq` only inside `.tk i`; zero colour literals in the page CSS; glyphs labelled; system stack only.

### Round 2 — information architecture and portfolio fit

Ten findings; nine applied, one declined:
1. A borrower cannot "earn" −$89 → the third row is **Accrued** on every card (signed: + owed to you, − owed by you), and the compact row's money column is that same figure.
2. The order book's "lend rate" meant the opposite of the table's "Lend rate" → halves named by the taker: "Offers to lend — **borrow at**" / "Offers to borrow — **lend at**".
3. The health bar's labels were you · you · edge and its fill ignored the liquidation edge → `0% · LTV 61% · health 1.41 · liquidation 86%`, fill 61/86, the middle label at body colour (`.you`). **Declined:** making the first action `[data-p]` — one primary per *view* means a list of cards cannot each carry one.
4. Lend rate now carries the term like the borrow rate; "Lent" is the one word for the side; `kind()` lowercases the kind, not the date.
5. One pair order everywhere: collateral / loan; the header's identity line carries collateral · loan · LLTV instead of a bare pill.
6. AMM row rebuilt on the skeleton: fees under volume, fee APR · 7d, vol / TVL · 24h as the second rate.
7. Maturity list names its side (borrow) and its columns; "Matures 30 Oct 2026" with an uncoloured countdown.
8. Two-line cells right-aligned (`td.num`) so columns compare downward.
9. Phone forms declared: compact rows collapse to two lines under 48 rem; 2×2 grids below 60 rem.
10. Time words follow the pressed control (30D ↔ "30 days"; "1H candles · 1D candles · line"; deltas say 24h; timeline rows carry a countdown).

Protected: the ticket's native LTV range with 0% · liquidation 86%; "You receive" vs "Min. received"; the markets identity line; range and term bars; hover-only readouts.

### Round 3 — accessibility and interaction

Ten findings, all applied:
1. Chart readouts were pointer-only → chart boxes are focusable groups; ← → Home End move the crosshair; the readout is `aria-live`; blur resets like pointer-leave.
2. `touch-action:none` on five full-width chart boxes would swallow vertical swipes → `pan-y`.
3. Meters announced the fill percentage, unnamed → `role=meter` with a name and `aria-valuetext` carrying the drawn value ("61%, liquidation at 86%, health 1.41"; "13 days left, matures 30 Oct").
4. Unlabelled inputs (search, amount, the two price sliders, the review textarea) → `aria-label` / `aria-labelledby`.
5. Eight anonymous `role=group` segmented controls → named (Period · Chart type · Fee tier).
6. `.field:focus-visible{outline:none}` left a focused field in Sharp looking like any other hairline box → the base focus ring shows through (shared recipe, so the design page benefits too).
7. Variants had no accessible name and sample `<h2>`s polluted the outline → `aria-label="A · name"` on every article, sample headings at `aria-level=4`.
8. Pressed states never changed on `.pickrow`, preset chips and network buttons; tabs had no arrow keys → delegate widened; ← → move between tabs and segments.
9. Closing the review panel dropped focus to `<body>`; Escape did nothing; TOC "decided" was colour-only → focus returns to Copy, Escape closes, the link's label says "— decided".
10. Horizontal table scrollers were not keyboard-scrollable; three unnamed `<nav>`s → `tabindex=0`; Site · Blocks · Breadcrumb.

Protected: reduced-motion kill switch; unique ids; `rangeBar` decorative with values in text; every switch and radio inside a label; hit areas ≥ 31 px; the 16 px network glyph is never a control.

### Round 4 — budget, CLS discipline and copy

Twelve findings, all applied:
1. The chart readout could wrap when an OHLC line outgrew its placeholder — a hover-induced layout shift, and pointer moves get no CLS grace window → `.readout` is one line (`min-height:1lh`, `nowrap`, ellipsis) and takes the free width of its row. Measured: hovering every chart, toggling every segment and the show-range switch move nothing; the only rect change on the page is the theme switch itself.
2. Sharp drew a hairline on buttons, pills and segments that Base did not reserve → Base controls carry a transparent 1 px border; Sharp only sets `border-color`. Both theme sources (`preview.html`, `p0.css`). The remaining height difference between Base and Sharp is Sharp's denser type (14 px / 1.45 against 17 px / 1.6), which is the point of the theme.
3. Keyboard crosshair was invisible because the copied chart CSS only shows it on `:hover` → `.chartbox .xh{opacity:1}`; the keyboard path now reads like the pointer path.
4. `.btn[aria-pressed=true]` had no rule, so the round-3 pressed-state delegate changed nothing visible → tinted with `--ac-s` and an inset `--ac-b` ring.
5. Gallery rules lifted into the page with no matching class (70 rules, 5.3 KB raw) → `comp` and `chart` layers are pruned against the rendered body at build; `@media` blocks and class-less rules are kept.
6. Three rule sets duplicated from the gallery (`.seg…`, `.spark path`, `input[type=range]`) → removed from `@layer blocks`.
7. Two independent 48-candle histories for chart A and chart E → one `OHLC`, and `data-hover` numbers are rounded at build (JSON 8.0 KB → 5.9 KB).
8. Forty-odd inline layout styles → classes (`narrow`, `tight`, `loose`, `start`, `baseline`, `num.lg`, `spark.wide`, chart `aspect-ratio` on `.chartbox`); only data-driven values (meter widths, band positions, `--k`, `--w`) stay inline.
9. Dollar formats disagreed between rows, cards and the readout → one `usd()` (B 2 dp, M and k 1 dp) and `tok()` for token amounts on the same thresholds; the readout uses locale grouping.
10. OHLC readout was a raw tuple (`O 2431.5  H …`) → `O 2,431.50 · H … · V 898.4 WETH`, lines joined with `·` like the rest of the page.
11. Time-left came in three forms and two sums were wrong → `6 d 4 h`, `13 d`, `in 13 d`; `0.0088 WETH + 9.81 USDC`; ticket C `max 39,475 USDC`, `$65,116`.
12. Notes opened with "Round 2:" / "Round 1 asked", three claims the markup did not deliver, and names mixed `:` / `+` / `→` → notes describe the variant; "Earned" became accrued; the phone card list really spans its sparkline (`preserveAspectRatio=none`); breadcrumbs use `/`; every name is `Name — qualifier`; `three costumes` → `three forms`; the changelog paragraph in the intro is gone.

Result: `blocks.html` 146.9 → 137.7 KB raw, 28.8 → 25.5 KB brotli; contrast gate 88 pairs ≥ 4.5:1 across both sources, worst 5.10.
