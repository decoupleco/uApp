// Rule 3 "Text never floats": every (text, surface) pair ≥ 4.5:1 in BOTH luminances.
// Parses the tokens that actually ship — both light-dark() arms of @layer theme — in BOTH places the palette
// is defined: src/p0/p0.css (the μApp) and preview.html (the design site, which paper.js and blocks.js lift
// their tokens from). The gate cannot drift from the CSS, and the two sources cannot drift from each other
// unnoticed: a token present in one and missing in the other fails here.
const hex6 = h => h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h.toLowerCase();
const parse = css => {
  const start = css.indexOf('@layer theme{');
  let depth = 0, end = start + 12;
  for (; end < css.length; end++) { if (css[end] === '{') depth++; else if (css[end] === '}' && --depth === 0) break; }
  const T = { light: {}, dark: {} };
  for (const [, name, l, d] of css.slice(start, end).matchAll(/--([\w-]+):light-dark\((#[0-9a-f]{3,6}),(#[0-9a-f]{3,6})\)/gi)) { T.light[name] = hex6(l); T.dark[name] = hex6(d); }
  return T;
};
const SOURCES = { 'src/p0/p0.css': parse(await Bun.file('src/p0/p0.css').text()), 'preview.html': parse(await Bun.file('preview.html').text()) };

const lum = h => { const c = h.slice(1).match(/.{2}/g).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);

// text-on-surface pairs used by the recipes (.d / .eyebrow are --fg3 and sit inside data-v panels too)
const PAIRS = [['fg','n0'],['fg','n1'],['fg2','n0'],['fg2','n1'],['fg3','n0'],['fg3','n1'],['fg3','n2'],
  ['ac-f','ac-s'],['ok-f','ok-s'],['wa-f','wa-s'],['no-f','no-s'],['ac-f','n0'],['ok-f','n0'],['wa-f','n0'],['no-f','n0'],['on-ac','ac'],
  ['fg3','ac-s'],['fg3','ok-s'],['fg3','wa-s'],['fg3','no-s'],
  ['on-tb','tb'],['on-tq','tq']];                                   // token-icon letters on their discs
let bad = 0, n = 0, worst = 99;
for (const [file, T] of Object.entries(SOURCES)) for (const mode of ['light', 'dark']) for (const [f, s] of PAIRS) {
  if (!T[mode][f] || !T[mode][s]) { console.log(`  FAIL ${file} ${mode} ${f} on ${s}: token missing`); bad++; continue; }
  const r = ratio(T[mode][f], T[mode][s]); n++; worst = Math.min(worst, r);
  if (r < 4.5) { console.log(`  FAIL ${file} ${mode.padEnd(5)} ${f.padEnd(6)} on ${s.padEnd(5)} ${r.toFixed(2)}`); bad++; }
}
const a = SOURCES['src/p0/p0.css'], b = SOURCES['preview.html'];
for (const k of new Set([...Object.keys(a.light), ...Object.keys(b.light)])) if (a.light[k] && b.light[k] && (a.light[k] !== b.light[k] || a.dark[k] !== b.dark[k])) { console.log(`  FAIL --${k} differs between p0.css and preview.html`); bad++; }
console.log(bad ? `  ${bad} contrast violation(s)` : `  ok   ${n} pairs ≥ 4.5:1 across both sources, worst ${worst.toFixed(2)} (${Object.keys(a.light).length} tokens)`);
process.exit(bad ? 1 : 0);
