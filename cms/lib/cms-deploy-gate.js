import { canTriggerCmsDeploy } from '../collections/Users.js';

const CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS = 15_000;

function logger(req) {
  return req?.payload?.logger || console;
}

function deployHookURL() {
  const value = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  if (!value) {
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    return null;
  }

  return url.toString();
}

export function publishedContentChanged({ doc, previousDoc }) {
  return Boolean(doc?.published || previousDoc?.published);
}

export function publishedContentDeleted({ doc }) {
  return Boolean(doc?.published);
}

export function markCmsDeployNeeded({ action, collection, doc, previousDoc, req }) {
  const needsDeploy =
    action === 'delete'
      ? publishedContentDeleted({ doc })
      : publishedContentChanged({ doc, previousDoc });

  if (needsDeploy) {
    logger(req).info?.(`[cms-deploy] ${collection} ${action} is Published in CMS; manual deploy is required.`);
  }

  return needsDeploy;
}

export async function triggerCmsDeploy({ reason = 'manual-cms-deploy', req }) {
  if (!canTriggerCmsDeploy({ req })) {
    return {
      ok: false,
      status: 'forbidden',
      message: 'Your CMS account does not have deploy permission.',
    };
  }

  const url = deployHookURL();
  if (!url) {
    return {
      ok: false,
      status: 'not_configured',
      message: 'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is missing or invalid.',
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS),
    });

    logger(req).info?.(`[cms-deploy] Cloudflare Pages hook: ${reason} ${res.status}`);
    return {
      ok: res.ok,
      status: res.ok ? 'triggered' : 'failed',
      statusCode: res.status,
      message: res.ok ? 'Deploy triggered.' : `Deploy hook returned ${res.status}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger(req).error?.(`[cms-deploy] Cloudflare Pages hook failed: ${message}`);
    return {
      ok: false,
      status: 'failed',
      message,
    };
  }
}
