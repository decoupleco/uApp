// build.js — run as `bun ./build.js` (never `bun build.js`: `build` is a bun subcommand).
// Tier 1: src/p0 → ONE document, CSS + JS inlined, zero subrequests.
// Tier 3: src/islands/*.js → dist/i/<name>.js (lazy, explicit map in p0.js), chunks c-<hash>.js.
// Tier 2: a chunk shared by ≥ 2 islands (the Svelte runtime) gets an eager <link rel=modulepreload>.
import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { brotliCompressSync, constants as Z } from 'node:zlib';

// BASE: mount path when the μApp is served from a sub-path (e.g. BASE=/design for decouple.co/design). Default: site root.
const BASE = (process.env.BASE || '').replace(/\/$/, '');
const fail = logs => { console.error(logs.map(String).join('\n')); process.exit(1); };
const br = buf => brotliCompressSync(buf, { params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_LGWIN]: 24 } }).length;
const base = p => p.split('/').pop();

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/i', { recursive: true });

// (c) tier 3 — Vite/Rollup, not Bun.build, and no patches into Svelte's internals. Stubbing the root
// <svelte:boundary> saves 935 B, and stubbing the $state proxy another ~1.5 KB, but both fail silently
// (a boundary that never catches; `list.push(x)` that stops rendering) — the gate is for bytes, not for
// correctness. Measured 2026-09-14 on identical components (Svelte 5.57.0):
// Rollup folds esm-env's DEV statically and shakes the svelte graph harder, so the shared runtime chunk is
// 9,925 B against Bun's 13,035 B — which does not fit the 12,288 B gate at all, and Bun only reached even
// that with a hand-written DEV-rewrite plugin. Bun still builds P0, serves dev, and runs the tests.
const islands = [];
if (existsSync('src/islands'))
  for await (const f of new Bun.Glob('*.js').scan('src/islands')) islands.push(`src/islands/${f}`);

let preload = '';
if (islands.length) {
  const { build: viteBuild } = await import('vite');
  const { svelte } = await import('@sveltejs/vite-plugin-svelte');
  // ANALYZE=1 bun ./build.js → dist/stats.html, a brotli-weighted treemap of the island graph, plus a
  // ranked table in the terminal. Analysis only; it never runs in a normal build or in CI.
  const analyze = process.env.ANALYZE ? [(await import('rollup-plugin-visualizer')).visualizer({
    filename: 'dist/stats.html', template: 'treemap', brotliSize: true, gzipSize: false, sourcemap: true,
    title: 'μApp island tier',
  }), (await import('rollup-plugin-visualizer')).visualizer({
    filename: 'dist/stats.json', template: 'raw-data', brotliSize: true, gzipSize: false,
  })] : [];
  const res = await viteBuild({
    root: process.cwd(), logLevel: 'error', configFile: false,
    plugins: [...analyze, svelte({ compilerOptions: { discloseVersion: false, runes: true, css: 'injected' } })],
    build: {
      outDir: 'dist/i', emptyOutDir: true, target: 'es2023', sourcemap: !!process.env.ANALYZE, modulePreload: { polyfill: false },
      minify: 'terser',
      // ecma:2020 lets terser emit optional chaining and arrow shorthands (−36 B); compact drops the
      // whitespace between modules (−8 B). Measured 2026-09-15 and rejected as worth 0 B on this graph:
      // generatedCode:'es2015', hoistTransitiveImports:false, experimentalMinChunkSize, terser passes>3,
      // sideEffects:false on svelte, and rollup's unsafe treeshake flags.
      terserOptions: { compress: { passes: 3, ecma: 2020, unsafe: true, pure_getters: true, toplevel: true, module: true, drop_console: true }, mangle: { toplevel: true, safari10: false }, format: { comments: false, ecma: 2020 } },
      rollupOptions: {
        // app builds default to preserveEntrySignatures:false, which tree-shakes an island's exported
        // mount function away entirely — the first build of this came out as 201 B of nothing.
        preserveEntrySignatures: 'strict',
        input: islands.map(f => resolve(f)),
        output: { entryFileNames: '[name].js', chunkFileNames: 'c-[hash].js', compact: true },
      },
    },
  });
  const outputs = res[0]?.output ?? res.output;
  // (e) tier 2 — a non-entry chunk imported by ≥ 2 island entries is the shared runtime: preload it eagerly
  const entries = outputs.filter(o => o.type === 'chunk' && o.isEntry);
  preload = outputs
    .filter(o => o.type === 'chunk' && !o.isEntry && entries.filter(e => e.imports.includes(o.fileName)).length >= 2)
    .map(o => `<link rel=modulepreload href="${BASE}/i/${o.fileName}">`).join('');
}

// (a) tier 1 JS → string. `/i/*` stays external so the literal import('/i/x.js') map survives verbatim.
const js = await Bun.build({ entrypoints: ['src/p0/p0.js'], target: 'browser', format: 'esm', minify: true, external: ['/i/*'] });
if (!js.success) fail(js.logs);
// A terser pass over Bun's own minified output is worth 110 B raw / 40 B brotli here (measured 2026-09-14).
// Trivial anywhere else; P0 is the one place where 40 B of a 9,216 B flight is worth a second pass, and
// terser is already here for the island tier. gates/layout.js drives the result in a real browser.
const { minify } = await import('terser');
const min = await minify(await js.outputs[0].text(), {
  compress: { passes: 3, unsafe: true, unsafe_arrows: true, pure_getters: true, toplevel: true, module: true, drop_console: true },
  mangle: { toplevel: true }, format: { comments: false }, module: true,
});
// the literal island map is written against the site root; rebase it when mounted under BASE
const p0js = min.code.replaceAll('"/i/', `"${BASE}/i/`);

// (b) tier 1 CSS — NOT Bun.build: its CSS pipeline lowers light-dark() into var pairs, changing Appendix B.
// p0.css is authored in final form; strip newlines only.
const p0css = (await Bun.file('src/p0/p0.css').text()).replace(/\n/g, '').replace(/::(before|after)/g, ':$1');

// (f) template slots — replacer FUNCTIONS: the inlined JS contains `$` sequences.
const html = (await Bun.file('src/p0/index.tmpl.html').text())
  .replace('<!--preload-->', () => preload)
  .replace('<!--css-->', () => p0css)
  .replace('<!--js-->', () => p0js);
await Bun.write('dist/index.html', html);

// report
const row = (name, buf) => console.log(`  ${name.padEnd(28)} raw ${String(buf.length).padStart(6)}  brotli ${String(br(buf)).padStart(6)}`);
row('dist/index.html', Buffer.from(html));
if (islands.length) for await (const f of new Bun.Glob('*.js').scan('dist/i')) row(`dist/i/${f}`, await Bun.file(`dist/i/${f}`).bytes());
console.log(preload ? `  tier-2 preload: ${preload}` : '  tier-2 preload: none (no chunk shared by ≥ 2 islands)');
