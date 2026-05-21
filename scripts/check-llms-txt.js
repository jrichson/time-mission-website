const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const registryPath = path.join(root, 'src/data/routes.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const machineReadableRoutes = registry.machineReadableRoutes || [];

function routeUrl(route) {
    return route.canonicalPath === '/'
        ? `${registry.baseUrl}/`
        : `${registry.baseUrl}${route.canonicalPath}`;
}

const distPath = path.join(root, 'dist', 'llms.txt');
if (!fs.existsSync(distPath)) {
    console.error('llms.txt check failed:');
    console.error(`- Missing ${path.relative(root, distPath)} — run npm run build:astro first`);
    process.exit(1);
}

const body = fs.readFileSync(distPath, 'utf8');

const allowlist = new Set();
for (const route of registry.routes) {
    if (!route.sitemap) continue;
    allowlist.add(routeUrl(route));
}
for (const route of machineReadableRoutes) {
    allowlist.add(routeUrl(route));
}

const nonEmptyLines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
if (nonEmptyLines.length === 0 || !nonEmptyLines[0].startsWith('# Time Mission')) {
    errors.push('llms.txt first non-empty line must be H1 # Time Mission');
}

const firstSix = body.split(/\r?\n/).slice(0, 6);
const hasBlurb = firstSix.some((l) => l.startsWith('> '));
if (!hasBlurb) {
    errors.push('llms.txt must include a blockquote line starting with "> " in the first 6 lines');
}
if (!/##\s/.test(body)) {
    errors.push('llms.txt must contain at least one ## heading');
}
for (const heading of ['## Direct Answer Summary', '## Key Facts', '## Machine-Readable Context']) {
    if (!body.includes(heading)) {
        errors.push(`llms.txt must include ${heading}`);
    }
}
if (!body.includes('## Citation-Ready Answer Blocks')) {
    errors.push('llms.txt must include citation-ready answer blocks');
}
for (const route of machineReadableRoutes.filter((entry) => entry.canonicalPath !== '/llms.txt')) {
    const requiredUrl = routeUrl(route);
    if (!body.includes(requiredUrl)) {
        errors.push(`llms.txt must reference ${requiredUrl}`);
    }
}
if (body.includes('?book=')) errors.push('llms.txt must not contain ?book=');
if (body.includes('/contact-thank-you')) errors.push('llms.txt must not include /contact-thank-you');
if (body.includes('/_archive/')) errors.push('llms.txt must not include /_archive/');
if (/\.html\b/i.test(body)) errors.push('llms.txt must not reference .html URLs');

for (const file of machineReadableRoutes.map((route) => route.outputFile)) {
    const mdPath = path.join(root, 'dist', file);
    if (!fs.existsSync(mdPath)) {
        errors.push(`Missing ${path.relative(root, mdPath)} — run npm run build:astro first`);
    }
}

const llmsFullPath = path.join(root, 'dist', 'llms-full.txt');
if (fs.existsSync(llmsFullPath)) {
    const llmsFullBody = fs.readFileSync(llmsFullPath, 'utf8');
    for (const heading of [
        '## Citation-Ready Answer Blocks',
        '## Complete Location Facts',
        '## Complete FAQ Answers',
        '## Booking And Pricing Facts',
        '## Primary Source Index',
        '## Machine-Readable Files',
        '## Citation Guidance For AI Systems',
    ]) {
        if (!llmsFullBody.includes(heading)) {
            errors.push(`llms-full.txt must include ${heading}`);
        }
    }
    for (const route of machineReadableRoutes) {
        const requiredUrl = routeUrl(route);
        if (!llmsFullBody.includes(requiredUrl)) {
            errors.push(`llms-full.txt must reference ${requiredUrl}`);
        }
    }
} else {
    errors.push('Missing dist/llms-full.txt — run npm run build:astro first');
}

const aiContextPath = path.join(root, 'dist', 'ai-context.md');
if (fs.existsSync(aiContextPath)) {
    const aiContextBody = fs.readFileSync(aiContextPath, 'utf8');
    if (!aiContextBody.includes('## Citation-Ready Answer Blocks')) {
        errors.push('ai-context.md must include citation-ready answer blocks');
    }
    const blocks = [...aiContextBody.matchAll(/### [^\n]+\n\n([\s\S]*?)(?=\n### |\n## |$)/g)].map((m) => m[1].trim());
    const optimalBlocks = blocks.filter((block) => {
        const wordCount = block.split(/\s+/).filter(Boolean).length;
        return wordCount >= 134 && wordCount <= 167;
    });
    if (optimalBlocks.length < 5) {
        errors.push(`ai-context.md must include at least 5 citation-ready 134-167 word blocks (found ${optimalBlocks.length})`);
    }
}

const pricingPath = path.join(root, 'dist', 'pricing.md');
if (fs.existsSync(pricingPath)) {
    const pricingBody = fs.readFileSync(pricingPath, 'utf8');
    if (!pricingBody.includes('| Antwerp | https://timemission.eu/antwerp |')) {
        errors.push('pricing.md must use the external EU public URL for Antwerp');
    }
    if (/https:\/\/(?:www\.)?timemission\.com\/(?:antwerp|brussels)\b/.test(pricingBody)) {
        errors.push('pricing.md must not publish on-site public URLs for EU locations');
    }
}

const crawlerChecklistPath = path.join(root, 'docs', 'ai-crawler-access-checklist.md');
if (!fs.existsSync(crawlerChecklistPath)) {
    errors.push('Missing docs/ai-crawler-access-checklist.md');
} else {
    const checklistBody = fs.readFileSync(crawlerChecklistPath, 'utf8');
    for (const token of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-User', 'Claude-SearchBot', 'Googlebot', 'Bingbot']) {
        if (!checklistBody.includes(token)) {
            errors.push(`ai-crawler-access-checklist.md must mention ${token}`);
        }
    }
    for (const artifact of ['/robots.txt', '/llms.txt', '/llms-full.txt', '/ai-context.md', '/pricing.md']) {
        if (!checklistBody.includes(artifact)) {
            errors.push(`ai-crawler-access-checklist.md must mention ${artifact}`);
        }
    }
}

const urlRe = /https:\/\/www\.timemission\.com[^\s\)`'"]+/g;
function validateKnownUrls(label, text) {
    const urls = [...text.matchAll(urlRe)].map((m) => m[0]);
    for (const u of urls) {
        if (!allowlist.has(u)) {
            errors.push(`${label}: URL not in canonical public or machine-readable set: ${u}`);
        }
    }
    return urls;
}

const found = validateKnownUrls('llms.txt', body);
if (fs.existsSync(llmsFullPath)) validateKnownUrls('llms-full.txt', fs.readFileSync(llmsFullPath, 'utf8'));

if (errors.length) {
    console.error('llms.txt check failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
}

console.log(`llms.txt check passed for ${found.length} URLs.`);
