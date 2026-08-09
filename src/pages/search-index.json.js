// Build-time search index for the whole site.
//
// The site is a static build, so there is no server to query. Instead we read
// every page's source at build time, strip it down to plain text, and emit one
// JSON file that the client filters in the browser.
import { chapters } from '../data/chapters.js';

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

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => NAMED[name] ?? ' ');
}

/** Reduce a raw .astro file to the prose a reader would actually see. */
function toText(raw) {
  return decode(
    raw
      .replace(/^---[\s\S]*?^---/m, ' ')      // frontmatter
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')               // tags
  )
    .replace(/\\\[[\s\S]*?\\\]/g, ' ')        // display math
    .replace(/\\\([\s\S]*?\\\)/g, ' ')        // inline math
    .replace(/\s+/g, ' ')
    .trim();
}

function titleOf(raw, url) {
  const attr = raw.match(/<(?:Base|Main)[^>]*\btitle=(?:"([^"]+)"|\{?['"`]([^'"`]+)['"`]\}?)/);
  if (attr) return decode(attr[1] || attr[2]).trim();
  const konst = raw.match(/const\s+title\s*=\s*["'`]([^"'`]+)["'`]/);
  if (konst) return decode(konst[1]).trim();
  const seg = url.split('/').filter(Boolean).pop() || 'Home';
  return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function urlOf(path) {
  let u = path.replace(/^\./, '').replace(/\.astro$/, '');
  u = u.replace(/\/index$/, '/');
  return u === '' ? '/' : u;
}

/** Human-readable section for grouping results. */
function sectionOf(url) {
  if (url.startsWith('/civil/cee340')) return 'CEE 340';
  if (url.startsWith('/civil')) return 'Civil Engineering';
  if (url.startsWith('/math')) return 'Mathematics';
  if (url.startsWith('/physics')) return 'Physics';
  if (url.startsWith('/ssc')) return 'SSC';
  return 'General';
}

export async function GET() {
  const files = import.meta.glob('./**/*.astro', { query: '?raw', import: 'default', eager: true });

  const pages = [];
  for (const [path, raw] of Object.entries(files)) {
    if (path.includes('[')) continue;          // dynamic routes handled below
    if (path.startsWith('./api/')) continue;
    const url = urlOf(path);
    const text = toText(raw);
    if (text.length < 40) continue;            // skip near-empty stubs
    pages.push({ u: url, t: titleOf(raw, url), s: sectionOf(url), x: text.slice(0, 24000) });
  }

  // Dynamic SSC chapter routes: index by chapter name so they are findable.
  for (const ch of chapters) {
    const url = `/ssc-math-chapter/${ch.toLowerCase().replace(/ /g, '-')}`;
    pages.push({
      u: url, t: `${ch} — SSC Math`, s: 'SSC',
      x: `${ch} SSC mathematics chapter questions MCQ CQ solutions all boards 2020 2021 2022 2023 2024 2025`
    });
  }

  pages.sort((a, b) => a.t.localeCompare(b.t));
  return new Response(JSON.stringify({ n: pages.length, pages }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
