export type LexicalNode = {
  children?: LexicalNode[];
  detail?: number;
  fields?: {
    caption?: string;
    newTab?: boolean;
    url?: string;
  };
  format?: number | string;
  indent?: number;
  listType?: string;
  mode?: string;
  relationTo?: string;
  start?: number;
  style?: string;
  tag?: string;
  text?: string;
  type: string;
  url?: string;
  value?: number | string | Record<string, unknown>;
  version?: number;
};

export type LexicalState = {
  root: LexicalNode & {
    children: LexicalNode[];
    type: 'root';
  };
};

const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_NODE_TYPES = new Set([
  'autolink',
  'heading',
  'horizontalrule',
  'linebreak',
  'link',
  'list',
  'listitem',
  'paragraph',
  'quote',
  'root',
  'text',
  'upload',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength = 2048): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeNode(value: unknown, depth = 0): LexicalNode | null {
  if (!isRecord(value) || depth > 24) return null;

  const type = cleanString(value.type, 32);
  if (!ALLOWED_NODE_TYPES.has(type)) return null;

  const children = Array.isArray(value.children)
    ? value.children
        .map((child) => normalizeNode(child, depth + 1))
        .filter((child): child is LexicalNode => Boolean(child))
        .slice(0, 1000)
    : undefined;
  const node: LexicalNode = {
    type,
    version: 1,
  };

  if (children) node.children = children;
  if (typeof value.detail === 'number') node.detail = value.detail;
  if (typeof value.format === 'number' || typeof value.format === 'string') {
    node.format = value.format;
  }
  if (typeof value.indent === 'number') node.indent = Math.max(0, Math.min(12, value.indent));
  if (typeof value.listType === 'string') node.listType = cleanString(value.listType, 20);
  if (typeof value.mode === 'string') node.mode = cleanString(value.mode, 20);
  if (typeof value.start === 'number') node.start = Math.max(1, Math.floor(value.start));
  if (typeof value.style === 'string') node.style = cleanString(value.style, 500);
  if (typeof value.tag === 'string') node.tag = cleanString(value.tag, 8);
  if (typeof value.text === 'string') node.text = value.text.slice(0, 100_000);
  if (typeof value.url === 'string') node.url = cleanString(value.url, 2048);
  if (typeof value.relationTo === 'string') node.relationTo = cleanString(value.relationTo, 64);
  if (
    typeof value.value === 'number' ||
    typeof value.value === 'string' ||
    isRecord(value.value)
  ) {
    node.value = value.value;
  }
  if (isRecord(value.fields)) {
    node.fields = {
      caption: cleanString(value.fields.caption, 240),
      newTab: value.fields.newTab === true,
      url: cleanString(value.fields.url, 2048),
    };
  }

  if (type === 'upload') {
    if (node.relationTo !== 'media') return null;
    const relationID = isRecord(node.value) ? node.value.id : node.value;
    if (typeof relationID !== 'number' && typeof relationID !== 'string') return null;
    node.value = relationID;
  }

  return node;
}

export function emptyLexicalState(): LexicalState {
  return {
    root: {
      children: [
        {
          children: [],
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  };
}

export function plainTextLexicalState(value: string): LexicalState {
  const text = cleanString(value, 100_000);
  if (!text) return emptyLexicalState();

  return {
    root: {
      children: text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => ({
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: paragraph,
              type: 'text',
              version: 1,
            },
          ],
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        })),
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  };
}

export function parseLexicalState(value: string): LexicalState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !isRecord(parsed.root)) return null;
  const root = normalizeNode(parsed.root);
  if (!root || root.type !== 'root' || !Array.isArray(root.children)) return null;

  return {
    root: {
      ...root,
      children: root.children,
      type: 'root',
    },
  };
}

export function lexicalPlainText(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.root)) return '';

  const root = normalizeNode(value.root);
  if (!root) return '';

  const lines: string[] = [];
  const visit = (node: LexicalNode): string => {
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'linebreak') return '\n';
    const text = (node.children ?? []).map(visit).join('');
    if (['paragraph', 'heading', 'quote', 'listitem'].includes(node.type) && text.trim()) {
      lines.push(text.trim());
      return '';
    }
    return text;
  };

  visit(root);
  return lines.join('\n\n').trim();
}

export function lexicalHasText(value: LexicalState | null): boolean {
  if (!value) return false;

  const visit = (node: LexicalNode): boolean => {
    if (node.type === 'text' && Boolean(node.text?.trim())) return true;
    return (node.children ?? []).some(visit);
  };

  return visit(value.root);
}

export function blogSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function blogSlugIsValid(value: string): boolean {
  return BLOG_SLUG_PATTERN.test(value);
}
