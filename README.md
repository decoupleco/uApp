# μApp

A micro-app framework: **one document, one network flight, no runtime dependency.**

A μApp ships its whole first view as a single HTML file — markup, CSS and the JavaScript that makes it live,
all inlined, with zero subrequests. Anything heavier arrives afterwards, on a gesture. The starter in this
repository is 3,792 B brotli for the document, and it renders a four-theme, accessible, interactive surface.

- **Design language:** [decouple.co/design](https://decouple.co/design) — philosophy and the live recipe gallery
- **The paper:** [decouple.co/design/paper](https://decouple.co/design/paper) — `ui-whitepaper.md`, rendered
- **Live starter:** [decouple.co/design/app](https://decouple.co/design/app)

## Why 9 KB

The first flight of a cold connection is what paints; everything after it is a second round trip. Measured on
GitHub Pages over HTTP/2 (2026-09-15), a response of **9,472 B arrives in one flight and 9,728 B costs a whole
extra RTT** — so the budget is arithmetic, not taste. `gates/size.js` fails the build at 9,216 B.

## Quick start

```
bun install
bun run dev      # rebuild on change, serve dist/ (PORT, default 5181)
bun run build    # build + all six gates
bun test         # signal engine and ABI coder
```

## How it is put together

| tier | what | built by |
| :-- | :-- | :-- |
| **P0** | the document: markup + CSS + a 653 B signal engine, inlined | Bun |
| **tier 2** | the one chunk two islands share, eagerly `modulepreload`ed | Vite/Rollup |
| **tier 3** | islands, fetched on gesture: wallet 764 B · chart 577 B | Vite/Rollup |

Bun builds P0, serves dev and runs the gates; Rollup builds the island tier, because Bun cannot statically
fold `esm-env`'s `DEV` and its Svelte runtime chunk lands at 13,035 B against Rollup's 9,925 B — over the
12,288 B chunk budget. Components are Svelte 5 runes; plain JS everywhere else.

No runtime dependency ships. The wallet island encodes its own calldata — a 4-byte selector plus 32-byte
words — instead of shipping an ABI library; `viem` stays in `devDependencies` as the oracle `test/abi.test.js`
checks it against.

## The gates

`bun run build` fails on any of six checks against the built artifact:

| gate | what it refuses |
| :-- | :-- |
| `size` | P0 over 9,216 B brotli, any chunk over 12,288 B |
| `contrast` | any text/surface pair under 4.5:1, in either luminance |
| `palette` | a colour literal outside `@layer theme`, or a second primary CTA |
| `motion` | a transition over 180 ms, or a missing reduced-motion block |
| `syntax` | ES2024+ syntax, or any CommonJS marker, in what ships |
| `layout` | CLS above zero after every island adopts — driven in real Chrome over CDP |

The layout gate will not trust a zero unless every lazy island was actually fetched during the run. That check
is what caught the starter's own inline islands shipping empty containers, which made first paint jump
whenever it beat the inline script.

## Reading order

1. `ui-whitepaper.md` — the design language, and every measurement behind it
2. `implementation.md` — how the build was arrived at, including what was tried and rejected
3. `src/p0/` — the document: `p0.js`, `p0.css`, `index.tmpl.html`, and the 653 B `signals.js`
4. `src/islands/` — the lazy tier
5. `reference/p0/` — the frozen zero-framework artifact the paper cites

## Licence

MIT — see [LICENSE](LICENSE).
