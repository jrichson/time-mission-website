import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyStaticSecurity, materializeLocationPages } from '../scripts/lib/static-pages-output.mjs';

const directories = [];
afterEach(() => directories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-static-pages-'));
  directories.push(directory);
  for (const [file, content] of Object.entries({
    'faq.html': '<html><head><script>boot()</script></head><body>FAQ</body></html>',
    'nl/faq.html': '<html><head></head><body>Vragen</body></html>',
    'houston/educators.html': '<html><head></head><body>Educators</body></html>',
    'educators.html': '<html><head></head><body>Shared</body></html>',
    '_headers': "/*\n  X-Frame-Options: SAMEORIGIN\n",
  })) {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return directory;
}

describe('static Pages recovery', () => {
  it('serves localized nested pages from files without overwriting venue-specific pages', () => {
    const directory = fixture();
    materializeLocationPages(directory, {
      PREFIXABLE_CANONICAL_PATHS: ['/faq', '/educators'], DYNAMIC_SHARED_PREFIXES: ['/blog'],
      LOCATION_ROUTE_LOCALES: ['nl'],
      LOCATION_ROUTE_ENTRIES: [{ canonicalPath: '/houston' }, { canonicalPath: '/eindhoven', externalUrl: 'https://other.test/eindhoven' }],
    });
    expect(fs.readFileSync(path.join(directory, 'houston/faq.html'), 'utf8')).toContain('FAQ');
    expect(fs.readFileSync(path.join(directory, 'nl/houston/faq.html'), 'utf8')).toContain('Vragen');
    expect(fs.readFileSync(path.join(directory, 'houston/educators.html'), 'utf8')).toContain('Educators');
    expect(fs.existsSync(path.join(directory, 'eindhoven/faq.html'))).toBe(false);
  });

  it('enforces CSP before scripts without running a Worker or sending visitor reports', () => {
    const directory = fixture();
    const policy = "default-src 'self'; script-src 'self' 'sha256-abc'; frame-ancestors 'self'";
    applyStaticSecurity(directory, policy);
    applyStaticSecurity(directory, policy);
    const html = fs.readFileSync(path.join(directory, 'faq.html'), 'utf8');
    expect(html.match(/id="tm-static-csp"/g)).toHaveLength(1);
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script>'));
    expect(html).toContain("script-src 'self' 'sha256-abc'");
    expect(html).not.toContain('frame-ancestors');
    expect(fs.readFileSync(path.join(directory, '_headers'), 'utf8')).toContain("Content-Security-Policy: frame-ancestors 'self'");
    expect(JSON.parse(fs.readFileSync(path.join(directory, '_routes.json'))).include).toEqual(['/api/contact', '/api/newsletter', '/api/monitor-status']);
  });
});
