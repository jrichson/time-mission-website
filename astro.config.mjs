import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://timemission.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
