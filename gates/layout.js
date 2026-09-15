// Rule 7 "CLS = 0": load dist/ in headless system Chrome, adopt every lazy island, sum a layout-shift observer.
// Fails — never skips — when no Chrome/Chromium is found: a gate that cannot measure is off, and off is red.
// (happy-dom was rejected: no layout engine, so any dimension assertion there passes vacuously.)
//
// Driven over the DevTools protocol with Bun's built-in WebSocket — no npm dependency, and, unlike --dump-dom:
//   * --dump-dom fires at `load`, before any island has been adopted;
//   * --virtual-time-budget gets a post-adoption DOM but produces NO rendering frames, and `layout-shift`
//     entries are emitted during frame production — a 300 px block injected at the top of the page measured
//     0.0000 that way. Under CDP the same injection measures 0.036, so the zero here means something.
// Chrome is launched on about:blank and navigated AFTER the socket is attached: navigating a target you are
// already attached to destroys the execution context and Runtime.evaluate fails with -32000.
import { existsSync, rmSync } from 'node:fs';

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(existsSync);
if (!CHROME) { console.log('  FAIL layout gate needs Chrome or Chromium (none found)'); process.exit(1); }

// Runs in the page: observe shifts, adopt every island (staggered, so the `visible` island's observer fires),
// resolve with the total, the per-island attribution, and what was actually fetched.
const PROBE = `new Promise(done=>{
  let cls=0,by={};
  new PerformanceObserver(l=>{for(const e of l.getEntries()){if(e.hadRecentInput)continue;cls+=e.value;
    for(const s of e.sources||[]){const i=s.node&&s.node.closest&&s.node.closest('[data-island]');
      const k=i?i.dataset.island:'page';by[k]=+((by[k]||0)+e.value/(e.sources.length||1)).toFixed(4)}}})
    .observe({type:'layout-shift',buffered:true});
  const I=[...document.querySelectorAll('[data-island]')];
  I.forEach((el,i)=>setTimeout(()=>{el.scrollIntoView();el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))},i*250));
  setTimeout(()=>done({cls:+cls.toFixed(4),by,islands:I.length,primaries:document.querySelectorAll('[data-p]').length,
    js:performance.getEntriesByType('resource').map(e=>e.name.split('/').pop()).filter(n=>n.endsWith('.js'))}),I.length*250+2500);
})`;

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const p = new URL(req.url).pathname;
    if (p === '/') return new Response(await Bun.file('dist/index.html').text(), { headers: { 'content-type': 'text/html' } });
    // a BASE build asks for /<base>/i/x.js — serve the island tree wherever the document points at it
    const f = Bun.file('dist' + p.replace(/^.*(?=\/i\/)/, ''));
    return (await f.exists()) ? new Response(f) : new Response('404', { status: 404 });
  },
});

// Own --user-data-dir, or headless hands the URL to the already-running Chrome and nothing renders here.
// The static server lives in THIS process, so the spawn must be async — spawnSync would deadlock on /i/*.js.
// A tall window keeps every island in the viewport, so the `data-on=visible` island loads without scrolling.
const profile = `${process.env.TMPDIR || '/tmp'}/mui-layout-gate-${process.pid}`;
const chrome = Bun.spawn([CHROME, '--headless=new', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--disable-extensions', '--window-size=1200,4000', '--remote-debugging-port=0', 'about:blank'],
  { stdout: 'ignore', stderr: 'ignore' });

const quit = (msg, code) => { chrome.kill('SIGKILL'); server.stop(true); rmSync(profile, { recursive: true, force: true }); console.log(msg); process.exit(code); };

// Chrome writes its devtools port to <profile>/DevToolsActivePort once it is listening.
let port = 0;
for (const t0 = Date.now(); Date.now() - t0 < 15_000 && !port;) {
  await Bun.sleep(150);
  const txt = await Bun.file(`${profile}/DevToolsActivePort`).text().catch(() => '');
  if (txt.trim()) port = +txt.split('\n')[0];
}
if (!port) quit('  FAIL headless Chrome never opened a devtools port', 1);

let target;
for (const t0 = Date.now(); Date.now() - t0 < 10_000 && !target;) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()).catch(() => []);
  target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!target) await Bun.sleep(150);
}
if (!target) quit('  FAIL headless Chrome exposed no page target', 1);

const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let resolveLoad;
const opened = await Promise.race([new Promise(r => { ws.onopen = () => r(true); }), Bun.sleep(10_000).then(() => false)]);
if (!opened) quit('  FAIL could not attach to the headless Chrome target', 1);
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Page.loadEventFired') resolveLoad?.();
};
let id = 0;
const cdp = (method, params) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await cdp('Page.enable');
const loaded = new Promise(r => { resolveLoad = r; });
await cdp('Page.navigate', { url: `http://127.0.0.1:${server.port}/` });
await Promise.race([loaded, Bun.sleep(15_000)]);
const evaluated = await Promise.race([cdp('Runtime.evaluate', { expression: PROBE, awaitPromise: true, returnByValue: true }), Bun.sleep(30_000).then(() => null)]);
const result = evaluated?.result?.result?.value;
if (!result) quit(`  FAIL could not evaluate the layout probe (${evaluated?.error?.message || evaluated?.result?.exceptionDetails?.text || 'no result'})`, 1);

// A CLS of 0 for an island that never loaded measures nothing — assert every island entry was really fetched.
const fetched = new Set(result.js);
const want = [...new Bun.Glob('*.js').scanSync('dist/i')].filter(f => !f.startsWith('c-'));
const missing = want.filter(f => !fetched.has(f));
if (missing.length) quit(`  FAIL islands never adopted in the run: ${missing.join(', ')} (fetched: ${result.js.join(', ') || 'none'})`, 1);
// Rule 4, the half palette.js cannot see: [data-p] is the view's primary CTA and the fully adopted
// DOM is the only place the *rendered* view exists (P0's CTA is written by the inline amount island).
if (result.primaries > 1) quit(`  FAIL ${result.primaries} [data-p] in the fully adopted view (max 1)`, 1);
if (result.cls !== 0) console.log(`  shift by island: ${JSON.stringify(result.by)}`);
quit(`${result.cls === 0 ? '  ok  ' : '  FAIL'} CLS ${result.cls.toFixed(4)} after adopting ${want.length} lazy islands (${result.islands} islands, ${result.primaries} [data-p] rendered)`, result.cls === 0 ? 0 : 1);
