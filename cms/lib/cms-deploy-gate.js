import { canTriggerCmsDeploy } from '../collections/Users.js';

const CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS = 15_000;
const GITHUB_ACTIONS_TIMEOUT_MS = 15_000;
const DEFAULT_GITHUB_DEPLOY_REPO = 'jrichson/time-mission-website';
const DEFAULT_GITHUB_DEPLOY_WORKFLOW_ID = 'cms-wrangler-deploy.yml';
const DEFAULT_GITHUB_DEPLOY_REF = 'rebuild';

function logger(req) {
  return req?.payload?.logger || console;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function deployProvider() {
  const configured = cleanString(process.env.CMS_DEPLOY_PROVIDER).toLowerCase();
  if (configured === 'github_actions' || configured === 'cloudflare_hook') return configured;
  return cleanString(process.env.GITHUB_ACTIONS_DEPLOY_TOKEN) ? 'github_actions' : 'cloudflare_hook';
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

function githubActionsConfig() {
  const token = cleanString(process.env.GITHUB_ACTIONS_DEPLOY_TOKEN);
  const repo = cleanString(process.env.GITHUB_ACTIONS_DEPLOY_REPO) || DEFAULT_GITHUB_DEPLOY_REPO;
  const workflowId = cleanString(process.env.GITHUB_ACTIONS_DEPLOY_WORKFLOW_ID) || DEFAULT_GITHUB_DEPLOY_WORKFLOW_ID;
  const ref = cleanString(process.env.GITHUB_ACTIONS_DEPLOY_REF) || DEFAULT_GITHUB_DEPLOY_REF;

  if (!token) return null;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return null;
  if (!/^(?:\d+|[A-Za-z0-9_.-]+\.ya?ml)$/.test(workflowId)) return null;
  if (!/^[A-Za-z0-9_./-]+$/.test(ref) || ref.includes('..')) return null;

  return { ref, repo, token, workflowId };
}

async function triggerCloudflareDeployHook({ reason, req }) {
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
      provider: 'cloudflare_hook',
      status: res.ok ? 'triggered' : 'failed',
      statusCode: res.status,
      message: res.ok ? 'Deploy triggered.' : `Deploy hook returned ${res.status}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger(req).error?.(`[cms-deploy] Cloudflare Pages hook failed: ${message}`);
    return {
      ok: false,
      provider: 'cloudflare_hook',
      status: 'failed',
      message,
    };
  }
}

async function triggerGithubActionsDeploy({ reason, req }) {
  const config = githubActionsConfig();
  if (!config) {
    return {
      ok: false,
      provider: 'github_actions',
      status: 'not_configured',
      message: 'GitHub Actions deploy trigger is missing or invalid.',
    };
  }

  const url = `https://api.github.com/repos/${config.repo}/actions/workflows/${encodeURIComponent(config.workflowId)}/dispatches`;
  const body = {
    ref: config.ref,
    inputs: {
      reason: cleanString(reason) || 'manual-cms-deploy',
      source: 'payload-cms',
    },
  };

  try {
    const res = await fetch(url, {
      body: JSON.stringify(body),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      method: 'POST',
      signal: AbortSignal.timeout(GITHUB_ACTIONS_TIMEOUT_MS),
    });

    logger(req).info?.(`[cms-deploy] GitHub Actions workflow_dispatch: ${config.repo}/${config.workflowId}@${config.ref} ${res.status}`);
    return {
      ok: res.status === 204,
      provider: 'github_actions',
      status: res.status === 204 ? 'triggered' : 'failed',
      statusCode: res.status,
      message: res.status === 204 ? 'Deploy workflow triggered.' : `GitHub Actions returned ${res.status}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger(req).error?.(`[cms-deploy] GitHub Actions workflow_dispatch failed: ${message}`);
    return {
      ok: false,
      provider: 'github_actions',
      status: 'failed',
      message,
    };
  }
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

  return deployProvider() === 'github_actions'
    ? triggerGithubActionsDeploy({ reason, req })
    : triggerCloudflareDeployHook({ reason, req });
}
