import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://www.mathify.us';

// Pages that live in public/ are copied to the output verbatim, so the sitemap
// integration's route crawl never sees them. That silently excluded all 60 SSC
// board papers — the most-searched content on the site — so we discover them
// from disk instead of maintaining a hand-written list that drifts.
function publicHtmlPages(dir = 'public', out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) publicHtmlPages(full, out);
    else if (entry.name.endsWith('.html')) {
      const url = '/' + path.relative('public', full).split(path.sep).join('/');
      out.push(SITE + url.replace(/\/index\.html$/, '/'));
    }
  }
  return out;
}

// The live site is served by Vercel (DNS points at vercel-dns; the GitHub Pages
// mirror only 301s here). `hybrid` keeps every page prerendered exactly as
// before — only routes that opt out with `export const prerender = false`
// become serverless functions. Today that is just src/pages/api/chat.js, which
// powers the tutor chatbot mounted site-wide in Main.astro.
export default defineConfig({
  site: SITE,
  integrations: [
    svelte(),
    sitemap({
      customPages: publicHtmlPages(),
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  // Legacy .html URLs kept alive after the public/ pages behind them moved to
  // clean paths. Dropping these would 404 anything already indexed or linked.
  redirects: {
    '/physics.html': '/physics',
    '/math.html': '/math/guide',
    '/rc-chapter1.html': '/civil/rc-working-stress',
    // Stale copy of traffic-design (same page minus the practice exam), deleted.
    '/cee350-traffic-analysis.html': '/civil/traffic-design',
  },
  output: 'hybrid',
  adapter: vercel(),
  build: {
    assets: 'assets',
  },
});
