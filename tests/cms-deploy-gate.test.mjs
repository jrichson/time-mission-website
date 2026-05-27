import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  markCmsDeployNeeded,
  triggerCmsDeploy,
} from '../cms/lib/cms-deploy-gate.js';

const originalHook = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;

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
  if (originalHook == null) {
    delete process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  } else {
    process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL = originalHook;
  }
});

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

  it('fails closed when the deploy hook is not configured', async () => {
    delete process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(triggerCmsDeploy({ req: reqFor({ role: 'admin', canDeploy: true }) }))
      .resolves.toMatchObject({ ok: false, status: 'not_configured' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
