import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

if (path.basename(distDir) !== 'dist') {
  throw new Error(`Refusing to clean unexpected build directory: ${distDir}`);
}

await fs.rm(distDir, { recursive: true, force: true });
console.log('Cleaned dist/.');
