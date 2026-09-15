// dev.js — `bun ./dev.js`: rebuild on any src/ change, serve dist/. Port from $PORT, default 5181,
// so a harness that assigns the port can do so without the server binding a different one.
// Not `bun ./index.html`: Bun's HTML dev server splits scripts/styles into separate assets with HMR,
// so the page it serves is never the inlined, zero-subrequest P0 the gates check.
// Cache policy for production edges: /i/<name>.js → Cache-Control: no-cache (ETag); /i/c-*.js → immutable.
import { watch } from 'node:fs';

const build = () => Bun.spawnSync(['bun', './build.js'], { stdout: 'inherit', stderr: 'inherit' });
build();
let t;
watch('src', { recursive: true }, () => { clearTimeout(t); t = setTimeout(build, 50); });

const port = Number(process.env.PORT) || 5181;

const server = Bun.serve({
  port,
  async fetch(req) {
    const p = new URL(req.url).pathname;
    const f = Bun.file('dist' + (p === '/' ? '/index.html' : p));
    return (await f.exists())
      ? new Response(f, { headers: { 'cache-control': p.startsWith('/i/c-') ? 'public,max-age=31536000,immutable' : 'no-cache' } })
      : new Response('404', { status: 404 });
  },
});
console.log(`μApp dev → http://127.0.0.1:${server.port}`);
