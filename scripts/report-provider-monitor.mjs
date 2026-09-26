import fs from 'node:fs';
const checks = [];
function collect(suites) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.at(-1);
        checks.push({ id: `${test.projectName}: ${spec.title}`, status: result?.status === 'passed' ? 'passed' : 'failed' });
      }
    }
    collect(suite.suites);
  }
}
try { collect(JSON.parse(fs.readFileSync('test-results/providers/results.json', 'utf8')).suites); }
catch { checks.push({ id: 'Monitor runner could not produce results', status: 'failed' }); }
if (!checks.length) checks.push({ id: 'No provider checks ran', status: 'failed' });
const response = await fetch('https://www.timemission.com/api/monitor-status', {
  method: 'POST', headers: { Authorization: 'Bearer ' + process.env.TM_MONITOR_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ checks, runUrl: process.env.TM_MONITOR_RUN_URL, activation: process.env.TM_MONITOR_ACTIVATION === 'true' }),
});
if (!response.ok) throw new Error(`Monitoring report/email endpoint returned ${response.status}`);
console.log(await response.text());
