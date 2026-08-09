// Build-time search index for the whole site.
//
// The site is a static build, so there is no server to query. Instead we read
// every page's source at build time, strip it to plain text, and emit one JSON
// file the client filters in the browser.
//
// Three sources, because the site's content lives in three places:
//   1. src/pages/**/*.astro     — the Astro pages
//   2. public/**/*.html         — standalone HTML (RC Design chapters, blog, …)
//   3. src/data/ssc-*.json      — 2000+ SSC questions, attached to the board
//                                 paper each one belongs to
//
// `output: 'static'` means this endpoint runs in Node at build time, so reading
// from disk here is safe — nothing executes at request time.
import fs from 'node:fs';
import path from 'node:path';
import { chapters } from '../data/chapters.js';

const ROOT = process.cwd();
const PAGE_CAP = 16000;   // per-page text cap, keeps the index a sane size

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  hellip: '…', times: '×', divide: '÷', deg: '°', plusmn: '±', asymp: '≈',
  le: '≤', ge: '≥', ne: '≠', minus: '−', sup2: '²', sup3: '³', frac12: '½',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ',
  lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ',
  psi: 'ψ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', radic: '√',
  rarr: '→', larr: '←', middot: '·', check: '✓', star: '★', sum: '∑', hbar: 'ħ'
};

const decode = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => NAMED[name] ?? ' ');

// Unwrap maths rather than deleting it: most SSC question text *is* a formula,
// so dropping \( … \) outright would leave "If and , then ?" behind. Strip the
// delimiters and LaTeX commands but keep the symbols, so "a+b=5" stays findable.
const unwrapMath = s => s
  .replace(/\\\[|\\\]|\\\(|\\\)/g, ' ')
  .replace(/\\[a-zA-Z]+\*?/g, ' ')
  .replace(/[{}$]/g, ' ');

/** Reduce raw markup to the prose a reader would actually see. */
function toText(raw, stripFrontmatter) {
  let s = raw;
  if (stripFrontmatter) s = s.replace(/^---[\s\S]*?^---/m, ' ');
  return unwrapMath(decode(
    s.replace(/<style[\s\S]*?<\/style>/gi, ' ')
     .replace(/<script[\s\S]*?<\/script>/gi, ' ')
     .replace(/<!--[\s\S]*?-->/g, ' ')
     .replace(/<[^>]+>/g, ' ')
  ))
    .replace(/\s+/g, ' ')
    .trim();
}

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function sectionOf(url) {
  if (url.startsWith('/civil/cee340')) return 'CEE 340';
  if (url.startsWith('/civil') || /concrete|rc-chapter|cee-chapter|cee350/.test(url)) return 'Civil Engineering';
  if (url.startsWith('/math')) return 'Mathematics';
  if (url.startsWith('/physics')) return 'Physics';
  if (url.startsWith('/ssc')) return 'SSC';
  if (url.startsWith('/blog')) return 'Blog';
  if (url.startsWith('/explore')) return 'Explore';
  return 'General';
}

function titleOf(raw, url) {
  const tag = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (tag) return decode(tag[1]).replace(/\s+/g, ' ').split('·')[0].trim();
  const attr = raw.match(/<(?:Base|Main)[^>]*\btitle=(?:"([^"]+)"|\{?['"`]([^'"`]+)['"`]\}?)/);
  if (attr) return decode(attr[1] || attr[2]).trim();
  const konst = raw.match(/const\s+title\s*=\s*["'`]([^"'`]+)["'`]/);
  if (konst) return decode(konst[1]).trim();
  const seg = url.split('/').filter(Boolean).pop() || 'Home';
  return seg.replace(/\.html$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const add = (list, seen, page) => {
  if (seen.has(page.u)) return;
  seen.add(page.u);
  list.push(page);
};

export async function GET() {
  const pages = [];
  const seen = new Set();

  // ── 1. Astro pages ──────────────────────────────────────────────
  const pagesDir = path.join(ROOT, 'src/pages');
  for (const file of walk(pagesDir, '.astro')) {
    const rel = path.relative(pagesDir, file).replace(/\\/g, '/');
    if (rel.includes('[') || rel.startsWith('api/')) continue;
    let url = '/' + rel.replace(/\.astro$/, '').replace(/(^|\/)index$/, '$1');
    if (url.length > 1 && url.endsWith('/')) url = url.slice(0, -1);
    const raw = fs.readFileSync(file, 'utf8');
    const text = toText(raw, true);
    if (text.length < 40) continue;
    add(pages, seen, { u: url || '/', t: titleOf(raw, url), s: sectionOf(url), x: text.slice(0, PAGE_CAP) });
  }
  const astroUrls = new Set(pages.map(p => p.u));

  // ── 2. Standalone HTML in public/ ───────────────────────────────
  // Board papers are handled in step 3 (their questions are richer than their
  // markup). Anything whose URL duplicates an Astro route is a stale copy.
  const pubDir = path.join(ROOT, 'public');
  for (const file of walk(pubDir, '.html')) {
    const rel = path.relative(pubDir, file).replace(/\\/g, '/');
    if (rel.startsWith('ssc/boards/')) continue;
    const url = '/' + rel;
    if (astroUrls.has(url.replace(/\.html$/, '')) || astroUrls.has(url.replace(/\/index\.html$/, ''))) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const text = toText(raw, false);
    if (text.length < 120) continue;
    add(pages, seen, { u: url, t: titleOf(raw, url), s: sectionOf(url), x: text.slice(0, PAGE_CAP) });
  }

  // ── 3. SSC questions, grouped into the board paper they belong to ─
  const dataDir = path.join(ROOT, 'src/data');
  if (fs.existsSync(dataDir)) {
    for (const file of fs.readdirSync(dataDir).filter(f => /^ssc-\d{4}-[a-z]+\.json$/.test(f))) {
      let d;
      try { d = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')); } catch { continue; }
      const m = file.match(/^ssc-(\d{4})-([a-z]+)\.json$/);
      const year = d.year || m[1], board = m[2];
      const url = `/ssc/boards/${board}-${year}.html`;
      const label = d.label || board.charAt(0).toUpperCase() + board.slice(1);

      const bits = [`${label} Board SSC Mathematics ${year} solved paper questions and step-by-step solutions.`];
      const chapterSet = new Set();
      for (const arr of ['mcq', 'cq']) {
        for (const q of d[arr] || []) {
          if (q.ch) chapterSet.add(q.ch);
          if (q.en) bits.push(q.en);
          if (q.bn) bits.push(q.bn);
          if (Array.isArray(q.opts)) bits.push(q.opts.join(' '));
        }
      }
      bits.push([...chapterSet].join(' · '));
      const text = unwrapMath(decode(bits.join(' '))).replace(/\s+/g, ' ').trim();
      add(pages, seen, { u: url, t: `${label} Board — SSC Math ${year}`, s: 'SSC', x: text.slice(0, PAGE_CAP) });
    }
  }

  // ── 4. Dynamic SSC chapter routes ───────────────────────────────
  for (const ch of chapters) {
    const url = `/ssc-math-chapter/${ch.toLowerCase().replace(/ /g, '-')}`;
    add(pages, seen, {
      u: url, t: `${ch} — SSC Math`, s: 'SSC',
      x: `${ch} SSC mathematics chapter questions MCQ CQ solutions all boards 2020 2021 2022 2023 2024 2025`
    });
  }

  pages.sort((a, b) => a.t.localeCompare(b.t));
  return new Response(JSON.stringify({ n: pages.length, pages }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
