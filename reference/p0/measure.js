// bun measure.mjs <files...>  — prints raw / gzip / brotli bytes. Quote brotli, never gzip, for P0 budgets.
import {readFileSync} from 'node:fs'; import {brotliCompressSync, gzipSync, constants as C} from 'node:zlib';
for (const f of process.argv.slice(2)) {
  const b = readFileSync(f);
  const br = brotliCompressSync(b, {params: {[C.BROTLI_PARAM_QUALITY]: 11, [C.BROTLI_PARAM_LGWIN]: 24}}).length;
  console.log(`${f.padEnd(28)} raw ${String(b.length).padStart(6)}  gzip ${String(gzipSync(b,{level:9}).length).padStart(6)}  brotli ${String(br).padStart(6)}`);
}
