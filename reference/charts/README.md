# Chart primitives — the measured artifacts behind research-data-portals.md

Built with the starter's pipeline (`target: 'es2021'`, terser, brotli q11) on 2026-10-17:

| file | brotli | what |
| :-- | --: | :-- |
| `spark.js` | 326 B | one polyline, coloured by the sign of the period change |
| `depth.js` | 466 B | cumulative bids and asks as two step-areas, mid line |
| `candles.js` | 774 B | candlesticks + volume + crosshair readout; one `<path>` per colour |
| `market.js` | 1,429 B | the three above + period control + metrics strip, as one island |

Against the same pipeline: uPlot 19,744 B, lightweight-charts 44,794 B (candle only — series do not shake),
React + Recharts 139,521 B. All colours are tokens (`var(--ok-f)` …), so the charts follow all four themes.
These are the primitives the `markets/` μApp will start from; they are not yet wired into a build.
