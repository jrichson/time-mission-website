import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { applyTmDotEnvToProcess } from './scripts/tm-dotenv.mjs';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

// Empty PUBLIC_TM_MEDIA_BASE in the shell (e.g. inherited env from the IDE)
// hides values from `.env`. Treat whitespace-only like unset so R2 URLs load from `.env`.
(() => {
  const k = 'PUBLIC_TM_MEDIA_BASE';
  const v = process.env[k];
  if (typeof v === 'string' && !v.trim()) {
    delete process.env[k];
  }
})();

applyTmDotEnvToProcess(repoRoot);

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://timemission.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
