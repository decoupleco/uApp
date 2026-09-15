// Clean 2026 ESM: what ships is ES2023 ESM. Fails on ES2024+ APIs/syntax and on any CommonJS interop
// (Bun/esbuild wrappers or bare require) in dist/. Regex `v`-flag detection is omitted (unreliable on minified code).
const ES2024 = [/\bObject\.groupBy\b/, /\bMap\.groupBy\b/, /\bPromise\.withResolvers\b/, /\bArray\.fromAsync\b/, /(^|[\s;{(])@[A-Za-z_$][\w$]*\s*(class|[A-Za-z_$])/];
const CJS = [/\b__commonJS\b/, /\b__require\b/, /\bmodule\.exports\b/, /(^|[^.\w$])require\(/, /\b__toESM\b/, /\b__toCommonJS\b/];
let bad = 0;
const files = ['dist/index.html'];
for await (const f of new Bun.Glob('**/*.js').scan('dist')) files.push(`dist/${f}`);
for (const f of files) {
  let src = await Bun.file(f).text();
  // for the document, scan only the inline module — CSS `@layer`/`@media` would otherwise look like decorators
  if (f.endsWith('.html')) src = [...src.matchAll(/<script type=module>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  for (const re of ES2024) if (re.test(src)) { console.log(`  FAIL ${f}: ES2024+ ${re}`); bad++; }
  for (const re of CJS) if (re.test(src)) { console.log(`  FAIL ${f}: CommonJS marker ${re}`); bad++; }
}
console.log(bad ? `  ${bad} syntax violation(s)` : `  ok   ${files.length} file(s): ES2023 ESM, no CommonJS`);
process.exit(bad ? 1 : 0);
