// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://goblincodex.fun',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),

  server: {
    host: '0.0.0.0',
    port: 4321
  },

  integrations: [react(), sitemap()],
});