import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://mathify.us',
  integrations: [svelte()],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  build: {
    assets: 'assets'
  }
});
