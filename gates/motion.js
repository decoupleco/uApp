// Rule 5 "Motion is meaning": no transition/animation longer than 180 ms; prefers-reduced-motion must switch it off.
const css = await Bun.file('src/p0/p0.css').text();
let bad = 0;
for (const [decl, v, unit] of css.matchAll(/(?:transition|animation)[^;{}]*?(\d*\.?\d+)(m?s)\b/g)) {
  const ms = unit === 's' ? +v * 1000 : +v;
  if (ms > 180) { console.log(`  FAIL ${ms} ms in "${decl.trim().slice(0, 60)}"`); bad++; }
}
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) { console.log('  FAIL no prefers-reduced-motion block'); bad++; }
console.log(bad ? `  ${bad} motion violation(s)` : '  ok   all durations ≤ 180 ms; reduced-motion block present');
process.exit(bad ? 1 : 0);
