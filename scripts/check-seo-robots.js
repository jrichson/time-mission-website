const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

/** keep in sync with src/lib/seo/route-patterns.ts */
function resolveRobotsForRoute(canonicalPath, table) {
  for (const rule of table.rules) {
    if (rule.match === 'exact' && rule.path === canonicalPath) return rule.robots;
    if (rule.match === 'prefix' && rule.path && canonicalPath.startsWith(rule.path)) return rule.robots;
    if (rule.match === 'default') return rule.robots;
  }
  return 'index,follow';
}

const routes = loadJson('src/data/routes.json');
const robotsFile = loadJson('src/data/site/seo-robots.json');

if (!Array.isArray(robotsFile.rules) || robotsFile.rules.length === 0) {
  errors.push('seo-robots.json: rules must be non-empty array');
}

const defaultRules = robotsFile.rules.filter((r) => r.match === 'default');
if (defaultRules.length !== 1) {
  errors.push('seo-robots.json: must contain exactly one default rule');
} else if (robotsFile.rules[robotsFile.rules.length - 1].match !== 'default') {
  errors.push('seo-robots.json: default rule must be last');
}

const robotsRe = /^(index|noindex)(,(follow|nofollow))?$/;

for (const rule of robotsFile.rules) {
  if (!['exact', 'prefix', 'default'].includes(rule.match)) {
    errors.push(`invalid match: ${rule.match}`);
  }
  if (rule.match === 'exact' || rule.match === 'prefix') {
    if (typeof rule.path !== 'string' || !rule.path.startsWith('/')) {
      errors.push(`rule with match ${rule.match} needs path starting with /`);
    }
  }
  if (!robotsRe.test(rule.robots)) {
    errors.push(`bad robots value: ${rule.robots}`);
  }
}

const canonicalSet = new Set(routes.routes.map((r) => r.canonicalPath));

for (const rule of robotsFile.rules) {
  if (rule.match === 'exact' && rule.path && !canonicalSet.has(rule.path)) {
    errors.push(`orphan exact rule path not in routes.json: ${rule.path}`);
  }
}

const sitemapTrue = new Set(
  routes.routes.filter((r) => r.sitemap === true).map((r) => r.canonicalPath),
);

for (const p of canonicalSet) {
  const resolved = resolveRobotsForRoute(p, robotsFile);
  if (!resolved) {
    errors.push(`no rule resolved for ${p}`);
  }
}

for (const p of sitemapTrue) {
  const resolved = resolveRobotsForRoute(p, robotsFile);
  if (resolved.startsWith('noindex')) {
    errors.push(`noindex resolved for sitemap-eligible route: ${p}`);
  }
}

if (errors.length) {
  console.error('SEO robots check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`SEO robots check passed for ${routes.routes.length} routes.`);
