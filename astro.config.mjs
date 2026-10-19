import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://ogranka.github.io',
  // React только для кейса «Кабинет»: остальные страницы остаются без фреймворка
  integrations: [react()],
  build: {
    inlineStylesheets: 'always',
  },
});
