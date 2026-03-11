import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  integrations: [react()],

  vite: {
    plugins: [tailwind()],
  },

  adapter: vercel(),
});