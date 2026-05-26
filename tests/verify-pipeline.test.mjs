import { describe, expect, it } from 'vitest';
import verifyPipeline from '../scripts/lib/verify-pipeline.cjs';

const { VERIFY_STEPS, VERIFY_SUCCESS_MESSAGE, formatNpmStep, resolveNpmStep } = verifyPipeline;

describe('Verification pipeline', () => {
  it('owns the Pages readiness order', () => {
    expect(VERIFY_STEPS[0][0]).toBe('check');
    expect(VERIFY_STEPS[1][0]).toBe('build:astro');
    expect(VERIFY_STEPS.at(-1)[0]).toBe('test:smoke');
    expect(formatNpmStep(VERIFY_STEPS[0])).toBe('npm run check');
    expect(resolveNpmStep(VERIFY_STEPS[0], 'win32')).toEqual({
      command: 'npm.cmd',
      args: ['run', 'check'],
    });
    expect(VERIFY_SUCCESS_MESSAGE).toBe('verify-site-output.mjs: all steps passed.');
  });
});
