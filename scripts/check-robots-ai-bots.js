const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distRobots = path.join(root, 'dist', 'robots.txt');

if (!fs.existsSync(distRobots)) {
    console.error('robots.txt AI bot check failed:');
    console.error(`- Missing ${path.relative(root, distRobots)} — run npm run build:astro first`);
    process.exit(1);
}

const content = fs.readFileSync(distRobots, 'utf8');
const lines = content.split(/\r?\n/);
const errors = [];

const REQUIRED_BOTS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'anthropic-ai',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
];

const sitemapLines = lines.filter((l) => l.trim().startsWith('Sitemap:'));
if (sitemapLines.length !== 1) {
    errors.push(`Expected exactly one Sitemap: line, found ${sitemapLines.length}`);
} else if (sitemapLines[0].trim() !== 'Sitemap: https://timemission.com/sitemap.xml') {
    errors.push(`Unexpected Sitemap line: ${sitemapLines[0].trim()}`);
}

function assertBotAllow(token) {
    const uaLine = `User-agent: ${token}`;
    const idx = lines.findIndex((l) => l.trim() === uaLine);
    if (idx === -1) {
        errors.push(`Missing ${uaLine}`);
        return;
    }
    let nonEmpty = 0;
    let allowOk = false;
    for (let i = idx + 1; i < lines.length; i++) {
        const t = lines[i].trim();
        if (!t) continue;
        if (t.startsWith('User-agent:')) break;
        nonEmpty += 1;
        if (nonEmpty > 5) {
            errors.push(`${token}: no Allow: / within 5 non-empty lines after User-agent`);
            return;
        }
        if (t === 'Disallow: /') {
            errors.push(`${token}: Disallow: / must not immediately block crawl after User-agent`);
            return;
        }
        if (t === 'Allow: /') {
            allowOk = true;
            break;
        }
    }
    if (!allowOk) {
        errors.push(`${token}: expected Allow: / after User-agent within 5 non-empty lines`);
    }
}

for (const bot of REQUIRED_BOTS) {
    assertBotAllow(bot);
}

if (errors.length) {
    console.error('robots.txt AI bot check failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
}

console.log(`robots.txt AI bot check passed for ${REQUIRED_BOTS.length} bots.`);
