import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  markCmsDeployNeeded,
  triggerCmsDeploy,
} from '../cms/lib/cms-deploy-gate.js';

const originalHook = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
const originalProvider = process.env.CMS_DEPLOY_PROVIDER;
const originalGithubToken = process.env.GITHUB_ACTIONS_DEPLOY_TOKEN;
const originalGithubRepo = process.env.GITHUB_ACTIONS_DEPLOY_REPO;
const originalGithubWorkflow = process.env.GITHUB_ACTIONS_DEPLOY_WORKFLOW_ID;
const originalGithubRef = process.env.GITHUB_ACTIONS_DEPLOY_REF;

function reqFor(user) {
  return {
    payload: {
      logger: {
        error: vi.fn(),
        info: vi.fn(),
      },
    },
    user: {
      collection: 'users',
      id: 1,
      email: 'admin@example.com',
      ...user,
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  restoreEnv('CLOUDFLARE_PAGES_DEPLOY_HOOK_URL', originalHook);
  restoreEnv('CMS_DEPLOY_PROVIDER', originalProvider);
  restoreEnv('GITHUB_ACTIONS_DEPLOY_TOKEN', originalGithubToken);
  restoreEnv('GITHUB_ACTIONS_DEPLOY_REPO', originalGithubRepo);
  restoreEnv('GITHUB_ACTIONS_DEPLOY_WORKFLOW_ID', originalGithubWorkflow);
  restoreEnv('GITHUB_ACTIONS_DEPLOY_REF', originalGithubRef);
});

function restoreEnv(name, value) {
  if (value == null) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('CMS deploy gate', () => {
  it('marks published CMS content as deploy-needed without calling the deploy hook', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const req = reqFor({ role: 'editor' });

    expect(markCmsDeployNeeded({
      action: 'change',
      collection: 'landings',
      doc: { published: true },
      previousDoc: { published: false },
      req,
    })).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(req.payload.logger.info).toHaveBeenCalledWith(
      '[cms-deploy] landings change is Published in CMS; manual deploy is required.',
    );
  });

  it('keeps deploy permission separate from editor and admin roles', async () => {
    process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL = 'https://deploy.example/hook';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(triggerCmsDeploy({ req: reqFor({ role: 'editor', canDeploy: true }) }))
      .resolves.toMatchObject({ ok: false, status: 'forbidden' });
    await expect(triggerCmsDeploy({ req: reqFor({ role: 'admin', canDeploy: false }) }))
      .resolves.toMatchObject({ ok: false, status: 'forbidden' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('triggers the deploy hook only for an admin with deploy permission', async () => {
    process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL = 'https://deploy.example/hook';
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);

    await expect(triggerCmsDeploy({ req: reqFor({ role: 'admin', canDeploy: true }) }))
      .resolves.toMatchObject({ ok: true, status: 'triggered', statusCode: 200 });
    expect(fetchSpy).toHaveBeenCalledWith('https://deploy.example/hook', expect.objectContaining({ method: 'POST' }));
  });

  it('can trigger the Wrangler deploy GitHub Action for an admin with deploy permission', async () => {
    process.env.CMS_DEPLOY_PROVIDER = 'github_actions';
    process.env.GITHUB_ACTIONS_DEPLOY_TOKEN = 'github-token';
    process.env.GITHUB_ACTIONS_DEPLOY_REPO = 'jrichson/time-mission-website';
    process.env.GITHUB_ACTIONS_DEPLOY_WORKFLOW_ID = 'cms-wrangler-deploy.yml';
    process.env.GITHUB_ACTIONS_DEPLOY_REF = 'rebuild';
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchSpy);

    await expect(triggerCmsDeploy({ reason: 'cms-hours-update', req: reqFor({ role: 'admin', canDeploy: true }) }))
      .resolves.toMatchObject({ ok: true, provider: 'github_actions', status: 'triggered', statusCode: 204 });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/jrichson/time-mission-website/actions/workflows/cms-wrangler-deploy.yml/dispatches',
      expect.objectContaining({
        body: JSON.stringify({
          ref: 'rebuild',
          inputs: {
            reason: 'cms-hours-update',
            source: 'payload-cms',
          },
        }),
        headers: expect.objectContaining({
          Authorization: 'Bearer github-token',
        }),
        method: 'POST',
      }),
    );
  });

  it('fails closed when the deploy hook is not configured', async () => {
    delete process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
    delete process.env.GITHUB_ACTIONS_DEPLOY_TOKEN;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(triggerCmsDeploy({ req: reqFor({ role: 'admin', canDeploy: true }) }))
      .resolves.toMatchObject({ ok: false, status: 'not_configured' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
