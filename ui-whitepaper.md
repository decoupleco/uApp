# μi — Micro User Interface

**A minimum, measured design language for Decouple's on-chain surfaces.**
*v2 · September 2026 · supersedes the μi/Matte Glass litepaper and the Grok draft*

---

## Thesis

> A DeFi interface is a settlement instrument. Every millisecond between "user decides" and "pixels confirm" is spread the user pays and volume the protocol loses.

μi is the smallest design language that lets one engineer ship a complete, four-theme, accessible trading surface **in one network round trip**, then grow it without ever paying a framework tax on first paint.

Everything in this paper is either **measured** (a number we produced and can reproduce from `reference/p0/`) or **a target** (a budget we chose, with the physics that justifies it). Nothing here is a projected revenue or migration figure. The earlier draft carried several of those; they are gone, because a design language that starts by inventing its own evidence cannot ask a CI gate to be honest.

---

## 1. Three layers, one system

| Layer | Name | What it is | Costs bytes? |
| :-- | :-- | :-- | :-- |
| **System** | **μi** | Tokens, four themes, component recipes, the accessibility contract | Yes — this is the product |
| **Overlay** | **Matte Glass** | Optional `.matte` class: conditional blur + static noise | Only where applied |
| **Delivery** | **μApp** | How it ships: one document, one round trip, islands after | Budget, not bytes |

μi is the noun. Matte Glass is an adjective you apply to it. A μApp is how you ship it. A μi surface with no `.matte` container is fully compliant; Rules 1–2 simply do not engage.

**Lineage, for the record:** 2017 media pages at 48 ms first paint on 3G, a 2021 2.1 KB Vue swap on Uniswap v2, and the 2025 Matte Glass work. The invariants survived every iteration: no code beats any code, intent beats visuals, CLS is zero, measure everything.

---

## 2. The budget, from physics

The first flight of a cold connection is what paints. Everything else is a second round trip.

```
QUIC initial congestion window       ≈ 12,000 B   (10 × ~1,200 B datagrams)
− TLS certificate chain, cold          ≈ 3,000 B   (2.7–3.7 KB DER on real edges)
= application bytes in flight 1        ≈ 9,000 B
0-RTT resumption (returning visitor)   = 12,000 B  (no cert on the wire)
```

**Measured 2026-09-15, on the edge we actually ship to.** The derivation above is arithmetic; this is a
test of it. A ladder of incompressible files was published to GitHub Pages and fetched over cold connections
(9–11 per size, medians below), watching the *download phase* — `time_total − time_starttransfer`. If a
response fits in the flight that carried its first byte, that phase is ~0; if a second flight is needed, it
costs a full round trip.

```
   8,192 B   download 0.2 ms    one flight          RTT ≈ 49 ms throughout
   8,960 B   download 0.7 ms    one flight          TCP + TLS 1.3 + HTTP/2 (Pages serves no h3)
   9,216 B   download 0.3 ms    one flight   ← our budget
   9,472 B   download 1.2 ms    one flight
   9,728 B   download 47.2 ms   + 1 RTT      ← the boundary
  10,240 B   download 48.2 ms   + 1 RTT
  32,768 B   download 51.0 ms   + 1 RTT
  49,152 B   download 103.1 ms  + 2 RTT
```

So the first flight carries **between 9,472 and 9,728 B of response body** on this path, and the 9,000 B
estimate is right within ~5%. The **9,216 B gate is validated with ~250 B of margin** — chosen before the
measurement existed. Two things this rules out: a 15 KB first flight (TCP IW10 × 1460 B with no handshake
cost) is *not* what happens here — 10,240 B already pays an RTT; and HTTP/2 response headers (~300 B,
measured) come out of the same window, so the usable body budget is the transport window minus headers.

Cross-checked against the live artifacts, same tool, same minute: the document at **4,348 B gzip** downloads
in 0.2 ms (one flight) while the runtime chunk at **10,982 B gzip** takes 48.4 ms (+1 RTT) — the boundary
lands exactly where the ladder put it.

**Protocol: this is HTTP/2 over TCP + TLS 1.3.** GitHub Pages advertises no `alt-svc`, so it offers no HTTP/3
at all, and §2's QUIC arithmetic above is therefore *not* the mechanism at work here — the two happen to agree
within 5%. QUIC's first flight remains unmeasured for us.

**Measure this with curl, not with a browser.** Chrome's navigation timing reported the same 10,982 B response
as arriving in one flight (3.5–8.7 ms) where curl consistently measured a full extra round trip across nine
cold connections. On the one case both tools could see, they disagreed, and curl agreed with the ladder — so
any first-flight number taken from `responseEnd − responseStart` in a browser should be treated as suspect.
(A companion attempt to measure QUIC against a Cloudflare h3 origin showed no RTT step up to 77 KB, but it
could only be made with Chrome, so it is recorded here as unverified rather than as a result.)

Caveats: one client location, one edge, one time of day, TCP rather than QUIC. A CDN running a larger initial
window would move the boundary, so re-run the ladder before raising the budget for a μApp hosted elsewhere.

**Budgets (targets):**

| Tier | What | Budget (brotli) | Why |
| :-- | :-- | --: | :-- |
| **P0** | The document: HTML + inline CSS + inline core JS | **≤ 9 KB** cold, ≤ 12 KB on resume | One flight, one paint |
| **P1** | Any lazily loaded chunk | ≤ 12 KB each | One flight on a warm connection |
| **Whole μApp** | Everything a single intent needs | ≤ 30 KB | Two round trips, verified waterfall depth |

Two rules about the numbers themselves:

- **Quote brotli, never gzip.** Brotli ships a static dictionary of HTML/CSS/JS tokens; below ~1 KB it references vocabulary rather than compressing yours. A 31-byte document is 46 B gzipped and 19 B brotli. Gzip structurally misrepresents small documents by 2–3×.
- **Bytes are not the only cost.** A 13.4 KB Svelte 5 island parses and evaluates in 11.3 ms on Apple Silicon; the 653 B signal engine takes 3.8 ms. Mid-tier Android is typically 4–8× slower, which puts the former at roughly 45–90 ms of main thread — over the sub-50 ms paint target even when the bytes fit. Keep JS scarce in P0; CSS is nearly free (~35 B per component, measured).

---

## 3. Tokens: one vocabulary, three axes

Sharp and Base are **not two stylesheets**. They are one token block rendered under three axes, and only the first costs bytes.

| Axis | Values | Mechanism | Cost |
| :-- | :-- | :-- | --: |
| **Density** | `base` · `sharp` | four custom properties + `tabular-nums` | one selector block |
| **Luminance** | light · dark | `color-scheme` + `light-dark()` | free |
| **Matte** | on · off | `.matte` class on a container | only where used |

Four themes result: `base`, `dark`, `sharp`, `sharp-dark`, set as `data-t` on `<html>`. There is no `sharp-matte-dark` theme and there must never be one.

### 3.1 Density

| | Base | Sharp |
| :-- | :-- | :-- |
| Who | A human making one decision: onboarding, pay links, settings, docs | A repeat user scanning dense numerics: order books, positions, tables |
| `--fs` / `--lh` / `--sp` | 16px / 1.6 / 1.5× | 14px / 1.4 / 1× |
| Numerics | proportional | `tabular-nums lining-nums`, `-0.01em` tracking |
| Typeface | `system-ui` | `system-ui` |
| Icons | 24px, 1.5px stroke | 16px, 1.5px stroke, inline SVG sprite |

**No webfont in P0.** One subsetted webfont is 15–30 KB — larger than the entire budget. System UI fonts have the x-height and hinting we need; density does the rest. **No icon font.** Inline the handful of SVG paths a view needs; each is ~100–200 B and shares the brotli dictionary with the markup.

### 3.2 The neutral ramp and the closed palette (Rule 4)

Neutrals are Tailwind's **slate** ramp, chosen because it is cooler than Bootstrap grays and because the satsDAO withdrawal UI — built independently — converged on it. Color is spent only on intent:

| Token | Meaning | Examples |
| :-- | :-- | :-- |
| `--n0…--n4`, `--fg…--fg3` | All structure and typography | Everything by default |
| `--ac` (primary) | The **one** non-financial action in view | Connect, Continue, Sign in |
| `--ok` (success) | Value entering, execution confirmed | Deposit, Filled, Proven |
| `--no` (danger) | Value leaving, destructive, failed | Withdraw, Sell, Reverted |
| `--wa` (warning) | Reversible risk shown before acting | High slippage, challenge window |

Each intent token comes as a family: `-s` surface, `-b` border, `-f` foreground, and for primary `-r` ring. That is what lets tinted panels and pills exist without new colors.

Three guards keep the palette closed:

1. **No brand color.** If it is not in the table, it is not in the system.
2. **One primary per view.** Exactly one `[data-p]`: the view's primary CTA, whatever its intent — a destructive confirm is still the primary. The colour rule is separate (`--ac` stays non-financial), so `[data-p]` no longer implies `--ac`. *(clarified 2026-09-14; gates/layout.js counts it on the fully adopted DOM.)*
3. **Never color alone.** Every colored state pairs with text or an icon (WCAG 2.2 §1.4.1).

The earlier "monochrome, green/red only" rule was retired for a specific reason: pure monochrome cannot distinguish *continue* from *commit capital*, which is exactly the distinction the rule exists to protect.

### 3.3 Contrast is a build-time property (Rule 3)

Every text container sits on an **opaque** surface token. A translucent panel's contrast depends on its backdrop, so it cannot be verified without enumerating every backdrop; an opaque token has one ratio. All 19 text/surface pairs in the reference theme pass 4.5:1 in both luminances. *(Erratum, measured 2026-09-14: with the hex that actually shipped, `--fg3` light failed on `--n2` (4.34), `--ac-s` (4.37) and `--no-s` (4.35) — `contrast.mjs` had been run against `#5f6b7d`, not the shipped `#64748b`. `--fg3` light is now `#5f6b7d`; worst pair 4.93. `gates/contrast.js` parses the shipped CSS, and covers 40 pairs.)*

One import trap, measured: `slate-400` on white is **2.56:1** and fails AA. It was the single most-used color in the withdrawal UI we liked (eyebrow labels, upcoming timeline states). μi uses a hand-darkened slate, `#5f6b7d` (5.05:1 on white), for the same role, which is `--fg3`. *(was `slate-500` `#64748b`, 4.76:1 on white but below 4.5:1 on `--n2`/`--ac-s`/`--no-s`; corrected 2026-09-14.)*

### 3.4 Component recipes

Six recipes carry the entire look. They are CSS classes, not components, and they cost ~35 B each compressed.

| Recipe | Class | Shape |
| :-- | :-- | :-- |
| Card | `.card` | `--n0` surface, 1px `--n3` border, 24px radius, `--sh` shadow |
| Semantic panel | `.panel` + `data-v` (ac, ok, wa, no) | tinted `-s` surface, `-b` border, 16px radius |
| Pill | `.pill[data-v=…]` | full radius, tinted, 12px semibold |
| Emphasis ring | `.ring`, `.field:focus-visible` | `0 0 0 4px var(--ac-r)` halo |
| Eyebrow | `.eyebrow` | 12px, semibold, uppercase, `.18em` tracking, `--fg3` |
| Monospace figure | `.mono`, `[data-mono]` | `ui-monospace`, tabular |

Plus `.btn` (`[data-p]` for the one primary), `.field`, `.stack`, `.row`, `.grid`. The full block is in `reference/p0/index.html` and is reproduced in Appendix B. Every recipe, both densities, both luminances, the Matte overlay, the chart marks and the CL manager screens are rendered live in `preview.html` (one file, zero dependencies; serve the folder and open it).

---

## 4. The seven rules

Scoped. Rules 1–2 engage only where `.matte` is applied. Rules 3–7 always apply and are CI-checkable.

| # | Rule | Scope | Implementation | Test |
| :-- | :-- | :-- | :-- | :-- |
| 1 | **Blur is conditional** | Matte | `backdrop-filter: none` at rest; `blur(14px)` only on `:focus-within` / `.active`. No `saturate()` stacked on it | grep |
| 2 | **Noise is static** | Matte | One inlined SVG turbulence filter, opacity 0.035, `background-attachment: local` (never `fixed`, which repaints every scroll frame). Measured: **323 B**, not the "6 KB" older docs claimed | grep + size |
| 3 | **Text never floats** | System | Opaque `--n0`/`--n1` behind every text container; ≥ 4.5:1 in every state and theme | contrast script |
| 4 | **Color is intent** | System | Closed palette above; one `--ac` per view; never color alone | grep + review |
| 5 | **Motion is meaning** | System | 120–180 ms ease-out, only on price change or execution state; `prefers-reduced-motion` disables | grep |
| 6 | **Fits the flight** | System | P0 ≤ 9 KB brotli; any chunk ≤ 12 KB; Tailwind preflight and webfonts banned from P0 | `gates/size.js` in CI |
| 7 | **CLS = 0** | System | Static markup and island output have identical dimensions; islands *adopt*, never append | Lighthouse / PerformanceObserver |

Rule 6 replaces the old "bundle < 100 KB, chunk < 13 KB gzipped". That ceiling was a 2017 news-article analogy; this one is the congestion window.

---

## 5. μApp: shipping in one round trip

### 5.1 Tiering, inverted

The original plan was P0 shell → P1 core → P2 intent. Measurement inverted it:

```
P0   the WHOLE app, one document          3,081 B brotli · 1 RTT · 0 subrequests · CLS 0
P1   optional lazy islands, on gesture     only when a view needs a component model
```

The reference μApp — four themes, theme switcher, deep-reactive signal engine, two islands (a withdrawal timeline and an amount field with derived USD), a warning panel — is **3,081 B brotli in one HTML file**. Verified in a browser: derived state updates, input → derived computed, `performance.getEntriesByType('resource').length === 0`, CLS exactly 0. That leaves ~6 KB of headroom under the cold budget, or roughly 170 more CSS recipes.

### 5.2 What P0 contains

| Piece | brotli | Note |
| :-- | --: | :-- |
| Valid doc + reset + 4 themes | 406 | `light-dark()` collapses each theme pair into one block |
| + component recipes + real markup | 618 | "minimum useful page" |
| Theme switcher (delegated click, persisted) | 115 | |
| Island loader (explicit map, no template-literal `import()`) | 247 | |
| Signal engine, deep proxy + arrays, 8/8 tests | 653 | `state` / `derived` / `effect` / `settled` |
| DOM helper `h()` / `txt()` / `list()` | 190 | imperative, no VDOM |

### 5.3 Loading rules (all measured)

1. **Inline CSS and core JS in the document.** One brotli dictionary across the whole file beat separate resources by ~20% at this scale, and saves two round trips.
2. **Islands are lazy and adopt, not append.** `mount()`-style append rendered the timeline twice and produced 0.0022 CLS. Islands must `replaceChildren` onto identical static markup, or use a true `hydrate()` against server-generated markup from the same source.
3. **Explicit island map.** `` import(`./isl-${x}.js`) `` cannot be resolved statically by Bun, so it fetches every candidate. Write `{timeline: () => import('./isl-timeline.js')}`.
4. **`<link rel=modulepreload>` in `<head>`, eager — injected by your build, not by the bundler.** *(Erratum, measured 2026-09-14: `bun build --splitting` emits preloads only for chunks an entry or `import()` already pulls, at import time; nothing is ever added eagerly to `<head>`. `build.js` finds the chunk shared by ≥ 2 island entries in the metafile and writes the tag into the template.)* It is not render-blocking. Measured FCP after HTML arrival: eager 35.8 ms, none 43.5 ms, deferred to idle 56.5 ms. Add **103 Early Hints** at the edge so the preload starts during RTT 1.
5. **Never inline a framework runtime.** Inlining a 12.8 KB core crossed the flight boundary: +36 ms FCP, +44 ms fully loaded, and the islands fetched the core a second time anyway. Re-measured 2026-09-14 with the smallest Svelte 5 that can render P0's two islands (aggressive Vite, boundary stub): the document goes 3,701 → **12,066 B**, 31% over budget — 11,374 B even with the unsafe proxy stub. There is no "lite runtime" split that helps: the floor is 4,454 B before a component, and `{#each}`, `bind:` and events add 0.8–2.7 KB each on top.
5b. **Inline *all* the CSS, and never split a stylesheet to save bytes.** Measured 2026-09-14 in the real document: marginal CSS costs **~19% of raw** inside the P0 brotli stream against **~31%** as its own file, plus a request. The whole 14,636 B recipe vocabulary inlines for 2,764 B, landing P0 at 6,465 B — still 2,751 B under budget. CSS that only a lazy island needs belongs *in that island's bundle* (`css:'injected'`), never in a second stylesheet.
6. **Chunk only at the island boundary.** Every intra-runtime split (reactivity | DOM, core | blocks, etc.) *added* 2–38% total bytes and deferred nothing, because compiled components statically import all of it.
7. **Compression Dictionary Transport for redeploys** — 64% smaller redeploy payloads measured. *(Erratum, measured 2026-09-14: the "fix mangling stability first" caveat was a **Bun** problem. Under Vite/Rollup + terser the build is byte-deterministic — every artifact identical across rebuilds — and a one-word change inside a component perturbs **0 bytes** of the shared runtime chunk, against Bun's 3,439 scattered renames. The prerequisite is met.)* Redeploy deltas with the previous version as dictionary: unchanged files **3–7 B**, the one changed island **328 → 53 B (84% smaller)**. Cross-artifact dictionaries *within* one deploy are not worth wiring up — 7–30%, 50–290 B, on files the browser must already hold for the dictionary to exist. And it needs an edge you control: GitHub Pages serves **no brotli at all** (identity when only `br`/`zstd` are offered, gzip otherwise), so `Use-As-Dictionary` and `dcb`/`dcz` are unavailable there.

---

## 6. Stack decisions, by measurement

| Question | Answer | Evidence (brotli) |
| :-- | :-- | :-- |
| Framework in P0? | **No.** Zero-framework P0 with hand-rolled signals | Svelte 5 floor for `<p>hello</p>` is 10,291 B; realistic island 12,881 B *(8,422 / 10,596 idiomatic — measured 2026-09-14; still 2–3× the whole P0 budget)*. Can't shrink (primitives alone 6.5 KB; 4.9 KB with `sideEffects` patch + static `DEV`), can't split (+2–38%), can't inline (+36 ms FCP) |
| Reactivity in P0? | 653 B engine: `state`/`derived`/`effect`, deep proxy, arrays, diamond-safe, disposable | 8/8 tests. Svelte's engine is 7.1 KB and indivisible because `$state` is polymorphic |
| Bridge to Svelte islands? | 78 B `readable()` adapter, or 3-line `createSubscriber` bridge | Both verified end-to-end: P0 sets `count.value = 42`, Svelte component renders it |
| Which Svelte for islands? | **Svelte 5, built by Vite/Rollup** — when a view needs a component framework at all | *(Reversed 2026-09-14; the v4 sizes below still hold.)* Svelte 4's last release was 2025-05-20, 16 months before this revision, while 5.57.0 shipped 2026-08-28. The byte case for v4 is real — same two islands: **4,190 B on v4** vs **11,562 B on v5** — but the exposure is ~60 lines of component code per μApp, the design system is CSS, and P0 ships no framework at all. Porting the starter's islands to runes took minutes and moved bytes by 0.3%. Starting new work on a frozen branch costs more than 7 KB of tier-2 payload |
| When does Svelte 5 *win on bytes*? | Past **~26 lazy islands / ~52 components** (21 with the boundary stub) | *(Erratum, measured 2026-09-14 — was "~60 islands", and "marginal per-island cost is equal" was wrong.)* Identical fixtures through each version's supported Vite: v5 costs **677 B per island** against v4's **1,015 B**, on a flat tax of 6,724 B vs 1,063 B. Measured at the crossing: 26 islands = v5 28,825 B, v4 28,969 B |
| Tailwind? | Utilities layer only, or hand-authored CSS. **Never preflight in P0** | preflight 1,091 B (43% of a 2.5 KB P0); 91 utilities 662 B; μi's own reset is 199 B |
| Toolchain | **Bun** for P0, dev server and tests; **Vite/Rollup for the island tier** once it carries Svelte. Preloads are injected by the build (see §5.3 rule 4), not by `--splitting` | *(Split 2026-09-14.)* Same components, same Svelte 5.57.0, same patches: Rollup's shared runtime chunk is **8,244 B** against Bun's **11,946 B** — 67% of the chunk gate instead of 97% — because Rollup folds `esm-env`'s `DEV` statically while Bun keeps it an imported binding and ships every dev branch. Bun needed a hand-written rewrite plugin to even reach 11,946. Rollup also shook 688 B out of the viem island. Bun and esbuild tie. *(Erratum, measured 2026-09-14: an **idiomatic** `vite build` produces 8,422 B for a mounted Svelte 5 component against Bun's 13.2 KB — the gap is Vite's static `DEV` fold plus Rollup shaking, not an unsafe flag. It does not change the verdict for μApps, whose islands are Svelte 4, but the earlier "Bun and esbuild tie, Rollup cheats" line was wrong.)* |
| Trimming the Svelte 5 runtime | **Don't patch the framework.** Two stubs were built, measured and removed: `dom/blocks/boundary.js` (935 B in a real island tier) and `proxy.js` (~1.5 KB) | Measured 2026-09-14. Both fail *silently* — a boundary that never catches, and `list.push(x)` that stops rendering (stock 3-2, stubbed 1-0). A size gate cannot see either. `sideEffects:false` and the unsafe rollup treeshake are worth **0 B**: the floor is reachable code, not missing annotations. What paid was application-level — see the wallet row |
| Wallets | `injected()` only (MetaMask/Rabby are the allowlist anyway). No WalletConnect modal, no analytics, no on-ramp — and, measured 2026-09-14, **no ABI library either**: a token μApp's calls are a 4-byte selector plus 32-byte static words, so the island codes them itself and keeps viem as a test oracle. **9,435 B → 764 B brotli.** `encodeAbiParameters` reaches `isAddress` → `checksumAddress` → keccak (4.5 KB raw) and `decodeAbiParameters` statically imports the same; the trade is EIP-55 verification, pinned by `test/abi.test.js` | mezo-swap min-ui production build: 625 KB brotli, largest chunk 1,033 KB = WalletConnect + Reown + lit. The wallet stack *is* the bloat |

**2026 platform primitives that delete JS outright** (use before reaching for a library): `light-dark()` + `color-scheme`; Popover API + CSS anchor positioning (dropdowns, tooltips); `<dialog>`; `:has()`; container queries; `@starting-style` + `transition-behavior: allow-discrete`; `field-sizing: content`; `@layer` for a reset that never fights components.

---

## 7. Adoption playbook for the current pipeline

Each row is the smallest move that makes the surface μi-compliant. None requires a rewrite.

| Surface | Today | First move | Then |
| :-- | :-- | :-- | :-- |
| **mezo-swap `min-ui`** (Svelte 4, Vite) | 625 KB br, mostly wallet modal; unpushed source deployed May 20 | **Recover and push the deployed working tree** — it is the only copy of five months of work. Swap Web3Modal for `injected()` | Replace `app.css` tokens with Appendix B; keep Svelte 4; move to `bun build --splitting`, one island per route |
| **satsDAO base-withdrawals** (SvelteKit, Tailwind) | The look μi's base theme is derived from; raw utilities, no tokens; `slate-400` text fails AA | Swap `slate-400` → `slate-500`; drop preflight; map the four recipes to `.card/.panel/.pill/.ring` | Its `UI/Button` and `UI/Input` predate the page; delete them, use recipes |
| **Pairs.pro** app | Trading surface, dense numerics | `data-t=sharp-dark` default, `tabular-nums` on every figure column, one `--ac` per view | Position tables and range charts as lazy islands; chart library only on gesture |
| **PEG.markets · Calm · Bind** | Prototypes / concept UIs | Start from `reference/p0/index.html`. One intent per μApp (create pair; submit intent; resolve `bind.to/name`) | Zero framework until an island genuinely needs `{#each}` reconciliation |
| **Sense.capital · Decouple sites** | Static | Base theme, static HTML, no JS at all: the 618 B floor plus content | Matte overlay on hero only, if at all |
| **Any new concept** | — | Copy `reference/p0/`, delete what you don't use, run `bun run gate`, stay under 9 KB | Add islands; add Svelte 4 only when a view has real component count |

---

## 8. CI gates

Six checks, all scriptable, all run against the built artifact — `bun run gate` runs them and the build fails on any one:

```
size      brotli(index.html) ≤ 9,216 B · every chunk ≤ 12,288 B     gates/size.js
contrast  every (fg, surface) pair in every theme ≥ 4.5:1            gates/contrast.js  (40 pairs, parsed from the shipped CSS)
palette   no hex/rgb/hsl literals outside @layer theme                gates/palette.js   (+ ≤ 1 [data-p] per source)
motion    no transition/animation > 180ms; reduced-motion block       gates/motion.js
syntax    ES2023 ESM only: no ES2024+ API/syntax, no CommonJS marker  gates/syntax.js
layout    CLS = 0 after every island adopts · ≤ 1 [data-p] rendered   gates/layout.js    (headless Chrome over CDP)
```

The layout gate drives system Chrome over the DevTools protocol (Bun's own WebSocket, no npm dependency) and
asserts every lazy island was really fetched before trusting the zero. *(Measured 2026-09-14: `--dump-dom` alone
dumps at `load`, before adoption; adding `--virtual-time-budget` gets the adopted DOM but produces no rendering
frames, and `layout-shift` entries are only emitted during frame production — a 300 px block injected at the top
of the page scored 0.0000 that way and 0.0364 under CDP. A gate that cannot see a 300 px shift is off.)*

A gate that is not green is a gate that is off. If a rule cannot be scripted, it is a guideline, and it goes in a review checklist, not this table.

---

## 9. Open items (not yet proven)

Stated so the doc/code gap stays visible:

- **Hydration handoff.** The clean fix — P0 markup generated from the same island source, islands adopt it — is designed, not built. Until then, islands `replaceChildren` and the author guarantees identical dimensions by hand.
- **Signal engine coverage.** 8 tests written here, not a decade of production. Port a real signal-library test suite against `reference/p0/src/signals.js` before it owns money-moving state.
- **Svelte 4 island runtime smoke test.** The 6,645 B split build is a byte measurement; it has not been driven in a browser inside the P0 shell.
- **Edge configuration.** Whether our edge runs QUIC, 0-RTT resumption, and a short ECDSA chain is worth ~2 KB of first-flight budget — more than any further byte-shaving. Unverified.
- **Deterministic builds** for Compression Dictionary Transport. Bun's mangling stability needs checking.
- **Matte Glass GPU numbers.** The earlier "−79% GPU" claim was never measured on our hardware. Measure before quoting.

---

## Appendix A — Measurement ledger

All brotli q11, w24, unless noted. Reproduce with `reference/p0/measure.js`.

**HTML floor**

| Step | brotli |
| :-- | --: |
| minimal parseable HTML | 19 |
| valid doc + charset + viewport | 95 |
| + reset | 199 |
| + 1 theme's tokens | 276 |
| + 4 themes via `light-dark()` | 406 |
| + 4 recipes | 545 |
| + real body markup | **618** |

**JS floor**

| Piece | brotli |
| :-- | --: |
| read persisted theme | 56 |
| theme switcher | 115 |
| lazy island loader | 247 |
| signals, flat (9/9 tests) | 358 |
| signals, deep proxy + arrays (8/8) | 653 |
| all of the above | 927 |

**Complete documents**

| Build | requests | brotli | RTT | CLS |
| :-- | --: | --: | --: | --: |
| Zero-framework single doc (`reference/p0/index.html`) | 0 sub | **3,081** | 1 | 0 |
| Svelte 5 P0 + 3 preloaded P1 chunks | 4 | 18,686 | 2 | 0.0022 |

**Svelte 5.45 runtime (Bun, minified)**

| Case | brotli |
| :-- | --: |
| `svelte/store` only, as shipped / with `sideEffects` patch | 11,960 / 331 |
| raw primitives `state`/`get`/`set` | 6,511 |
| compiled `$state` / + `$derived` / + `$effect` | 6,524 / 6,678 / 7,149 |
| primitives, most aggressive build (patch + static `DEV` + terser) | 4,927 |
| mountable `<p>hello</p>` | 10,291 *(8,422 idiomatic Vite, 2026-09-14)* |
| + `{#if}` / event / `bind:value` / `transition` / keyed `{#each}` | +792 / +1,041 / +1,333 / +1,873 / +2,660 |
| realistic island | 12,881 *(10,596 idiomatic Vite, 2026-09-14)* |
| 1 → 40 components | +21 B each |

**Svelte 4.2.20 vs 5.45.2, identical components (Bun, brotli)**

| unique components | v4 | v5 |
| --: | --: | --: |
| 1 | 2,844 | 12,731 |
| 3 | 4,074 | 15,632 |
| 6 | 5,101 | 16,695 |
| 24 | 6,218 | 17,571 |
| shell + 3 lazy islands (2 comps each) | **6,645** | 18,999 |

**Tailwind v4:** preflight 1,091 · theme vars 63 · 91 utilities 662 · full import 3,155.

**Parse + eval, Apple Silicon, median of 8 cold loads:** Svelte 5 island 11.3 ms · 653 B engine 3.8 ms.

**Shared-dictionary deltas (CDT):** core v2 vs v1 64% · island v2 vs v1 36% · island vs core 14% · P0 vs core 3%.

**Chunk granularity — 24 identical components, varying only the split (measured 2026-09-14):**

| lazy chunks | Svelte 5 | Svelte 4 |
| --: | --: | --: |
| 1 | 12,356 | **5,338** |
| 3 | 14,989 | 9,518 |
| 6 | 17,248 | 12,286 |
| 12 | 19,461 | 14,808 |

Splitting costs v4 **+178%** and v5 **+58%** — duplicated helpers plus lost cross-file compression. Granularity moves more bytes than the framework choice does: merging 12 islands into one lazy chunk saves 9.5 KB on v4, more than the entire P0 budget. It is also why the two versions converge at scale. Split for *when code is needed*, never for tidiness.

**What the Svelte 5 floor is made of** (`<p>hello</p>` mounted, minified, attributed through the sourcemap): `batch.js` 3,856 · `runtime.js` 2,848 · `effects.js` 2,317 · `boundary.js` 2,206 · `proxy.js` 1,884 · `sources.js` 909 · `events.js` 745 · `render.js` 742. The component contributes ~0. Aggressive tuning (terser 3-pass unsafe + compiler flags + `sideEffects:false`) buys **5.8%**; `moduleSideEffects:false` buys **0%**.

---

## Appendix B — Reference tokens

The `@layer theme` block from `reference/p0/index.html`, 5,016 B raw CSS for the whole page. Density and luminance are the only two selectors after `:root`.

```css
:root{color-scheme:light;
  --n0:light-dark(#fff,#020617);--n1:light-dark(#f8fafc,#0f172a);--n2:light-dark(#f1f5f9,#1e293b);
  --n3:light-dark(#e2e8f0,#334155);--n4:light-dark(#cbd5e1,#475569);
  --fg:light-dark(#020617,#f8fafc);--fg2:light-dark(#475569,#cbd5e1);--fg3:light-dark(#5f6b7d,#94a3b8);
  --ac-s:light-dark(#eff6ff,#172554);--ac-b:light-dark(#bfdbfe,#1e40af);--ac-r:light-dark(#dbeafe,#1e3a8a);
  --ac-f:light-dark(#1d4ed8,#93c5fd);--ac:light-dark(#2563eb,#3b82f6);--on-ac:light-dark(#fff,#020617);
  --ok-s:light-dark(#ecfdf5,#022c22);--ok-b:light-dark(#a7f3d0,#065f46);--ok-f:light-dark(#047857,#6ee7b7);
  --wa-s:light-dark(#fffbeb,#451a03);--wa-b:light-dark(#fde68a,#92400e);--wa-f:light-dark(#b45309,#fcd34d);
  --no-s:light-dark(#fef2f2,#450a0a);--no-b:light-dark(#fecaca,#991b1b);--no-f:light-dark(#b91c1c,#fca5a5);
  --r1:.5rem;--r2:.75rem;--r3:1rem;--r4:1.5rem;--rf:9999px;
  --sh:0 1px 2px light-dark(#0f172a14,#0000004d);
  --ff:system-ui,sans-serif;--fm:ui-monospace,SFMono-Regular,monospace;
  --fs:1rem;--lh:1.6;--sp:1.5}
:root:where([data-t=dark]){color-scheme:dark}
:root:where([data-t=sharp],[data-t=sharp-dark]){--fs:.875rem;--lh:1.4;--sp:1;
  font-variant-numeric:tabular-nums lining-nums;letter-spacing:-.01em}
:root:where([data-t=sharp-dark]){color-scheme:dark}
```

Intent variants are one attribute, not four classes:

```css
[data-v=ac]{--s:var(--ac-s);--b:var(--ac-b);--f:var(--ac-f)}
[data-v=ok]{--s:var(--ok-s);--b:var(--ok-b);--f:var(--ok-f)}
[data-v=wa]{--s:var(--wa-s);--b:var(--wa-b);--f:var(--wa-f)}
[data-v=no]{--s:var(--no-s);--b:var(--no-b);--f:var(--no-f)}
.panel{border:1px solid var(--b,var(--n3));background:var(--s,var(--n1));border-radius:var(--r3)}
.pill{background:var(--s,var(--n2));color:var(--f,var(--fg2));border-radius:var(--rf)}
```

Matte overlay, applied to any container in any theme:

```css
.matte{background:color-mix(in srgb,var(--n0) 80%,transparent);backdrop-filter:none;
  transition:backdrop-filter 180ms ease-out;background-attachment:local}
.matte:focus-within,.matte.active{backdrop-filter:blur(14px);
  background:color-mix(in srgb,var(--n0) 70%,transparent)}
```

Signal engine API (`reference/p0/src/signals.js`, 653 B minified brotli):

```js
const n = state(0);                 // .value get/set; deep proxy for objects and arrays
const d = derived(() => n.value*2); // lazy, cached, glitch-free on diamonds
const off = effect(() => render()); // microtask-batched; off() disposes
await settled();                    // after all pending effects
export const readable = sig => ({ subscribe(fn){ const off=effect(()=>fn(sig.value)); return ()=>off() } });
```

---

## Appendix C — What changed from the previous draft

| Was | Now | Why |
| :-- | :-- | :-- |
| Revenue, volume, spread, fatigue and A/B percentages | Removed | Not measured. A spec that fabricates evidence cannot enforce honesty in CI |
| Shipping μApps table (Calm.trade 6.8 KB, Bind.pay…) | Removed; replaced by §7 playbook | Those apps have not shipped on μi |
| Rule 3: `rgba(255,255,255,0.08)` text backing | Opaque surfaces | Translucent contrast is not verifiable at build time; the code was already right |
| Rule 4: monochrome, green/red only | Closed palette: `--ac`, `--ok`, `--no`, `--wa` | Monochrome cannot separate *continue* from *commit capital*; satsDAO converged on the same mapping independently |
| Rule 2: "6 KB texture" | 323 B, `background-attachment: local` | Measured; `fixed` repaints on scroll |
| Rule 1: `blur(14px) saturate(180%)` | `blur(14px)` only | `saturate` is undocumented GPU cost |
| Rule 6: bundle < 100 KB, chunk ≤ 13 KB gzipped | P0 ≤ 9 KB brotli, chunk ≤ 12 KB brotli | Congestion-window geometry, not a news-article analogy; gzip misrepresents small docs |
| μApp = ≤ 40 KB across ≤ 3 streams, P0/P1/P2 shell/core/intent, "QUIC mandatory" | Whole app in one 3 KB document; islands after; QUIC/0-RTT/Early Hints as edge configuration | Measured: a 3-stream Svelte build was 18.7 KB and 2 RTT with CLS 0.0022; a single document was 3.1 KB, 1 RTT, CLS 0 |
| Svelte 5 in the core chunk | No framework in P0; Svelte 4 for islands; Svelte 5 for dashboards only | Floors, split penalties, inline penalty and v4/v5 scaling all measured |
| Typography and icons as "empathy vs density" fragments | One table: density is four custom properties; no webfont, no icon font in P0 | Budget |
| "18 components, 87 KB" library | Recipes at ~35 B each; the reference page is 3 KB with everything | Measured |
