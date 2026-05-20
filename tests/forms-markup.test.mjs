import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(abs));
    else files.push(abs);
  }
  return files;
}

function sourceMarkup() {
  return [
    ...walk(path.join(root, 'src', 'pages')).filter((file) => file.endsWith('.astro')),
    ...walk(path.join(root, 'src', 'partials')).filter((file) => file.endsWith('.frag.txt')),
  ].map((file) => ({
    file,
    text: fs.readFileSync(file, 'utf8'),
  }));
}

function groupsMarkup() {
  const groupsPartial = path.join(root, 'src', 'partials', 'groups-main.frag.txt');
  const groupsDir = path.join(root, 'groups');
  const groupSubpages = fs.existsSync(groupsDir)
    ? walk(groupsDir).filter((file) => file.endsWith('.html'))
    : [];

  return [groupsPartial, ...groupSubpages].map((file) => ({
    file,
    text: fs.readFileSync(file, 'utf8'),
  }));
}

describe('production form markup', () => {
  it('does not rely on Netlify form handling', () => {
    const offenders = sourceMarkup()
      .filter(({ text }) => /data-netlify|netlify-honeypot|action="\/contact-thank-you"/.test(text))
      .map(({ file }) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });

  it('normalizes newsletter forms to real Pages Function posts', () => {
    const markup = sourceMarkup().map(({ text }) => text).join('\n');

    expect(markup).not.toContain('<form class="newsletter-form">');
    expect((markup.match(/action="\/api\/newsletter"/g) || []).length).toBeGreaterThan(10);
    expect((markup.match(/data-tm-form="newsletter"/g) || []).length)
      .toBe((markup.match(/action="\/api\/newsletter"/g) || []).length);
  });

  it('mounts Turnstile on every production form', () => {
    const markup = sourceMarkup().map(({ text }) => text).join('\n');
    const formCount = (markup.match(/data-tm-form="/g) || []).length;
    const turnstileCount = (markup.match(/data-tm-turnstile/g) || []).length;

    expect(formCount).toBeGreaterThan(10);
    expect(turnstileCount).toBe(formCount);
  });

  it('does not expose the deprecated group event FormSubmit form', () => {
    const offenders = groupsMarkup()
      .filter(({ text }) => /formsubmit\.co|class="inquiry-form"|id="inquiry"/.test(text))
      .map(({ file }) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });
});

describe('groups CTA markup', () => {
  it('keeps tracked groups Book Now anchors wired to ticket booking', () => {
    const offenders = groupsMarkup()
      .filter(({ text }) => /<a href="#" class="(?:btn-tickets|btn-primary btn-tickets)">/.test(text))
      .map(({ file }) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });
});
