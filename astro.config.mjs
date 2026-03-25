import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://mathify.us',
  integrations: [svelte()],
  output: 'server',
  adapter: vercel({
    nodeVersion: '20'
  }),
  build: {
    assets: 'assets'
  }
});
