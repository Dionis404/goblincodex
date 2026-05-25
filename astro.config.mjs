// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import react from '@astrojs/react';

export default defineConfig({
  adapter: node({
    mode: 'standalone'
  }),

  server: {
    host: '0.0.0.0',
    port: 4321
  },

  integrations: [react()]
});