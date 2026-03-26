import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://mathify.us',
  integrations: [svelte()],
  output: 'static',
  build: {
    assets: 'assets'
  }
});
