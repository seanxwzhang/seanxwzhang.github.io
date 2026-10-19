import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://seanzhang.me',
  integrations: [
    // Math (KaTeX) is enabled for .mdx posts only, so existing .md posts render exactly as before
    mdx({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    react(),
    sitemap(),
    tailwind(),
  ],
  output: 'static',
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
