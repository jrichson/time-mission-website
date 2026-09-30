import fs from 'node:fs';
import path from 'node:path';

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}

// Location-prefixed shared pages must exist even when Pages Functions fail open.
export function materializeLocationPages(distDir, manifest) {
  const sharedPaths = new Set(manifest.PREFIXABLE_CANONICAL_PATHS);
  for (const file of htmlFiles(distDir)) {
    const route = '/' + path.relative(distDir, file).replaceAll(path.sep, '/').replace(/\.html$/, '');
    if (manifest.DYNAMIC_SHARED_PREFIXES.some(prefix => route.startsWith(prefix + '/'))) sharedPaths.add(route);
  }
  let written = 0;
  for (const locale of ['', ...manifest.LOCATION_ROUTE_LOCALES]) {
    const prefix = locale ? '/' + locale : '';
    for (const location of manifest.LOCATION_ROUTE_ENTRIES.filter(entry => !entry.externalUrl)) {
      for (const sharedPath of sharedPaths) {
        if (sharedPath === '/') continue;
        const source = path.join(distDir, prefix + sharedPath + '.html');
        const destination = path.join(distDir, prefix + location.canonicalPath + sharedPath + '.html');
        if (!fs.existsSync(source) || fs.existsSync(destination)) continue;
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(source, destination);
        written++;
      }
    }
  }
  return written;
}

export function applyStaticSecurity(distDir, policy) {
  const directives = policy.split(';').map(value => value.trim()).filter(Boolean);
  const headerOnly = directives.filter(value => value.startsWith('frame-ancestors '));
  if (directives.some(value => /^(?:sandbox|report-uri|report-to)\b/.test(value))) {
    throw new Error('Static CSP cannot silently drop sandbox or reporting directives');
  }
  const documentPolicy = directives.filter(value => !value.startsWith('frame-ancestors ')).join('; ');
  const escaped = documentPolicy.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const meta = '<meta id="tm-static-csp" http-equiv="Content-Security-Policy" content="' + escaped + '">';
  for (const file of htmlFiles(distDir)) {
    const html = fs.readFileSync(file, 'utf8').replace(/<meta id="tm-static-csp"[^>]*>/g, '');
    if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('Missing head in ' + file);
    fs.writeFileSync(file, html.replace(/<head(?:\s[^>]*)?>/i, '$&' + meta));
  }
  const headersPath = path.join(distDir, '_headers');
  let headers = fs.readFileSync(headersPath, 'utf8')
    .split('\n').filter(line => !/^\s*(?:Content-Security-Policy(?:-Report-Only)?|Reporting-Endpoints):/i.test(line)).join('\n');
  if (headerOnly.length) headers = headers.replace(/^\/\*\s*$/m, '/*\n  Content-Security-Policy: ' + headerOnly.join('; '));
  fs.writeFileSync(headersPath, headers);
  // Real-user CSP reports are intentionally disabled: bots and repeated reports
  // must not consume the same quota needed by contact forms and daily alerts.
  fs.writeFileSync(path.join(distDir, '_routes.json'), JSON.stringify({
    version: 1,
    include: ['/api/contact', '/api/newsletter', '/api/monitor-status'],
    exclude: [],
  }, null, 2) + '\n');
}
