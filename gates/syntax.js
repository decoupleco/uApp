// Clean 2026 ESM: what ships is **ES2021** ESM — the level measured smallest for this graph (build.js says
// why), and the one with the widest support: Safari 14 / Chrome 85 / Firefox 79, all 2020. Fails on ES2022+
// syntax or APIs and on any CommonJS interop (Bun/esbuild wrappers or bare require) in dist/.
// Regex `v`-flag detection is omitted (unreliable on minified code).
const NEWER = [
  // ES2022
  /[{;}]\s*#[A-Za-z_$][\w$]*\s*[=;(]/, /\bstatic\s*\{/, /\.at\(/, /\bObject\.hasOwn\b/,
  // ES2023
  /\.toSorted\(/, /\.toReversed\(/, /\.toSpliced\(/, /\.findLast(Index)?\(/,
  // ES2024+
  /\bObject\.groupBy\b/, /\bMap\.groupBy\b/, /\bPromise\.withResolvers\b/, /\bArray\.fromAsync\b/,
  /(^|[\s;{(])@[A-Za-z_$][\w$]*\s*(class|[A-Za-z_$])/,
];
const CJS = [/\b__commonJS\b/, /\b__require\b/, /\bmodule\.exports\b/, /(^|[^.\w$])require\(/, /\b__toESM\b/, /\b__toCommonJS\b/];
let bad = 0;
const files = ['dist/index.html'];
for await (const f of new Bun.Glob('**/*.js').scan('dist')) files.push(`dist/${f}`);
for (const f of files) {
  let src = await Bun.file(f).text();
  // for the document, scan only the inline module — CSS `@layer`/`@media` would otherwise look like decorators
  if (f.endsWith('.html')) src = [...src.matchAll(/<script type=module>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  for (const re of NEWER) if (re.test(src)) { console.log(`  FAIL ${f}: post-ES2021 construct ${re}`); bad++; }
  for (const re of CJS) if (re.test(src)) { console.log(`  FAIL ${f}: CommonJS marker ${re}`); bad++; }
}
console.log(bad ? `  ${bad} syntax violation(s)` : `  ok   ${files.length} file(s): ES2021 ESM, no CommonJS`);
process.exit(bad ? 1 : 0);
