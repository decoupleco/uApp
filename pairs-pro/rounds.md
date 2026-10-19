# Pairs.pro wireframe — review log

The sheet is rendered by `pairs-pro.js` → `pairs-pro.html` (published at /design/pairs-pro/) and printed to
`pairs-pro/docs/refresh-wireframe.pdf` with `bun ./pairs-pro.js --pdf`. Frames carry ids `W-01 … W-24`; the
STE user-story spec (`pairs-pro/docs/refresh-user-stories.md`) cites them. A review round is an edit to
`FRAMES`, a rebuild, a reprint, and a dated entry below.

## Baseline (2026-10-19)

- **What it replaces.** pairs.pro today: SvelteKit 2 + Tailwind 4 + lightweight-charts, ~651 KB JS over 54
  files, four static tab labels, no Advance / Config, Performance and bands hidden from guests, a shareholder
  with no role treated as a guest, `alert()` errors.
- **Brief.** Pools market view; pool view with price (1H · 1D · line), depth, period 7D · 30D · All, show-range
  default on; depth with ticks, allocation, current tick and a hover pane; performance with Shares · TVL;
  Advance tables with settings a manager or admin can edit (Save → KeyDB through the signed gateway route);
  strategy bands backfilled over the whole history from the current config, labelled projected.
- **Format reference.** The PEG.markets wireframe sheet: phone frames side by side with a tiny caption, a wide
  responsive frame, flat outline.
- **Shape references, not templates.** Charm Alpha Vault "Vault Strategy" (base + limit bands stepping over
  time with an update-price line) and "Liquidity Distribution".
- **Design language.** μi Sharp outline: transparent cards, outlined controls, one `[data-p]` per frame, stroke-only
  chart fills, system fonts, contrast ≥ 4.5:1, CLS 0.

## Frames

| id | group | caption · route | primary |
| --- | --- | --- | --- |
| W-01 | guest | Pools · `/` | — |
| W-02 | guest | Pools · Watch pool · `/` | Watch pool |
| W-03 | guest | Pool · Overview | — |
| W-04 | guest | Pool · Price · 7D | — |
| W-05 | guest | Pool · Price · All (backfilled vs deployed) | — |
| W-06 | guest | Pool · Liquidity · depth | — |
| W-07 | guest | Pool · Advance (read-only) | — |
| W-11 | guest | Pool · Performance | — |
| W-23 | guest · wide | Pools · responsive | — |
| W-08 | user | Pool · Overview | Deposit |
| W-09 | user | Pool · Deposit | Deposit |
| W-10 | user | Pool · Redeem · queued exit | Request redeem |
| W-12 | user | Account · `/me` | — |
| W-24 | user · wide | Pool view · responsive | Deposit |
| W-13 | manager | Pool · Overview · Manage menu | Deposit |
| W-14 | manager | Manage · Allocate (review step) | Allocate |
| W-15 | manager · admin | Manage · Config editor | Save |
| W-16 | manager · admin | Manage · Config saved | — |
| W-17 | admin | Pool · Initialize (no vault) | Initialize pool |
| W-18 | admin | Admin · `/admin` | Grant |
| W-19 | states | Connect · wrong network | — |
| W-20 | states | Stale data | — |
| W-21 | states | Gateway down · RPC-only | Deposit |
| W-22 | states | Transaction states | — |

## Measurements (round 3, 2026-10-19)

| Check | Result |
| --- | --- |
| `pairs-pro.html` | raw 151,601 B · brotli 23,484 B (blocks.html: 137,781 / 25,445 — raw is over because every price chart carries its band rows for the readout; compressed stays under) |
| Shared helpers | `lib/ui.js` extracted from blocks.js; `blocks.html` byte-identical before the nav link, one hunk after |
| Primary actions | ≤ 1 `[data-p]` per frame, asserted at build |
| Contrast gate | 88 pairs ≥ 4.5:1 across both theme sources, worst 5.10 |
| Colour literals | identical set to blocks.html (all lifted from preview.html) |
| First visit theme | `data-t=sharp`; toggle round-trips base → dark → sharp and persists in `localStorage.mui` |
| Readouts | hover and ← → on every `.chartbox` (OHLC + EMA + bands + source, depth with share of total, series); crosshair visible on keyboard; phone readouts are three fixed lines, none clipped |
| Show range | hides all 10 `.band` elements of the All chart and restores them |
| Layout shift | 0 layout-shift entries; 0 rects moved across hover, every segment, tab, pressed button and band switch; no element overflows its frame |
| Fixed copy | every §12.2 string of the spec that a frame must carry is present verbatim; no "Withdraw" left (the exit is "Redeem" on every family) |
| PDF | `refresh-wireframe.pdf`, 8 pages: intro + guest, guest overflow, W-23, user, W-24, manager, admin, states |

## Round 1 → 2 (2026-10-19, build fixes before review)

- Intro and the guest group share page 1 (`.intro + section.role` keeps the first group on the intro page).
- Bands were drawn ±6 % / +12 % and flattened the candles to a tenth of the chart; now ±1 % / +1.5 % for 1H
  and ±5 % / +7.5 % for 1D, so candles span about a quarter of the height under the bands.
- Readout samples shortened to one phone line (`O 2,449.2 H … V 591`; `tick 201,540 · 2,431.5 · 100.0M · in limit`).
- The wide pool view kept its two columns in print (`.frame.wide .grid-31` set in the page layer, outside the
  gallery's media rule); the header metrics run four across.
- Phone chart boxes are taller (1000/360 price, 1000/320 depth, 1000/300 performance).

## Round 2 → 3 (2026-10-19, cross-review against the spec)

A read-only agent compared the 24 frames with `refresh-user-stories.md` (106 stories) and returned 78
findings: 49 frame fixes, 14 spec fixes, 15 judgement calls. Decisions taken for the calls: Connect stays a
secondary button (the spec follows the frame); performance stays in the Overview tab with its fee
histogram; the exit action is "Redeem" on every family; the line chart type ships (DEC-11 now follows the
brief); the legend keeps "base band · limit band · EMA · update price · current" and the note carries
"projected"; the typed confirmation for ownership transfer is the last six characters of the address.

Frame changes applied:
- Wording: "Withdraw" → "Redeem" everywhere; "Active LP" → "Active"; "Show advance" → "Show Advance";
  "Switch network" → "Switch to Base"; "Gateway unreachable" → "Gateway unavailable. Live values only.";
  "Price history unavailable" → "History unavailable"; "enabled" → "Enabled"; "Fees" table → "Rewards";
  "solid = deployed by the keeper" → "solid = run by the keeper"; the admin pill reads "admin", not "owner".
- Fixed copy added: "Owner only", "Ranges are not managed.", "unknown", the refusal reasons on Save, the
  sibling failure panels on W-21, "Connect wallet to see your positions." on W-12.
- Data and labels: header gains `lag`, strategy copy control and token addresses; `/me` value per share is
  observed, the position is VeloV3 so emissions carry a value, a Roles table and a History control are added;
  Advance gains the decision's config hash, `pricePerShare`, "Saved at" with a time, and every config row;
  the editor shows signer · hash · saved at above the form, all 19 editable parameters and the three read-only
  ones; after-save shows "waiting for the keeper · last intent mined"; deposit lists exact approvals; redeem
  shows the preview block and a four-state queue (Requested · Pending · Settled · Claimed) with Cancel;
  admin roles carry granted and confirmation blocks, the signed-action log is drawn, ownership transfer warns
  "You lose admin access after this transaction."; W-17 reads "Two transactions in order: create, then
  setReferenceFee."; the no-vault header shows Position "unavailable"; the stale frame reads "stale", not "—";
  W-24's fee row is the vault's, labelled so; placeholders no longer reuse one hash for three things.
- Charts: the price readout carries EMA, base and limit bounds and the source (keeper · projected) from a
  per-row band payload; depth flags are base · limit · none with share of total; the depth axis reads prices.
- Group texts: guest includes a wallet with no role and no shares; manager explains the admin-with-role-0 case.
- Phone frames: table cells may wrap, readouts are three fixed lines, so nothing overflows a frame.

## Round 3 → 4 (2026-10-19, human review of the sheet)

Feedback: Pairs.pro on a white background; chart type as a menu with the period right-aligned; the Advance view
simplified into logical groups (anchor, range, weight, exposure) with a settings UI like a mobile app;
allocation ranges summarised as base (low–high) and limit (low–high), prices by default, a click toggles ticks;
config in its own tab; one weight slider for the base · limit ratio; sliders for base and limit ATR (1–15),
chase, target ratio and tolerance; slippage control as a toggle; the less useful settings hidden.

Applied:
- Frames render on `--n0` (white in the light themes); the intro says so.
- Price card: the type is a menu ("1H candles · 1D candles · Line") with the show-range switch beside it; the
  period segment (7D · 30D · All) sits at the right of the same row.
- Advance is a panel with three tabs: Allocation, Shares & rewards, Settings (Config for a manager or admin).
  Allocation shows the base and limit ranges as prices with their bars and the current price; a click on any
  range swaps every range in the card to ticks and back (`.unit`, `data-price` / `data-tick`). The rebalance
  line, config hash and the positions table follow. W-24 shows the Shares & rewards tab.
- Config editor (W-15) in four groups — Anchor (anchor pool menu, interval menu, day and hour EMA), Range
  (base ATR and limit ATR sliders 1–15, chase slider, offset segment), Weight (one slider, 80 % · 20 %),
  Exposure (target base ratio and tolerance sliders, reduce logic segment, slippage control and enabled
  toggles) — with an "Advanced · 6 settings" disclosure for offsetMultiplier, offsetInitialStrength, the offset
  EMAs, refresh interval and plotDetails, plus the read-only rows. Preview and Save stay at the end.
- W-16 and the guest Settings tab show the same four groups as read-only rows. W-14 uses the same range rows.
- Spec revision 3: G-20, G-21 (menu), G-50, G-51 (tabs, price ⇄ tick toggle), §7, §8.1, new §9.0 editor layout.
- Print: the wide pool view keeps two columns (the screen collapse rule is scoped to `screen`); tab labels stay
  on one line in phone frames.
