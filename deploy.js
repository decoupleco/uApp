// deploy.js — publish the μi design language site
//   /design/        preview.html — the design philosophy and the live recipe gallery (hand-authored, one file)
//   /design/paper/  paper.html   — ui-whitepaper.md rendered by paper.js, tokens lifted from preview.html
//   /design/blocks/ blocks.html  — the ten view blocks in variants, rendered by blocks.js, with the review loop
//   /design/pairs-pro/ pairs-pro.html — the Pairs.pro refresh wireframe sheet (24 frames by role), rendered by pairs-pro.js
//   /design/app/    dist/        — the μApp starter, built with BASE=/design/app so its island map is rebased
//   decouple.co is a GitHub Pages *project* site: repo decoupleco/decouple.co, branch gh-pages, CNAME decouple.co.
//   Project repos are not mounted under that domain (no decoupleco.github.io org site exists), so /design/
//   has to live inside that branch. This script: builds, runs the gates, checks out gh-pages into a temp
//   worktree, replaces design/, commits — and pushes ONLY with `--push`.
//   Edge facts (measured 2026-09-14): HTTP/2, gzip only (no brotli), cache-control: max-age=600, no Early Hints.
import { rmSync, mkdirSync, existsSync } from 'node:fs';

const PUSH = process.argv.includes('--push');
const REPO = 'https://github.com/decoupleco/decouple.co.git';
const WT = `${process.env.TMPDIR || '/tmp'}/decouple.co-gh-pages`;
const run = (cmd, opts = {}) => { const p = Bun.spawnSync(cmd, { stdout: 'inherit', stderr: 'inherit', ...opts }); if (p.exitCode !== 0) { console.error(`✗ ${cmd.join(' ')}`); process.exit(p.exitCode || 1); } };

run(['bun', './build.js'], { env: { ...process.env, BASE: '/design/app' } });
run(['bun', 'run', 'gate']);
run(['bun', './paper.js']);
run(['bun', './blocks.js']);
run(['bun', './pairs-pro.js']);

rmSync(WT, { recursive: true, force: true });
run(['git', 'clone', '--depth', '1', '--branch', 'gh-pages', REPO, WT]);
rmSync(`${WT}/design`, { recursive: true, force: true });
for (const d of ['app', 'paper', 'blocks', 'pairs-pro']) mkdirSync(`${WT}/design/${d}`, { recursive: true });
run(['cp', 'preview.html', `${WT}/design/index.html`]);
run(['cp', 'paper.html', `${WT}/design/paper/index.html`]);
run(['cp', 'blocks.html', `${WT}/design/blocks/index.html`]);
run(['cp', 'pairs-pro.html', `${WT}/design/pairs-pro/index.html`]);
run(['cp', '-R', 'dist/.', `${WT}/design/app/`]);
if (!existsSync(`${WT}/.nojekyll`)) await Bun.write(`${WT}/.nojekyll`, '');
run(['git', '-C', WT, 'add', '-A', 'design', '.nojekyll']);
const status = Bun.spawnSync(['git', '-C', WT, 'status', '--porcelain'], { stdout: 'pipe' }).stdout.toString().trim();
if (!status) { console.log('nothing to deploy — design/ is already up to date on gh-pages'); process.exit(0); }
run(['git', '-C', WT, 'commit', '-m', '[design] publish the μi design language site: philosophy + preview at /design, μApp demo at /design/app\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>']);
if (PUSH) run(['git', '-C', WT, 'push', 'origin', 'gh-pages']);
else console.log(`\ncommitted in ${WT} (not pushed). Review with: git -C ${WT} show --stat HEAD\nPublish with: bun ./deploy.js --push`);
