// Rule 6 "Fits the flight": P0 ≤ 9,216 B brotli, every lazy chunk ≤ 12,288 B, P0 makes zero subrequests.
// brotli q11 / lgwin 24 — the same parameters as reference/p0/measure.js. Quote brotli, never gzip.
import { brotliCompressSync, constants as Z } from 'node:zlib';
const br = b => brotliCompressSync(b, { params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_LGWIN]: 24 } }).length;
let bad = 0;
const check = (f, max, n) => { const ok = n <= max; console.log(`${ok ? '  ok  ' : '  FAIL'} ${f.padEnd(28)} ${String(n).padStart(6)} B brotli  (≤ ${max})`); if (!ok) bad++; };

const html = await Bun.file('dist/index.html').text();
check('dist/index.html', 9216, br(Buffer.from(html)));
for await (const f of new Bun.Glob('*.js').scan('dist/i')) check(`dist/i/${f}`, 12288, br(await Bun.file(`dist/i/${f}`).bytes()));

// zero subrequests: no <script src>, no stylesheet link, no static import in the inline module (dynamic import() is the island map)
const inline = (html.match(/<script type=module>([\s\S]*?)<\/script>/) || ['', ''])[1];
const staticImport = /\bimport\b/.test(inline.replace(/import\(/g, ''));
if (/<script[^>]+\ssrc=|rel=stylesheet/i.test(html) || staticImport) { console.log('  FAIL P0 has a subrequest (script src / stylesheet / static import)'); bad++; }
process.exit(bad ? 1 : 0);
