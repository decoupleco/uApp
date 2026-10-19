// paper.js — render ui-whitepaper.md into paper.html (deployed as /design/paper/).
// A focused renderer, not a markdown library: it supports exactly what the paper uses — headings, paragraphs,
// GFM tables, fenced code, lists, blockquotes, rules, and inline code/bold/italic/links. Tokens and the reset
// are lifted from preview.html so the palette has one source of truth; this file adds only the prose layer.
const md = await Bun.file('ui-whitepaper.md').text();
const preview = await Bun.file('preview.html').text();

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MARK = '@@c';   // code spans park behind this sentinel so **bold** inside them survives
const inline = s => {
  const code = [];
  s = esc(s).replace(/`([^`]+)`/g, (_, c) => MARK + (code.push(c) - 1) + MARK);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s.replace(new RegExp(MARK + '(\\d+)' + MARK, 'g'), (_, i) => `<code>${code[+i]}</code>`);
};
const slug = s => s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
const numeric = c => /^[*\s]*[\d.,+−\-–%×~≈]+/.test(c.trim());

const lines = md.split('\n');
const out = [];
const toc = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];

  if (l.startsWith('```')) {                                        // fenced code
    const body = [];
    while (++i < lines.length && !lines[i].startsWith('```')) body.push(lines[i]);
    out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
    continue;
  }

  if (/^\|/.test(l)) {                                              // GFM table
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
    i--;
    const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const head = cells(rows[0]);
    const hasRule = rows[1] && /^\|[\s:|-]+\|?$/.test(rows[1]);
    const align = hasRule ? cells(rows[1]).map(a => a.endsWith(':') ? (a.startsWith(':') ? 'center' : 'right') : 'left') : head.map(() => 'left');
    const body = rows.slice(hasRule ? 2 : 1);
    const th = head.map((h, n) => `<th${align[n] !== 'left' ? ` style="text-align:${align[n]}"` : ''}>${inline(h)}</th>`).join('');
    const tr = body.map(r => `<tr>${cells(r).map((c, n) => `<td${align[n] !== 'left' ? ` style="text-align:${align[n]}"` : ''}${numeric(c) ? ' class=num' : ''}>${inline(c)}</td>`).join('')}</tr>`).join('');
    out.push(`<div class=scroll><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
    continue;
  }

  if (/^>\s?/.test(l)) {                                            // blockquote
    const body = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
    i--;
    out.push(`<blockquote>${inline(body.join(' '))}</blockquote>`);
    continue;
  }

  if (/^([-*]|\d+\.) /.test(l)) {                                   // list, one level deep as the paper uses
    const ordered = /^\d+\. /.test(l);
    const items = [];
    while (i < lines.length && (/^([-*]|\d+\.) /.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
      if (/^\s{2,}\S/.test(lines[i])) items[items.length - 1] += ' ' + lines[i].trim();
      else items.push(lines[i].replace(/^([-*]|\d+\.) /, ''));
      i++;
    }
    i--;
    const tag = ordered ? 'ol' : 'ul';
    out.push(`<${tag}>${items.map(t => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
    continue;
  }

  const h = l.match(/^(#{1,4}) (.+)$/);
  if (h) {
    const level = h[1].length, id = slug(h[2]);
    if (level === 2) toc.push({ id, text: h[2] });
    out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
    continue;
  }

  if (l.trim() === '---') { out.push('<hr>'); continue; }

  if (l.trim()) {                                                   // paragraph, joining soft-wrapped lines
    const body = [l];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#{1,4} |\||```|>|[-*] |\d+\. |---$)/.test(lines[i + 1])) body.push(lines[++i]);
    const isStandfirst = out.length === 1 && out[0].startsWith('<h1');   // the line under the title
    out.push(`<p${isStandfirst ? ' class=lede' : ''}>${inline(body.join(' '))}</p>`);
  }
}

// Lift @layer reset/theme/base out of preview.html: one palette, defined once.
const layer = name => {                      // every @layer <name>{…} block in the gallery, concatenated
  const out = []; let from = 0;
  for (;;) {
    const start = preview.indexOf(`@layer ${name}{`, from); if (start < 0) break;
    let depth = 1, j = start + `@layer ${name}{`.length;
    while (j < preview.length && depth) { if (preview[j] === '{') depth++; else if (preview[j] === '}') depth--; j++; }
    out.push(preview.slice(start, j)); from = j;
  }
  return out.join('\n');
};

const html = `<!doctype html><html lang=en data-t=base><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>μi — the paper</title>
<style>
@layer reset,theme,base,prose,page;
${['reset', 'theme', 'base'].map(layer).join('\n')}
@layer prose{
/* Type only. No new colours, no new tokens — the palette above is the whole vocabulary. */
.prose{max-width:74ch;justify-self:center;display:flex;flex-direction:column;gap:1.1em}
.prose>*{margin:0}
.prose h1,.prose h2,.prose h3,.prose h4{text-wrap:balance;letter-spacing:-.022em;line-height:1.15}
.prose h1{font-size:calc(var(--fs)*2.6)}
.prose h2{font-size:calc(var(--fs)*1.6);margin-block-start:1.5em;padding-block-start:.7em;border-block-start:1px solid var(--n3)}
.prose h3{font-size:calc(var(--fs)*1.15);margin-block-start:.8em}
.prose h4{font-size:var(--fs);color:var(--fg2)}
.prose p{text-wrap:pretty;line-height:1.68;color:var(--fg2)}
.prose p>b,.prose li>b{color:var(--fg);font-weight:650}
.prose a{color:var(--ac-f);text-underline-offset:.2em;text-decoration-thickness:from-font}
.prose ul,.prose ol{display:flex;flex-direction:column;gap:.5em;padding-inline-start:1.4em;color:var(--fg2);line-height:1.62}
.prose li::marker{color:var(--fg3);font-variant-numeric:tabular-nums}
.prose blockquote{margin:0;padding:.15em 0 .15em 1.15em;border-inline-start:2px solid var(--ac-b);color:var(--fg);font-size:calc(var(--fs)*1.06);line-height:1.6;text-wrap:pretty}
.prose code{font-family:var(--fm);font-size:.875em;font-variant-ligatures:none;background:var(--n2);padding:.1em .34em;border-radius:.3em;overflow-wrap:break-word}
.prose pre{background:var(--n1);border:1px solid var(--n3);border-radius:var(--r2);padding:.9rem 1rem;overflow-x:auto;line-height:1.5}
.prose pre code{background:none;padding:0;font-size:.8125rem;white-space:pre;tab-size:2}
.prose hr{border:0;border-block-start:1px solid var(--n3);margin-block:.5em}
.prose .scroll{overflow-x:auto;border:1px solid var(--n3);border-radius:var(--r2)}
.prose table{border-collapse:collapse;width:100%;font-size:.875rem;line-height:1.45}
.prose thead th{text-align:left;font-size:.6875rem;font-weight:650;text-transform:uppercase;letter-spacing:.1em;color:var(--fg3);padding:.6rem .75rem;background:var(--n1);border-block-end:1px solid var(--n3);white-space:nowrap}
.prose tbody td{padding:.55rem .75rem;border-block-end:1px solid var(--n3);color:var(--fg2);vertical-align:top}
.prose tbody tr:last-child td{border-block-end:0}
.prose td.num{font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}
.prose td>b,.prose th>b{color:var(--fg)}
}
@layer page{
body{hanging-punctuation:first allow-end;font-optical-sizing:auto}
.page{max-width:76rem;margin-inline:auto;padding:calc(1.5rem*var(--sp)) 1.25rem calc(4rem*var(--sp));display:grid;gap:calc(2rem*var(--sp));grid-template-columns:1fr}
@media(min-width:64rem){.page{grid-template-columns:15rem minmax(0,1fr);align-items:start}}
.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--n1) 88%,transparent);backdrop-filter:blur(8px);border-block-end:1px solid var(--n3)}
.top .in{max-width:76rem;margin-inline:auto;padding:.6rem 1.25rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.brand{font-weight:700;letter-spacing:-.02em}.brand span{color:var(--fg3);font-weight:500}
.top nav{display:flex;gap:.125rem;flex-wrap:wrap}
.top nav a{padding:.375rem .625rem;border-radius:var(--r1);font-size:.8125rem;font-weight:500;color:var(--fg2);text-decoration:none}
.top nav a:hover{background:var(--n2);color:var(--fg)}
.seg{display:inline-flex;background:var(--n2);border-radius:var(--r2);padding:.1875rem;gap:.125rem}
.seg button{padding:.375rem .75rem;border-radius:calc(var(--r2) - .1875rem);font-size:.8125rem;font-weight:600;color:var(--fg2)}
.seg button[aria-pressed=true]{background:var(--n0);color:var(--fg);box-shadow:var(--sh)}
.toc{display:flex;flex-direction:column;gap:.15rem;font-size:.8125rem}
@media(min-width:64rem){.toc{position:sticky;top:4.2rem;max-height:calc(100svh - 6rem);overflow:auto}}
.toc b{font-size:.6875rem;text-transform:uppercase;letter-spacing:.11em;color:var(--fg3);padding:.3rem .5rem}
.toc a{padding:.28rem .5rem;border-radius:var(--r1);color:var(--fg2);text-decoration:none;line-height:1.35}
.toc a:hover{background:var(--n2);color:var(--fg)}
.prose h2,.prose h3{scroll-margin-top:4.5rem}
}
</style>

<header class=top><div class=in>
<div class=brand>μi <span>the paper</span></div>
<nav><a href="../">Design language</a><a href="../blocks/">Blocks</a><a href="../pairs-pro/">Pairs Pro</a><a href="../app/">μApp demo ↗</a></nav>
<div class=seg role=group aria-label=Density style="margin-inline-start:auto"><button data-den=base aria-pressed=true>Base</button><button data-den=sharp>Sharp</button></div>
<div class=seg role=group aria-label=Luminance><button data-lum=light aria-pressed=true>Light</button><button data-lum=dark>Dark</button></div>
</div></header>

<main class=page>
<aside class=toc><b>Contents</b>${toc.map(t => `<a href="#${t.id}">${esc(t.text)}</a>`).join('')}</aside>
<article class=prose>${out.join('\n')}</article>
</main>

<script type=module>
const r=document.documentElement;
const S=()=>{try{return JSON.parse(localStorage.mui||'{}')}catch{return{}}};
const apply=s=>{const d=s.den||'base',l=s.lum||'light';
  r.dataset.t=d==='sharp'?(l==='dark'?'sharp-dark':'sharp'):(l==='dark'?'dark':'base');
  for(const b of document.querySelectorAll('[data-den]'))b.setAttribute('aria-pressed',b.dataset.den===d);
  for(const b of document.querySelectorAll('[data-lum]'))b.setAttribute('aria-pressed',b.dataset.lum===l)};
let s=S();apply(s);
addEventListener('click',e=>{const b=e.target.closest('[data-den],[data-lum]');if(!b)return;
  s={...S(),...(b.dataset.den?{den:b.dataset.den}:{lum:b.dataset.lum})};
  try{localStorage.mui=JSON.stringify(s)}catch{}
  apply(s)});
</script>
`;

await Bun.write('paper.html', html);
const { brotliCompressSync, constants: Z } = await import('node:zlib');
const br = b => brotliCompressSync(Buffer.from(b), { params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_LGWIN]: 24 } }).length;
console.log(`  paper.html    raw ${html.length}  brotli ${br(html)}   ${toc.length} sections, ${out.length} blocks`);
