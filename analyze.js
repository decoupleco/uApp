// Ranks what actually survives into the island tier, brotli-weighted, from the visualizer's own data.
//   bun ./analyze.js            → whole island graph
//   bun ./analyze.js c-         → only the chunk whose name starts with c-
import { visualizer } from 'rollup-plugin-visualizer';

process.env.ANALYZE = '1';
await import('./build.js');

const raw = await Bun.file('dist/stats.json').json().catch(() => null);
if (!raw) { console.log('\nno stats.json — run with ANALYZE=1'); process.exit(0); }
const filter = process.argv[2];
const rows = new Map();
for (const [uid, part] of Object.entries(raw.nodeParts)) {
  const meta = raw.nodeMetas[part.metaUid];
  if (!meta) continue;
  const bundles = Object.keys(meta.moduleParts || {});
  if (filter && !bundles.some(b => b.includes(filter))) continue;
  const name = (meta.id || uid).replace(/.*node_modules\//, '').replace(/^\/?src\//, 'src/');
  rows.set(name, (rows.get(name) || 0) + (part.brotliLength || part.renderedLength));
}
const total = [...rows.values()].reduce((a, b) => a + b, 0);
const unit = Object.values(raw.nodeParts).some(p => p.brotliLength) ? 'brotli' : 'minified';
console.log(`\n${filter ? `chunks matching "${filter}"` : 'island tier'}: ${rows.size} modules, ${total} B ${unit}` + (unit === 'brotli' ? ' (each module compressed alone — the shared stream is smaller)\n' : '\n'));
for (const [k, v] of [...rows].sort((a, b) => b[1] - a[1]).slice(0, 20))
  console.log(`${String(v).padStart(6)} B  ${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
