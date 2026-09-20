import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://kyosu.dev',
  integrations: [sitemap()],
  markdown: {
    // 移行前は highlight.js の GitHub Light テーマだった。
    // Astro の既定は github-dark なので明示しないと配色が変わる。
    shikiConfig: { theme: 'github-light' },
  },
  vite: { plugins: [tailwindcss()] },
});
