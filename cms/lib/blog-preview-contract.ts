const DEFAULT_BLOG_HERO_IMAGE = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
const TEXT_FORMAT_BOLD = 1;
const TEXT_FORMAT_ITALIC = 2;
const TEXT_FORMAT_STRIKETHROUGH = 4;
const TEXT_FORMAT_UNDERLINE = 8;
const TEXT_FORMAT_CODE = 16;

type PayloadRichTextValue = string | PayloadLexicalEditorState | null | undefined;

interface PayloadLexicalEditorState {
  root?: PayloadLexicalNode | null;
}

interface PayloadLexicalNode {
  children?: PayloadLexicalNode[] | null;
  fields?: {
    caption?: string | null;
    newTab?: boolean | null;
    url?: string | null;
  } | null;
  format?: number | string | null;
  listType?: string | null;
  relationTo?: string | null;
  tag?: string | null;
  text?: string | null;
  type?: string | null;
  url?: string | null;
  value?: string | number | PayloadMediaDoc | null;
}

interface PayloadMediaDoc {
  alt?: string | null;
  caption?: string | null;
  filename?: string | null;
  height?: number | null;
  id?: string | number | null;
  mimeType?: string | null;
  url?: string | null;
  width?: number | null;
}

export interface PreviewBlogPostDoc {
  body?: PayloadRichTextValue;
  excerpt?: PayloadRichTextValue;
  externalPublisher?: string | null;
  externalUrl?: string | null;
  heroImage?: string | null;
  heroMedia?: string | number | PayloadMediaDoc | null;
  id: string | number;
  postType?: 'article' | 'external' | string | null;
  publishDate?: string | null;
  published?: boolean | null;
  title?: string | null;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lexicalChildren(node: PayloadLexicalNode | null | undefined): PayloadLexicalNode[] {
  return Array.isArray(node?.children)
    ? (node.children.filter(isRecord) as PayloadLexicalNode[])
    : [];
}

function lexicalRootChildren(value: unknown): PayloadLexicalNode[] {
  if (!isRecord(value) || !isRecord(value.root)) return [];
  return lexicalChildren(value.root as PayloadLexicalNode);
}

function publicAssetPath(value: unknown): string {
  const raw = cleanString(value);
  if (
    raw.startsWith('/assets/') &&
    raw.length <= 512 &&
    !raw.includes('://') &&
    !raw.includes('..') &&
    !/[<>"'\\\s]/.test(raw)
  ) {
    return raw;
  }
  return '';
}

function safeHttpsUrl(value: unknown): string {
  const raw = cleanString(value);
  if (!raw || raw.length > 2048 || /[<>"'\\\s]/.test(raw)) return '';

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return '';
  }

  if (url.protocol !== 'https:' || url.username || url.password) return '';
  return url.toString();
}

function mediaDoc(value: unknown): PayloadMediaDoc | null {
  return isRecord(value) ? (value as PayloadMediaDoc) : null;
}

function mediaUrl(value: unknown): string {
  return safeHttpsUrl(mediaDoc(value)?.url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(value: unknown): string {
  const href = cleanString(value);
  if (/^https?:\/\/[^\s<>"'\\]+$/i.test(href)) return href;
  if (/^mailto:[^\s<>"'\\]+$/i.test(href)) return href;
  if (/^tel:[+0-9().\-\s]+$/i.test(href)) return href;
  if (/^\/(?!\/)[^\s<>"'\\]*$/.test(href)) return href;
  return '';
}

function textFormatIncludes(format: unknown, flag: number): boolean {
  return typeof format === 'number' && (format & flag) === flag;
}

function renderFormattedText(node: PayloadLexicalNode): string {
  let html = escapeHtml(typeof node.text === 'string' ? node.text : '').replace(/\n/g, '<br>');
  if (!html) return '';

  if (textFormatIncludes(node.format, TEXT_FORMAT_CODE)) html = `<code>${html}</code>`;
  if (textFormatIncludes(node.format, TEXT_FORMAT_BOLD)) html = `<strong>${html}</strong>`;
  if (textFormatIncludes(node.format, TEXT_FORMAT_ITALIC)) html = `<em>${html}</em>`;
  if (textFormatIncludes(node.format, TEXT_FORMAT_UNDERLINE)) html = `<u>${html}</u>`;
  if (textFormatIncludes(node.format, TEXT_FORMAT_STRIKETHROUGH)) html = `<s>${html}</s>`;

  return html;
}

function renderLexicalChildren(node: PayloadLexicalNode): string {
  return lexicalChildren(node).map(renderLexicalNodeHtml).filter(Boolean).join('');
}

function renderLexicalNodeHtml(node: PayloadLexicalNode): string {
  const type = cleanString(node.type);

  if (type === 'text') return renderFormattedText(node);
  if (type === 'linebreak') return '<br>';
  if (type === 'horizontalrule') return '<hr>';

  if (type === 'paragraph') {
    const inner = renderLexicalChildren(node);
    return inner ? `<p>${inner}</p>` : '';
  }

  if (type === 'heading') {
    const inner = renderLexicalChildren(node);
    if (!inner) return '';
    const candidate = cleanString(node.tag);
    const tag = ['h2', 'h3', 'h4', 'h5', 'h6'].includes(candidate) ? candidate : 'h2';
    return `<${tag}>${inner}</${tag}>`;
  }

  if (type === 'quote') {
    const inner = renderLexicalChildren(node);
    return inner ? `<blockquote>${inner}</blockquote>` : '';
  }

  if (type === 'list') {
    const inner = renderLexicalChildren(node);
    if (!inner) return '';
    const tag =
      cleanString(node.listType) === 'number' || cleanString(node.tag) === 'ol' ? 'ol' : 'ul';
    return `<${tag}>${inner}</${tag}>`;
  }

  if (type === 'listitem') {
    const inner = renderLexicalChildren(node);
    return inner ? `<li>${inner}</li>` : '';
  }

  if (type === 'link' || type === 'autolink') {
    const inner = renderLexicalChildren(node);
    const href = safeHref(node.url || node.fields?.url);
    if (!inner || !href) return inner;
    const newTabAttrs = node.fields?.newTab
      ? ' target="_blank" rel="noopener noreferrer"'
      : '';
    return `<a href="${escapeHtml(href)}"${newTabAttrs}>${inner}</a>`;
  }

  if (type === 'upload' && cleanString(node.relationTo) === 'media') {
    const media = mediaDoc(node.value);
    const src = mediaUrl(media);
    if (!media || !src) return '';

    const alt = escapeHtml(cleanString(media.alt));
    const caption = cleanString(node.fields?.caption) || cleanString(media.caption);
    const width =
      Number.isFinite(media.width) && Number(media.width) > 0
        ? ` width="${Math.round(Number(media.width))}"`
        : '';
    const height =
      Number.isFinite(media.height) && Number(media.height) > 0
        ? ` height="${Math.round(Number(media.height))}"`
        : '';
    const captionHtml = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';

    return `<figure class="tm-blog-inline-image"><img src="${escapeHtml(src)}" alt="${alt}"${width}${height} loading="lazy" decoding="async">${captionHtml}</figure>`;
  }

  return renderLexicalChildren(node);
}

function legacyTextHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function richTextHtml(value: PayloadRichTextValue): string {
  if (typeof value === 'string') return legacyTextHtml(cleanString(value));
  return lexicalRootChildren(value).map(renderLexicalNodeHtml).filter(Boolean).join('\n');
}

function blogPostIsExternal(doc: PreviewBlogPostDoc): boolean {
  return cleanString(doc.postType) === 'external';
}

export function previewBlogPostHeroImage(doc: PreviewBlogPostDoc): string {
  return mediaUrl(doc.heroMedia) || publicAssetPath(doc.heroImage) || DEFAULT_BLOG_HERO_IMAGE;
}

export function previewBlogPostExcerptHtml(doc: PreviewBlogPostDoc): string {
  return richTextHtml(doc.excerpt);
}

export function previewBlogPostDateLabel(doc: PreviewBlogPostDoc): string {
  const raw = cleanString(doc.publishDate);
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return '';
  const date = parsed.toISOString().slice(0, 10);

  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
}

export function previewBlogPostBodyHtml(doc: PreviewBlogPostDoc): string {
  return richTextHtml(doc.body);
}

export function previewBlogPostExternalUrl(doc: PreviewBlogPostDoc): string {
  return blogPostIsExternal(doc) ? safeHttpsUrl(doc.externalUrl) : '';
}

export function previewBlogPostExternalPublisher(doc: PreviewBlogPostDoc): string {
  const publisher = cleanString(doc.externalPublisher);
  if (publisher) return publisher;

  const externalUrl = previewBlogPostExternalUrl(doc);
  if (!externalUrl) return '';

  try {
    return new URL(externalUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
