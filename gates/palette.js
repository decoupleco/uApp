// Rule 4 "Color is intent": the palette is closed. No colour literal outside @layer theme (p0.css) or in island
// sources; at most one [data-p] per view ([data-p] = the view's primary CTA, any intent — decided 2026-09-14).
const css = await Bun.file('src/p0/p0.css').text();
const start = css.indexOf('@layer theme{');
let depth = 0, end = start + 12;
for (; end < css.length; end++) { if (css[end] === '{') depth++; else if (css[end] === '}' && --depth === 0) break; }
const outsideTheme = css.slice(0, start) + css.slice(end + 1);
const LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|color)\(/gi;
let bad = 0;
const scan = (label, text) => { const hits = text.match(LITERAL) || []; if (hits.length) { console.log(`  FAIL ${label}: colour literal(s) ${[...new Set(hits)].slice(0, 6).join(' ')}`); bad++; } };
scan('src/p0/p0.css (outside @layer theme)', outsideTheme);
for await (const f of new Bun.Glob('**/*.{js,svelte}').scan('src/islands')) scan(`src/islands/${f}`, await Bun.file(`src/islands/${f}`).text());

// one primary per view. Islands ADOPT their container (identical markup), so an island's [data-p] replaces the
// static one rather than adding to it. Two checks: the document as first painted (markup only — not the CSS
// selectors, not the inline JS) has ≤ 1; and no single island source introduces more than 1.
const count = s => s.match(/data-p\b/g)?.length ?? 0;
const html = await Bun.file('dist/index.html').text();
const markup = html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
const primaries = count(markup);
if (primaries > 1) { console.log(`  FAIL ${primaries} [data-p] in the static markup (max 1)`); bad++; }
const sources = ['src/p0/isl-timeline.js', 'src/p0/isl-amount.js'];
for await (const f of new Bun.Glob('**/*.{js,svelte}').scan('src/islands')) sources.push(`src/islands/${f}`);
for (const f of sources) { const n = count(await Bun.file(f).text()); if (n > 1) { console.log(`  FAIL ${f} introduces ${n} [data-p]`); bad++; } }
// the count that matters is over the RENDERED view (P0's CTA comes from the inline amount island) —
// gates/layout.js asserts that on the fully adopted DOM. Here: static markup, and one per island source.
console.log(bad ? `  ${bad} palette violation(s)` : `  ok   no colour literals outside @layer theme; ${primaries} [data-p] in static markup; no island source adds a second`);
process.exit(bad ? 1 : 0);
