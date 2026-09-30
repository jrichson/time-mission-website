import { describe, expect, it, vi } from 'vitest';
import { normalizeCspReports, readBoundedJson, collectCspReports, monitorStatus } from '../functions/_shared/csp-monitor.mjs';
import fs from 'node:fs';
const origin = 'https://www.timemission.com';
const body = { 'document-uri': origin + '/houston/educators?email=private@example.com#secret', 'blocked-uri': 'https://static-forms.klaviyo.com/forms?id=secret', 'effective-directive': 'connect-src', 'script-sample': 'private data' };

describe('observational CSP reporting', () => {
  it('strips personal URLs and script samples from legacy and modern reports', () => {
    const expected = [{ pageGroup: '/houston/educators', directive: 'connect-src', blockedOrigin: 'https://static-forms.klaviyo.com', provider: 'klaviyo' }];
    expect(normalizeCspReports({ 'csp-report': body }, origin)).toEqual(expected);
    expect(normalizeCspReports([{ type: 'csp-violation', body: { documentURL: body['document-uri'], blockedURL: body['blocked-uri'], effectiveDirective: 'connect-src' } }], origin)).toEqual(expected);
  });
  it('ignores extensions, foreign documents and unrecognized directives', () => {
    for (const change of [{ 'source-file': 'chrome-extension://private/content.js' }, { 'document-uri': 'https://other.example/' }, { 'effective-directive': 'unknown' }]) {
      expect(normalizeCspReports({ 'csp-report': { ...body, ...change } }, origin)).toEqual([]);
    }
  });
  it('bounds a headerless streamed request and rejects malformed JSON', async () => {
    await expect(readBoundedJson(new Request(origin, { method: 'POST', body: 'x'.repeat(17000) }))).rejects.toThrow('too large');
    await expect(readBoundedJson(new Request(origin, { method: 'POST', body: '{' }))).rejects.toThrow();
  });
  it('does not accept report reads or cross-origin writes', async () => {
    expect((await collectCspReports({ request: new Request(origin), env: {} })).status).toBe(405);
    expect((await collectCspReports({ request: new Request(origin, { method: 'POST', headers: { 'content-type': 'application/csp-report', origin: 'https://other.example' }, body: '{}' }), env: {} })).status).toBe(403);
  });
  it('requires authorization before querying diagnostic data or sending mail', async () => {
    const db = { prepare: vi.fn() };
    expect((await monitorStatus({ request: new Request(origin, { method: 'POST', body: '{}' }), env: { TM_MONITOR_TOKEN: 'secret', FORM_SUBMISSIONS_DB: db } })).status).toBe(401);
    expect(db.prepare).not.toHaveBeenCalled();
  });
  it('guards required integration origins without changing the policy', () => {
    const template = fs.readFileSync('_headers.tmpl', 'utf8');
    const policy = template.split('\n').find(line => line.includes('Content-Security-Policy:')).split('Content-Security-Policy:')[1];
    const directives = Object.fromEntries(policy.split(';').map(part => part.trim().split(/\s+/)).map(([name, ...values]) => [name, values]));
    const registry = JSON.parse(fs.readFileSync('functions/_shared/provider-monitor.json', 'utf8'));
    for (const provider of Object.values(registry.providers)) for (const [name, hosts] of Object.entries(provider.required)) {
      for (const host of hosts) expect(directives[name], name + ' missing ' + host).toContain(host);
    }
    expect(directives['script-src']).not.toContain("'unsafe-inline'");
  });
});

describe('monitor email transitions', () => {
  const healthy = JSON.stringify({ failures: [], signals: [] });
  const failed = JSON.stringify({ failures: ['desktop: form failed'], signals: [] });
  it.each([
    [null, 'passed', false],
    [null, 'failed', true],
    [failed, 'failed', false],
    [failed, 'passed', true],
    [healthy, 'passed', false],
  ])('emails only changes: previous=%s status=%s', async (previous, status, shouldEmail) => {
    const writes = [];
    const db = { prepare: sql => ({
      run: async () => ({}), all: async () => ({ results: [] }),
      first: async () => previous ? { fingerprint: previous } : null,
      bind: (...args) => ({ run: async () => { writes.push({ sql, args }); } }),
    }) };
    const send = vi.fn(async () => Response.json({ id: 'test' }));
    vi.stubGlobal('fetch', send);
    try {
      const response = await monitorStatus({
        request: new Request(origin, { method: 'POST', headers: { authorization: 'Bearer test-secret' }, body: JSON.stringify({ checks: [{ id: 'desktop: form failed', status }], runUrl: 'https://github.com/jrichson/time-mission-website/actions/runs/123' }) }),
        env: { TM_MONITOR_TOKEN: 'test-secret', FORM_SUBMISSIONS_DB: db, FORM_EMAIL_API_KEY: 'fake-test-key', FORM_FROM_EMAIL: 'test@example.com' },
      });
      expect(response.status).toBe(200);
      expect((await response.json()).emailed).toBe(shouldEmail);
      expect(send).toHaveBeenCalledTimes(shouldEmail ? 1 : 0);
      if (shouldEmail) expect(JSON.parse(send.mock.calls[0][1].body).to).toEqual(['ari@compatible.la']);
      expect(writes).toHaveLength(1);
    } finally { vi.unstubAllGlobals(); }
  });
  it('keeps the previous state when email fails so the next run can retry', async () => {
    const write = vi.fn();
    const db = { prepare: () => ({ run: async () => ({}), all: async () => ({ results: [] }), first: async () => null, bind: () => ({ run: write }) }) };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    try {
      const response = await monitorStatus({
        request: new Request(origin, { method: 'POST', headers: { authorization: 'Bearer test-secret' }, body: JSON.stringify({ checks: [{ id: 'form', status: 'failed' }], runUrl: 'https://github.com/jrichson/time-mission-website/actions/runs/123' }) }),
        env: { TM_MONITOR_TOKEN: 'test-secret', FORM_SUBMISSIONS_DB: db, FORM_EMAIL_API_KEY: 'fake', FORM_FROM_EMAIL: 'test@example.com' },
      });
      expect(response.status).toBe(502);
      expect(write).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
