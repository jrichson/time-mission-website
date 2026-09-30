import registry from './provider-monitor.json' with { type: 'json' };

const directives = new Set(['script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr', 'connect-src', 'frame-src', 'font-src', 'img-src', 'worker-src', 'default-src', 'form-action']);
const venues = new Set(registry.educators.concat(['west-nyack', 'lincoln', 'edison', 'boston']));

export async function readBoundedJson(request, limit = 16384) {
  if (!request.body) throw new Error('empty');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function providerFor(value) {
  try {
    const host = new URL(value).hostname;
    return Object.entries(registry.providers).find(([, provider]) => provider.hosts.some(suffix => host === suffix || host.endsWith('.' + suffix)))?.[0] || '';
  } catch { return ''; }
}

export function normalizeCspReports(payload, origin) {
  const reports = Array.isArray(payload) ? payload.filter(item => item?.type === 'csp-violation').map(item => item.body) : [payload?.['csp-report']];
  if (reports.length > 20) throw new Error('too many reports');
  const result = [];
  for (const report of reports) {
    if (!report || typeof report !== 'object') continue;
    const docValue = report.documentURL || report['document-uri'];
    let documentUrl;
    try { documentUrl = new URL(docValue); } catch { continue; }
    if (documentUrl.origin !== origin) continue;
    const directive = report.effectiveDirective || report['effective-directive'];
    if (!directives.has(directive)) continue;
    const blocked = report.blockedURL || report['blocked-uri'] || '';
    const source = report.sourceFile || report['source-file'] || '';
    if (/^(chrome-extension|moz-extension|safari-extension):/.test(blocked) || /^(chrome-extension|moz-extension|safari-extension):/.test(source)) continue;
    let blockedOrigin;
    try {
      const url = new URL(blocked);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      blockedOrigin = url.origin.slice(0, 200);
    } catch {
      if (!['inline', 'eval', 'wasm-eval', 'data', 'blob'].includes(blocked)) continue;
      blockedOrigin = blocked;
    }
    const segments = documentUrl.pathname.split('/').filter(Boolean);
    if (segments[0] === 'es') segments.shift();
    const venue = venues.has(segments[0]) ? segments[0] : '';
    const pageGroup = venue ? '/' + venue + (segments[1] === 'educators' ? '/educators' : '') : '/other';
    // Never retain full URLs, queries, fragments, script samples, IPs, or user agents.
    const provider = providerFor(blocked) || providerFor(source) || (blockedOrigin === origin ? 'site' : 'other');
    result.push({ pageGroup, directive, blockedOrigin, provider });
  }
  return result;
}

export async function collectCspReports({ request, env }) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (!['application/csp-report', 'application/reports+json'].includes((request.headers.get('content-type') || '').split(';')[0])) return new Response(null, { status: 415 });
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') && request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  let reports;
  try { reports = normalizeCspReports(await readBoundedJson(request), origin); }
  catch { return new Response(null, { status: 400 }); }
  if (!reports.length) return new Response(null, { status: 204 });
  if (!env.FORM_SUBMISSIONS_DB) return new Response(null, { status: 503 });
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  try {
    const statements = reports.map(report => {
      const key = [day, report.pageGroup, report.directive, report.blockedOrigin, report.provider];
      return env.FORM_SUBMISSIONS_DB.prepare(`INSERT INTO csp_monitor_reports
        (day, page_group, directive, blocked_origin, provider, occurrences, last_seen)
        SELECT ?, ?, ?, ?, ?, 1, ? WHERE
        (SELECT count(*) FROM csp_monitor_reports WHERE day = ?) < 200 OR
        EXISTS (SELECT 1 FROM csp_monitor_reports WHERE day=? AND page_group=? AND directive=? AND blocked_origin=? AND provider=?)
        ON CONFLICT(day, page_group, directive, blocked_origin, provider) DO UPDATE SET
        occurrences=min(occurrences + 1, 1000000), last_seen=excluded.last_seen`).bind(...key, now, day, ...key);
    });
    await env.FORM_SUBMISSIONS_DB.batch(statements);
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 503 }); }
}

export async function monitorStatus({ request, env }) {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const supplied = request.headers.get('authorization') || '';
  if (!env.TM_MONITOR_TOKEN || supplied !== 'Bearer ' + env.TM_MONITOR_TOKEN) return new Response(null, { status: 401 });
  let payload;
  try { payload = await readBoundedJson(request); } catch { return new Response(null, { status: 400 }); }
  if (!Array.isArray(payload.checks) || !payload.checks.length || payload.checks.length > 50 || payload.checks.some(check => typeof check.id !== 'string' || check.id.length > 150 || !['passed', 'failed'].includes(check.status))) return new Response(null, { status: 400 });
  if (!/^https:\/\/github\.com\/jrichson\/time-mission-website\/actions\/runs\/\d+$/.test(payload.runUrl || '')) return new Response(null, { status: 400 });
  const db = env.FORM_SUBMISSIONS_DB;
  if (!db || !env.FORM_EMAIL_API_KEY || !env.FORM_FROM_EMAIL) return new Response(null, { status: 503 });
  try {
    // Retain at most eight UTC day buckets, bounded to 200 aggregate keys per day.
    await db.prepare("DELETE FROM csp_monitor_reports WHERE day < date('now', '-7 days')").run();
    const { results: reports } = await db.prepare(`SELECT page_group, directive, blocked_origin, provider, sum(occurrences) AS count
      FROM csp_monitor_reports WHERE last_seen >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
      AND provider != 'other' GROUP BY page_group, directive, blocked_origin, provider HAVING sum(occurrences) >= 3
      ORDER BY provider, page_group, directive, blocked_origin`).all();
    const failures = payload.checks.filter(check => check.status === 'failed').map(check => check.id).sort();
    const signals = reports.map(report => `${report.provider}: ${report.directive} blocked ${report.blocked_origin} on ${report.page_group}`);
    const fingerprint = JSON.stringify({ failures, signals });
    const previous = await db.prepare('SELECT fingerprint FROM provider_monitor_state WHERE id=1').first();
    const healthy = !failures.length && !signals.length;
    const shouldEmail = payload.activation === true || (previous ? previous.fingerprint !== fingerprint : !healthy);
    if (shouldEmail) {
      const subject = payload.activation === true ? 'Time Mission monitoring is active' : healthy ? 'Time Mission monitoring recovered' : 'Time Mission forms / booking alert';
      const text = [subject, '', healthy ? 'All live-provider checks passed. No actionable CSP report clusters in the last day.' : 'The daily monitoring check found:', ...failures.map(id => '- Failed check: ' + id), ...signals.map(signal => '- ' + signal), '', 'Details: ' + payload.runUrl, '', 'Checks run once daily independently of ChatGPT. No signup or purchase is submitted.'].join('\n');
      const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + env.FORM_EMAIL_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'tm-monitor-' + payload.runUrl.split('/').pop() },
        body: JSON.stringify({ from: env.FORM_FROM_EMAIL, to: [registry.alertRecipient], subject, text }),
      });
      if (!sent.ok) return new Response('Email delivery failed', { status: 502 });
    }
    await db.prepare(`INSERT INTO provider_monitor_state(id, fingerprint, checked_at) VALUES(1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET fingerprint=excluded.fingerprint, checked_at=excluded.checked_at`).bind(fingerprint, new Date().toISOString()).run();
    return Response.json({ healthy, emailed: shouldEmail, failedChecks: failures.length, cspSignals: signals.length });
  } catch { return new Response('Monitoring storage unavailable', { status: 503 }); }
}
