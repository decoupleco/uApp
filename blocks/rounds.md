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
