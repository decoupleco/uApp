# implementation.md — μApp tiered build (Bun-native, plain-JS ESM, ES2023)

_Status: approved 2026-09-14; executing. Steps below are checked off as their `verify:` passes._

> On approval, step 0 saves this file verbatim as `~/workspace/decouple/design/implementation.md`.
> Two token decisions marked ⟨DECIDE⟩ have recommended defaults and are being asked now.

## Context

`~/workspace/decouple/design/` holds `ui-whitepaper.md` (v2, the measured design language),
`preview.html` (recipe gallery), and `reference/p0/` — the zero-framework single-document
μApp (3,081 B brotli) the paper cites — plus `reference/contrast.mjs`.

What is missing is the **build**. `reference/p0/index.html` is a hand-inlined artifact; nothing
produces it from `reference/p0/src/`. The paper's §8 names five CI gates; only two have scripts
and neither is wired to a build. This plan turns the paper into a reproducible pipeline —
**one command builds the tiers, inlines P0, injects the tier-2 preload, and fails on any gate** —
using Bun only, in plain `.js` ESM, with ES2023 syntax on the wire.

Decisions already made by measurement (paper §5–6, Appendix A) and not re-litigated: P0 is one
document with zero subrequests and a hand-rolled 653 B signal engine; islands are lazy, adopt
(never append), and use an explicit import map; Svelte **4** for islands; Bun for bundler,
server, test; no framework runtime is ever inlined.

Measured today, superseding the paper (fixed in step 10 as cited errata, not silently):

| paper | measured 2026-09-14 | consequence |
|---|---|---|
| §6 "Bun and esbuild tie; Rollup's number is from an unsafe flag" | idiomatic `vite build` = 8,422 B for a mounted Svelte 5 component vs Bun 13.2 KB; gap is static `DEV` + shaking | irrelevant to this starter (Svelte 4 islands); corrected for the record |
| §5.3 rule 4 "`bun build --splitting` injects `modulepreload` for you" | only for chunks an entry or `import()` loads, at import time — never eagerly in `<head>` | tier-2 preload is a post-build injection (build step e) |
| §3.3 "all 19 pairs pass 4.5:1"; `--fg3` = slate-500 `#64748b` | light `fg3` on `n2` **4.34**, on `ac-s` **4.37**, on `no-s` **4.35** — fails; `contrast.mjs` tested `#5f6b7d`, not the shipped hex | ⟨DECIDE A⟩ below |
| Appendix A Svelte 5 floors 10,291 / 12,881 | idiomatic 8,422 / 10,596 | ledger annotation |
| Svelte 4 3-island split (6,645 B) "not driven in a browser" (§9) | — | step 9 proves it in the P0 shell |

Tier-3 costs measured today (all brotli): viem decorated clients 67,240 · `createClient`+actions
34,196 · **ABI encoders + raw `window.ethereum.request` 13,651**, trimmed to the withdraw set
**9,770** · `base` chain object 13,664 (OP-Stack config; plain `defineChain` ≈ 300) ·
`lightweight-charts` v5 44,770 floor, series don't shake · **SVG histogram 506**.

Non-goals: SSR/hydration (§9 stays open), Min.UI migration, SvelteKit, Svelte 5 (documented
alternative only: `bun-plugin-svelte` + `bun patch svelte` sideEffects + DEV-fold plugin, 17.9 KB).

## Constraints (from the user)

- **Plain `.js` ESM only.** No `.ts`/`.mjs`/`.cjs`. `"type":"module"`. JSDoc if types are wanted.
  Bun runs `.js` natively — our code has no compile step; only `.svelte → JS` does.
- **ES2023 on the wire.** Bun doesn't down-level; sources use `??`, `?.`, class fields (ES2022).
  `gates/syntax.js` fails on ES2024+ in `dist/` (`/…/v` flag, `Object.groupBy`,
  `Promise.withResolvers`, `Array.fromAsync`, `@decorator`).
- Whitepaper errata applied in place, small and cited.
- `reference/p0/` is **frozen** (the paper's cited artifact). Parity is checked once (step 3).
  The lazy loader and new islands legitimately grow `dist/index.html` past 3,081 B; the gate is 9,216.

## Layout

```
design/
  implementation.md · ui-whitepaper.md · preview.html      (existing; paper gets errata)
  reference/p0/ · reference/contrast.mjs → contrast.js     (frozen artifact; script renamed)
  package.json   {"type":"module","packageManager":"bun@1.4.2",
                  "dependencies":{"viem":"^2.40.3"}, "devDependencies":{"svelte":"^4.2.20"}}
  .gitignore     dist/ node_modules/            (root .gitignore already covers both; local copy for clarity)
  build.js       tiers → dist/, preload injection, template slots
  svelte4.js     15-line onLoad plugin (svelte@4 compile, generate:'dom', css:'injected')
  dev.js         fs.watch('src') → rebuild; Bun.serve dist/ on :5181
  src/p0/        index.tmpl.html (slots <!--preload--> <!--css--> <!--js-->) · p0.css · p0.js ·
                 signals.js · dom.js · isl-timeline.js · isl-amount.js   (inline islands, as today)
  src/islands/   wallet.js · histogram.js · svelte-demo.js + Demo.svelte   (lazy, /i/*)
  gates/         size.js · contrast.js · palette.js · motion.js · syntax.js · layout.js
  test/          signals.test.js (bun:test)
```
No `bunfig.toml` (nothing needs one). Scratch sources this session:
`S=/private/tmp/claude-502/…/scratchpad/bench` — `S/ui/p0.css`, `S/tier3/src/w-raw.js`,
`S/tier3/src/hist-svg.js`, `S/mini/test4.mjs`.

## build.js (design verified by the Plan agent with `bun -e` probes)

```js
// run as `bun ./build.js` (never `bun build.js` — `build` is a subcommand)
import { rmSync, mkdirSync } from 'node:fs'; import svelte4 from './svelte4.js';
const fail = l => { console.error(l.map(String).join('\n')); process.exit(1) };
rmSync('dist', {recursive:true, force:true}); mkdirSync('dist/i', {recursive:true});

// (c) tier 3: unhashed entries (P0's map is literal source), hashed chunks, metafile for (e)
const isl = await Bun.build({ entrypoints: [...islands], outdir:'dist/i', target:'browser', format:'esm',
  splitting:true, minify:true, conditions:['production'], define:{'process.env.NODE_ENV':'"production"'},
  naming:{ entry:'[name].[ext]', chunk:'c-[hash].[ext]' }, metafile:true, plugins:[svelte4] });
// (e) tier 2: any non-entry chunk statically imported by ≥2 entries → eager preload
const outs = Object.entries(isl.metafile.outputs);
const preload = outs.filter(([p,o]) => !o.entryPoint &&
  outs.filter(([,e]) => e.entryPoint && e.imports.some(i => i.path===p)).length >= 2)
  .map(([p]) => `<link rel=modulepreload href="/i/${p.slice(2)}">`).join('');
// (a) tier 1 JS → string; `/i/*` external keeps `import('/i/wallet.js')` verbatim
const js = await Bun.build({ entrypoints:['src/p0/p0.js'], target:'browser', format:'esm', minify:true, external:['/i/*'] });
const p0js = await js.outputs[0].text();
// (b) tier 1 CSS: NOT Bun.build — its CSS pipeline lowers light-dark() to var pairs (+62 B, changes Appendix B).
const p0css = (await Bun.file('src/p0/p0.css').text()).replace(/\n/g,'').replace(/::(before|after)/g,':$1');
// (f) template slots — replacer FUNCTIONS: the JS contains `$` sequences
const html = (await Bun.file('src/p0/index.tmpl.html').text())
  .replace('<!--preload-->', () => preload).replace('<!--css-->', () => p0css).replace('<!--js-->', () => p0js);
await Bun.write('dist/index.html', html);
```
- Island map in `src/p0/p0.js` is literal: `{ wallet:()=>import('/i/wallet.js'), histogram:()=>import('/i/histogram.js'), demo:()=>import('/i/svelte-demo.js') }`.
  Loader (~250 B): inline islands run now; `data-on=visible` → one-shot `IntersectionObserver`;
  else `addEventListener(el.dataset.on||'pointerdown', load, {once:true})`;
  `load = el => L[el.dataset.island]().then(m => m.default(el, JSON.parse(el.dataset.props||'{}')))`.
- Cache policy documented in README of `dev.js`: `/i/<name>.js` `no-cache` (ETag); `/i/c-*.js` immutable.
- `svelte4.js`: `onLoad({filter:/\.svelte$/})` → `compile(src,{filename, generate:'dom', hydratable:false, dev:false, css:'injected'})` → `{contents: js.code, loader:'js'}`. Verified: v4 output lands the runtime in one shared chunk under `splitting`.
- Svelte island wrapper adopts: `el.replaceChildren(); new C({target:el, props})` — both in one task, no intermediate frame.

## Gates (each `process.exit(1)` on failure; `bun run gate` runs all)

- `size.js` — brotli q11 lgwin24 (standardise on `measure.mjs` params). `dist/index.html ≤ 9,216`;
  every `dist/i/*.js ≤ 12,288`; P0 must contain no `<script src>`, `rel=stylesheet`, or static `import`.
- `contrast.js` — brace-match `@layer theme{…}` in `src/p0/p0.css`, regex both `light-dark(#a,#b)` arms
  (23 tokens), WCAG ratio for the 16 pairs in `reference/contrast.js` **plus** `fg3` on `ac-s/ok-s/wa-s/no-s`
  (`.d` text sits inside `data-v` panels). Tests what ships, not a parallel palette.
- `palette.js` — scan `p0.css` with the theme block excised, plus `src/islands/**`: fail on
  `#hex | rgb() | hsl() | oklch() | color()`. Count `data-p` in `dist/index.html` + island sources; fail if > 1 per view.
- `motion.js` — on the built CSS: any `transition|animation` duration > 180 ms fails; `@media (prefers-reduced-motion: reduce)` required.
- `syntax.js` — ES2024+ grep on `dist/**/*.js` (see Constraints).
- `layout.js` — **headless system Chrome, no npm dep**: `Bun.serve` on `dist/` injecting (at request time) a
  `PerformanceObserver({type:'layout-shift',buffered:true})` + `pointerdown` on every `[data-island][data-on]`,
  then `document.title='cls='+cls` after 1.5 s; spawn `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --virtual-time-budget=5000 --dump-dom http://127.0.0.1:<port>/`, parse the title, fail unless `cls=0`.
  **Fail, never skip, if Chrome is absent.** (happy-dom rejected: no layout engine → every dimension is 0 → a gate that measures nothing.)

## Decided token/rule changes (user, 2026-09-14)

- **`--fg3` light arm: `#64748b` → `#5f6b7d`.** Clears every surface (worst pair 4.93:1). Applied in
  step 2; §3.3's "slate-500 (4.76:1)" sentence becomes an erratum in step 10. Dark arm unchanged.
- **`[data-p]` = the view's primary CTA, any intent.** "Initiate withdrawal" keeps `data-p`. Consequences:
  - `palette.js` counts `data-p` **per rendered view** (P0 markup + every island that can be mounted in it)
    and fails if > 1 — so the wallet island's Connect button is a plain `.btn` (secondary), never `data-p`,
    because it shares the view with the withdraw CTA. Step 5 encodes this.
  - §3.2's guard "One primary per view. Two `--ac` buttons means one of them is lying" is reworded in
    step 10 to "one `[data-p]` per view; it is the view's primary CTA regardless of intent" — the
    closed-palette rule about *colour* (`--ac` = non-financial) stays as written; the *attribute* no longer
    implies the colour. The reference's `data-p` withdraw button is therefore compliant as-is.

## Steps (each with `verify:` per CLAUDE.md)

0. Save this plan as `design/implementation.md`. → verify: file present.
1. `package.json`, `.gitignore`, `bun install`. → verify: `bun -e "import('svelte/compiler').then(m=>console.log(m.VERSION))"` → `4.2.20`; `ls node_modules/viem`.
2. Copy `reference/p0/src/*.js` → `src/p0/`; `S/ui/p0.css` → `src/p0/p0.css` (+ `@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`, + DECIDE A); write `index.tmpl.html` from `reference/p0/index.html` with the three slots. → verify: `diff <(tr -d '\n' < src/p0/p0.css | sed 's/::/:/g') <(sed -n 's/.*<style>\(.*\)<\/style>.*/\1/p' reference/p0/index.html)` ≤ cosmetic delta (before the two additions).
3. `svelte4.js`, `build.js` with no lazy islands. → verify: `bun ./build.js && bun reference/p0/measure.js dist/index.html` ≈ **3,081 B** (parity with the frozen reference, one-time).
4. Lazy loader + literal `/i/*` map in `src/p0/p0.js`. → verify: `grep -c 'import("/i/' dist/index.html` = 3; brotli < 3,500.
5. Islands: `histogram.js` from `S/tier3/src/hist-svg.js` with **token fills** (`var(--ok-f)` etc., no hex);
   `wallet.js` from `S/tier3/src/w-raw.js` **trimmed to the withdraw set** (`encodeFunctionData, decodeFunctionResult, parseUnits, formatUnits, erc20Abi`; no chain object — `eth_call`/`eth_sendTransaction` need none) + a default export rendering a Connect button. Register both in the template with `data-on`. → verify: `bun reference/p0/measure.js dist/i/*.js` — histogram ≈ 506 B, wallet ≈ 9,770 B; `grep -c secp256k1 dist/i/wallet.js` = 0 (`@noble/hashes` keccak is required for selectors and stays).
6. Gates `size/contrast/palette/motion/syntax` + `gate` script. → verify: first run reports exactly the known failures (fg3 pairs if A not applied, reduced-motion missing, hex in histogram if step 5 slipped); then green; then inject `transition:.3s` and a `#fff` in `@layer comp` → both red → revert.
7. `gates/layout.js`. → verify: prints `cls=0`; make the wallet wrapper append instead of replace → non-zero → revert. Risk: `--virtual-time-budget` finishing before a dynamic `import()` resolves — check once; fallback `--timeout=3000`.
8. `test/signals.test.js` — port of `S/mini/test4.mjs` to `bun:test`. → verify: `bun test` 8 passing.
9. Tier-2 proof: `src/islands/svelte-demo.js` + `Demo.svelte` **and a second Svelte island** (so a shared runtime chunk exists) → verify: `bun ./build.js` prints `preload: <link rel=modulepreload href="/i/c-….js">`; it's in `<head>`; `grep -l c- dist/i/*.js` = 2; in the preview pane the runtime chunk is fetched **before** any gesture and tapping the island fetches only the island file; `layout.js` still `cls=0`. This closes §9 "Svelte 4 island runtime smoke test". Keep both demos in the starter as the worked example; the README says to delete them (and lose the one preload subrequest) when a μApp has no Svelte view.
10. Errata in `ui-whitepaper.md` (§3.3 fg3, §5.3 rule 4, §6 toolchain row, Appendix A idiomatic floors, contrast-script note) each with `measured 2026-09-14`; rename `reference/contrast.mjs`→`.js`, `measure.mjs`→`.js`; `launch.json`: keep `mui-preview`, replace the three foreign entries with `{ "name":"μapp", "runtimeExecutable":"bun", "runtimeArgs":["./dev.js"], "port":5181 }`. → verify: `git diff --stat ui-whitepaper.md` touches only those sections; `bun ./dev.js` serves `dist/` and rebuilds on a `src/` edit.

## Verification (end-to-end)

- `bun run build` = build + all gates, exit 0; prints per-tier brotli.
- `bun test` green (8 signal cases).
- Deliberate violations turn each gate red (step 6/7) — proves gates are live (§8).
- Preview pane on `bun ./dev.js`: `performance.getEntriesByType('resource').length` = 0 before any gesture (or exactly 1 = the runtime preload when step 9's islands are present); each tap fetches only its island; CLS observer 0 after every adoption; all four `data-t` themes render; `dist/index.html` under 9,216 B with all islands registered.
- Wallet island in a real browser with an injected provider: `connect()` resolves an account, `balance()` returns a value; no signing library shipped.

## Risks
- `--dump-dom` + virtual time vs dynamic `import()` (step 7). `fs.watch` recursive on macOS under Bun (one touch verifies). `Bun.Glob().scan` signature (`bun -e "console.log(await Array.fromAsync(new Bun.Glob('*.js').scan('src/islands')))"`).
- viem minor bumps can move the wallet island across 12,288 B — the size gate is the tripwire.
- `c-[hash]` chunk names change on any runtime change; only matters if CDT (§5.3 rule 7) is attempted later.

---

## Status — completed 2026-09-14

All ten steps are done and verified; `bun run build` (build + six gates) and `bun test` are green.

| step | shipped | verification |
| :-- | :-- | :-- |
| 0 | this file | present at `design/implementation.md` |
| 1 | `package.json`, `.gitignore`, `bun install` | svelte 4.2.20, viem 2.56.5 installed |
| 2 | `src/p0/` (`index.tmpl.html` + css/js), `--fg3` light → `#5f6b7d`, reduced-motion block | CSS parity with the frozen reference apart from the two intended additions |
| 3 | `svelte4.js`, `build.js` | pre-island parity 3,116 B vs frozen 3,081 B brotli |
| 4 | lazy loader + literal `/i/*` map | 4 island entries, `dist/index.html` 3,701 B brotli |
| 5 | `histogram.js` (577 B), `wallet.js` (764 B, no ABI library) | token fills only; no signing library; viem trimmed to the withdraw set |
| 6 | `gates/{size,contrast,palette,motion,syntax}.js` | each turned red on a deliberate violation, then green |
| 7 | `gates/layout.js` | CLS 0.0000; a 300 px insert scores 0.0364 and fails; a second `[data-p]` fails |
| 8 | `test/signals.test.js` | 8 pass, 16 assertions |
| 9 | two Svelte islands → shared runtime chunk `c-*.js` 8,990 B (Svelte 5, Vite) + eager `<link rel=modulepreload>` | both islands import it; it is fetched before any gesture, each island only on adoption |
| 10 | whitepaper errata (§3.2, §3.3, §5.3 r4, §6, §8, App. A, App. B), `reference/*.mjs` → `.js`, `launch.json` | errata cited `measured 2026-09-14`; `μapp` on :5181 |

Two findings from step 7 worth keeping (both are now comments in `gates/layout.js`):

- **`--dump-dom` cannot measure CLS.** It dumps at `load`, before adoption. Adding `--virtual-time-budget`
  yields the adopted DOM but produces no rendering frames, and `layout-shift` entries are only emitted during
  frame production: a 300 px block injected at the top of the page measured **0.0000**. The gate therefore
  drives Chrome over the DevTools protocol (Bun's built-in `WebSocket`, no dependency), where the same
  injection measures **0.0364**. Navigation happens *after* attaching, or `Runtime.evaluate` fails with
  `-32000 Execution context was destroyed`.
- **A gate must prove it observed something.** The first version reported CLS 0 while three of the four
  islands had never loaded (the probe only clicked `[data-on]` elements, and rapid `scrollIntoView` kept the
  `visible` island from ever intersecting). It now asserts every `dist/i/*.js` entry appears in
  `performance.getEntriesByType('resource')` before trusting the zero, and uses a tall window instead of scrolling.

### Stack change — Svelte 5 + Vite for the island tier (2026-09-14)

Svelte 4's last release was 2025-05-20; 5.57.0 shipped 2026-08-28. New work should not start on a frozen
branch, and the architecture makes the switch cheap: P0 ships no framework, the design system is CSS, and the
only Svelte in a μApp is its island components (~60 lines here; porting them to runes moved bytes by 0.3%).

**What changed:** `build.js` builds tier 3 with Vite/Rollup instead of `Bun.build`; `svelte4.js` is deleted;
`src/islands/*.svelte` are runes components; `src/islands/_boundary-stub.js` replaces Svelte's root
`<svelte:boundary>` (`_`-prefixed files are excluded from the island glob). Bun still builds P0, serves dev,
runs the gates and the tests.

**Why Rollup and not Bun** (same components, same Svelte 5.57.0, same patches): shared runtime chunk
**8,244 B vs 11,946 B**. Bun resolves `esm-env`'s `production` condition but keeps `DEV` an imported binding,
so `if (DEV)` never folds and every dev branch ships — it took a hand-written rewrite plugin to get Bun from
18,971 B to 11,946 B, which is 97% of the 12,288 B chunk gate. Rollup folds it natively and also shook 688 B
out of the viem island. Two gotchas cost a build each: Vite app builds default to
`preserveEntrySignatures: false`, which tree-shook an island's exported mount function away entirely (201 B of
nothing), and `resolve.alias` matches raw import ids, so stubbing a Svelte internal needs a resolver plugin.

**Cost of the move**, live numbers: the Svelte tier goes 4,190 B → 11,562 B (runtime chunk 8,990 · islands 332
and 2,183); wallet *dropped* 10,123 → 9,435 B; P0 is unchanged at 3,706 B. Chunk gate headroom: 73%.
`sideEffects: false` on the svelte package would save ~750 B more but needs a maintained patch — left off until
the gate gets tight. The proxy stub (another ~1.5 KB) is deliberately **not** used: it makes `list.push(x)`
stop rendering silently.

### Tree-shaking, after the switch (2026-09-14)

Asked what else could be shaken, four things were measured. Two were worth nothing and two were worth 9 KB:

| lever | result |
| :-- | :-- |
| `sideEffects: false` on svelte (patch **or** a Rollup `moduleSideEffects` plugin over 1,054 modules) | **0 B.** Byte-identical output, same chunk hash. Rollup already shakes everything the flag would enable — don't add a patch file for it |
| `treeshake: { propertyReadSideEffects: false, tryCatchDeoptimization: false }` | **0 B** on the chunk, +2 B on an island |
| dropping a pointless `{#each}` key | **0 B** |
| **precomputed selectors + local static-word ABI coding in the wallet island** | **9,435 → 764 B (−92%)** |

The wallet finding is the general one: `encodeFunctionData` hashes a string literal that can never change, and
that hash reaches `isAddress` → `checksumAddress` → keccak (`@noble/hashes` sha3 + utils, 4.5 KB raw), while
`decodeAbiParameters` statically imports the same path for address *outputs* we never decode. Every call a
token μApp makes is a 4-byte selector followed by 32-byte static words. `test/abi.test.js` checks the local
coder against viem on ~30 addresses × 18 amounts, round-trips the decoder, and pins the one divergence
(no EIP-55 checksum verification). viem moved to devDependencies: **the μApp now has no runtime dependency
at all.**

### Bundle analysis

`ANALYZE=1 bun ./build.js` adds `rollup-plugin-visualizer` to the island build and writes `dist/stats.html`
(a brotli-weighted treemap) plus `dist/stats.json`; `bun ./analyze.js [chunk-prefix]` builds and prints the
ranked table. Analysis only — a normal build emits neither, and `build.js` wipes `dist/` first, so nothing
leaks into a deploy. Note the two size modes are mutually exclusive: with `sourcemap: true` the plugin
attributes post-minification bytes but reports no gzip/brotli, so the ranking uses rollup's module map and
compresses each module *alone* — real shared-stream cost is lower.

What it says after the wallet fix (top of 39 modules): `batch.js` 7,151 · `runtime.js` 4,520 ·
`each.js` 3,620 · `effects.js` 3,178 · `deriveds.js` 2,766 · `events.js` 2,184 · `sources.js` 2,094 ·
`proxy.js` 1,940. All of it is the Svelte signal engine and the DOM blocks our two components actually use.

Three stubs were examined and **all three rejected** — the build now patches nothing inside Svelte:

- `proxy.js` (~1.5 KB): breaks `list.push(x)` **silently** — stock renders 3-2, stubbed renders 1-0.
- `reactivity/async.js` (~400 B): its `flatten` sits on the attribute-update path.
- `dom/blocks/boundary.js` (**935 B**, measured in the real island tier rather than the bench floor's 2,269):
  removed 2026-09-14. A `<svelte:boundary>` anyone adds later would render its children and never catch —
  the same silent-failure class as the proxy stub, and no gate can see it. The chunk went 8,990 → 9,925 B,
  81% of budget, and `build.js` lost its resolver plugin entirely.

Also checked, since runes-only components were supposed to drop it: **no v4 legacy/store interop ships** —
`store_get`, `store_set`, `subscribe_to_store`, `$$props` and `createSubscriber` are all absent from the
chunk; the single "legacy" hit is a `Symbol("legacy props")` description in the constants table.

And Svelte 5 signals cannot replace P0's engine: `$state`/`$derived`/`$effect` in a `.svelte.js` module, with
no `mount()` and no DOM blocks, is **6,115 B brotli against the hand-rolled 653 B** — 9.4×, two thirds of the
whole P0 budget for reactivity alone. The two reactivity systems stay separate by measurement, not taste.

### Rule 7 applies to inline islands too (2026-09-14)

The layout gate started failing **1 run in 6** with exactly 0.0180, spread across five sources. Frame-by-frame
sampling caught it: the shift fires at **t ≈ 26 ms**, before any island is adopted, with elements moving *down*
(the wallet section 707 → 949). Cause: `data-island=timeline` and `data-island=amount` shipped as **empty**
`<section>`s, so the first paint showed two empty cards and the inline module script pushed everything below
them down. It only appeared when first paint beat the inline script — a race that is far more likely on a real
network than on localhost.

The fix is the rule the lazy islands already follow: static markup matching what the island renders, adopted
with `replaceChildren`. P0 went 3,707 → 3,844 B brotli (+137 B) and the gate is 8-for-8 clean. Worth recording
that this defect was in `reference/p0/` from the start and no amount of local testing had surfaced it — a
flaky gate was the only reason it was found.

### What is minified, and by what (2026-09-14)

- **Inlined JS: minified.** `Bun.build({minify:true})`, then — added 2026-09-14 — a terser pass over Bun's
  own output, worth **110 B raw / 40 B brotli** (document 3,844 → 3,792). Trivial anywhere else; P0 is the one
  place 40 B of a 9,216 B flight justifies a second pass, and terser is already present for the island tier.
- **Inlined CSS: not minified by any tool, deliberately.** `p0.css` is authored in final form and the build
  only strips newlines and shortens `::before`/`::after`. Re-verified against Bun 1.4.2: its CSS minifier still
  lowers all 24 `light-dark()` calls to `var(--buncss-light,…)var(--buncss-dark,…)` pairs and comes out
  **+771 B raw / +70 B brotli** — bigger *and* it rewrites the token system Appendix B specifies. The source
  contains no comments, no double spaces and exactly one `;}`, so there is nothing left for a minifier to take.

Noted while checking: `p0.js` carries a `[data-set-theme]` click handler but the template has **no such
element** (the frozen reference did). It costs **57 B brotli** — either wire a theme switcher into the demo or
drop the handler; left as-is pending that call.

### Compression context sharing (2026-09-14)

Measured with prefix compression (`size(dict+file) − size(dict)`), since neither Node's brotli nor any local
CLI exposes a custom dictionary. Three levers, in descending order of value:

1. **Fewer chunks.** Merging files *is* context sharing, and it is the largest effect available: the same 24
   components cost 5,338 B in one lazy chunk and 14,808 B split across twelve (Svelte 4; +58% for Svelte 5).
2. **Inline CSS in the document.** Marginal cost ~19% of raw inside the P0 stream against ~31% standalone,
   because new rules share property and token vocabulary with the CSS already there. **JS gets no such
   discount** — the same payload compresses to 36.1% standalone and 36.1% inlined, measured — so inlining JS
   buys the round trip and zero bytes.
3. **CDT for redeploys.** The build now qualifies: byte-deterministic, and a one-word component change
   perturbs 0 bytes of the shared chunk (the whitepaper's mangling-stability warning was a Bun artifact).
   With v1 as dictionary: unchanged files 3–7 B, changed island 328 → 53 B. Same-deploy cross-artifact
   dictionaries are a dead end — 7–30% on files that must already be cached for the dictionary to exist.

Blocked on the edge, not on us: GitHub Pages returns **identity** when only `br`/`zstd` are offered and gzip
otherwise, so the μApp is served as ~4,2xx B gzip rather than 3,844 B brotli, and `Use-As-Dictionary` is
unavailable. CDT needs an origin that can emit it and serve `Content-Encoding: dcb`/`dcz`.

### How GitHub Pages compresses, and whether we can pre-compress (2026-09-14)

Pages gzips **on the fly**, at roughly level 9 — live `encodedBodySize` matched local `gzip -9` within 10 B
across every artifact, so on-wire size can be predicted locally. No brotli and no zstd: the edge returns
*identity* when only `br`/`zstd` are offered. `vary: Accept-Encoding`, `cache-control: max-age=600`, HTTP/2.

**Pre-compressed uploads do not work.** Tested on the live site with four variants of the same 27,828 B chunk,
then removed:

| uploaded as | content-type | content-encoding | usable |
| :-- | :-- | :-- | :-- |
| `t.js` (raw) | `application/javascript` | `gzip` (10,982 B) | yes — the normal path |
| `t.js.br` (brotli bytes) | `application/octet-stream` | **`gzip`** (9,953 B) | no — Pages gzips our brotli *again* |
| `t.js.gz` (gzip bytes) | `application/gzip` | none (10,960 B) | no — served as a file to download |
| `t-br-inside.js` (brotli bytes, `.js`) | `application/javascript` | `gzip` (9,953 B) | no — browser ungzips, then parses brotli as JS |

Pages has no header configuration (no `_headers`, no `.htaccess`), so `Content-Encoding: br` can never be set.
A self-extracting shim is a dead end too: `DecompressionStream` supports gzip/deflate/deflate-raw but **not**
brotli, and a JS/WASM brotli decoder costs tens of KB to save ~1 KB.

**What the gzip-only edge costs us:** +12% overall (17,579 B brotli → 19,691 B gzip); the document 3,815 →
4,348 B. Live bench of a cold load with every island adopted: 20,532 B transferred for 46,025 B decoded,
TTFB 390 ms, HTTP/2.

**Per-request overhead is 300 B**, measured consistently (`transferSize − encodedBodySize` on all five
resources). That is a second, independent argument for coarse chunking: an extra island costs its payload
*plus* 300 B of wire, on top of the compression context it loses.

So the options are to accept gzip and keep optimising raw size, or move a μApp to an edge that serves brotli
(and could then also do CDT) — worth ~2.1 KB per cold visit at today's size.

### Why the island tier is not inlined too (2026-09-14)

P0's own JS *is* inlined — the 3,815 B document is markup + CSS + the 653 B engine + both inline islands.
The question is whether the lazy tier should join it. Measured:

| first flight would carry | brotli | gzip (the wire) | |
| :-- | --: | --: | :-- |
| document as shipped | 3,815 | 4,358 | 48% of the flight |
| + histogram | 4,282 | 4,876 | |
| + histogram + wallet | 4,965 | 5,610 | |
| + those + both Svelte islands | 7,153 | 8,070 | 90% of the flight |
| + the Svelte runtime chunk | 16,676 | 18,715 | **over budget by 7,460 B** |

The irony is that the chunk you would *most* want inlined is the only one that cannot fit: the Svelte runtime
is eagerly preloaded on every visit anyway, so it already behaves like part of P0 while costing an extra
request — and at 9,925 B it is larger than the entire flight budget.

Timing, headless Chrome at 4× CPU throttle, gzip responses, two runs each: **FCP is unchanged** (228 / 228 vs
228 / 224 ms) because `type=module` scripts are deferred and never block paint. What inlining moves is
`domInteractive` **+30 ms** and `load` **+172 ms** — the parse and execute of code most visitors never run.
(Network throttling could not be made to apply in this environment, so there is no bandwidth claim here.)

The three standing reasons to keep the tier separate:

1. **Headroom.** 4,358 B leaves room for the app to grow; 8,070 B does not. Crossing ~9 KB costs *every*
   visitor a second round trip before first paint.
2. **Cache granularity.** The document is `max-age=600`; island chunks are content-hashed and effectively
   immutable. Inlining couples them, so a one-line island change re-sends the document to everyone.
3. **Waste.** Wire overhead is 300 B per request (measured live), so inlining a small island saves 300 B and
   an RTT *for visitors who use it*, and costs its full size for those who don't.

The honest exception: `histogram.js` (577 B) is `data-on=visible` and loads on any viewport that shows the
chart, which is most desktops. Inlining just that one is defensible — it would trade 467 B of document for one
fewer request. Left lazy for now because it is genuinely below the fold on a phone.

### The 9 KB budget, tested (2026-09-15)

The whole design language rests on "one flight ≈ 9 KB", derived from congestion-window arithmetic and never
measured. It is now measured, against the edge we ship to, by publishing a ladder of incompressible files and
watching `time_total − time_starttransfer` over cold connections:

| response body | download phase | |
| --: | --: | :-- |
| 8,192 B | 0.2 ms | one flight |
| 9,216 B | 0.3 ms | one flight — **our gate** |
| 9,472 B | 1.2 ms | one flight |
| **9,728 B** | **47.2 ms** | **+1 RTT — the boundary** |
| 10,240 B | 48.2 ms | +1 RTT |
| 49,152 B | 103.1 ms | +2 RTT |

RTT ≈ 49 ms throughout, 9–11 cold connections per size, medians. The estimate was right within ~5% and the
gate has ~250 B of margin. **The 15 KB figure does not hold here** — that is TCP IW10 × 1460 B with no
handshake or header cost, and 10,240 B already pays a full round trip. HTTP/2 response headers (~300 B) come
out of the same window.

The live document is 4,348 B gzip with a 0.2 ms download phase: comfortably one flight, 46% of the measured
boundary. The runtime chunk at 10,982 B gzip pays a full 48.4 ms extra — the boundary reproduces on real
artifacts, not just probe files.

**Protocol: HTTP/2 over TCP.** Pages advertises no `alt-svc`, so it serves no h3; the whitepaper's QUIC
arithmetic is not the mechanism here, it just happens to land within 5% of the same number.

**Methodology trap: do not measure this in a browser.** Chrome's navigation timing called the same 10,982 B
response "one flight" (3.5–8.7 ms) where curl measured +1 RTT across nine cold connections. Two tools, one
observable, and only curl matched the ladder. An h3 comparison against a Cloudflare origin (no RTT step up to
77 KB) could only be run in Chrome, so it is unverified and is *not* a basis for raising any budget.

Also worth knowing: curl sends no `Accept-Encoding` by default, so it measures identity transfers. The first
comparison I ran that way looked like a contradiction until I noticed curl was fetching 11,116 B where Chrome
fetched 4,348 B of the same URL.

### Deployment

`deploy.js` publishes the design site to **https://decouple.co/design/**:

| path | what | source |
| :-- | :-- | :-- |
| `/design/` | the design language page: philosophy (budget from physics, three layers, the seven rules and the gate that enforces each, tiering with the demo's live bytes) followed by the recipe gallery in four themes | `preview.html`, hand-authored, one file, zero subrequests |
| `/design/app/` | the μApp starter, as a working demo | `dist/`, built with `BASE=/design/app` |

`decouple.co` is a GitHub Pages *project* site (repo `decoupleco/decouple.co`, branch `gh-pages`, `CNAME`), and
there is no `decoupleco.github.io` org site, so `/design/` has to live inside that branch rather than in its own
repository. The script builds, runs the gates, clones `gh-pages` into a temp worktree, replaces `design/`,
commits, and pushes only with `--push`.

Published 2026-09-14: commits `e16c8c3` (μApp at `/design/`) and `2651b40` (restructured — design page at
`/design/`, demo moved to `/design/app/`). Live: the design page is 20,318 B gzip in one request; the μApp
document is 4,260 B gzip, and a cold load fetches exactly two more files — the shared runtime (eager
`modulepreload`) and the histogram island, which is in view on arrival. Everything else waits for a tap.

The demo deliberately has no link back to the design page: it is a starter template, and a backlink would
follow everyone who copies it. The design page is the entry point.

Edge facts measured 2026-09-14: GitHub Pages serves HTTP/2 with **gzip only** — no brotli, no Early Hints — so
the P0 document arrives as ~4,260 B gzip rather than 3,701 B brotli. Still one round trip, still inside the
9,216 B budget; §5.3's "add 103 Early Hints at the edge" is not available on Pages.
