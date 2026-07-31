'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { LexicalNode, LexicalState } from '../lib/blog-authoring';
import styles from './BlogRichTextEditor.module.css';

type MediaDoc = {
  alt?: string | null;
  caption?: string | null;
  height?: number | null;
  id: number | string;
  url?: string | null;
  width?: number | null;
};

type Props = {
  initialState: unknown;
  media: MediaDoc[];
  name: string;
};

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHttpsUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch {
    return '';
  }
}

function safeLinkUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const raw = value.trim();
  if (/^\/(?!\/)[^\s<>"'\\]*$/.test(raw)) return raw;
  return safeHttpsUrl(raw);
}

function mediaValue(
  value: LexicalNode['value'],
  mediaByID: Map<string, MediaDoc>,
): MediaDoc | null {
  if (value && typeof value === 'object' && 'id' in value) return value as unknown as MediaDoc;
  if (typeof value === 'number' || typeof value === 'string') {
    return mediaByID.get(String(value)) ?? null;
  }
  return null;
}

function renderInitialNode(node: LexicalNode, mediaByID: Map<string, MediaDoc>): string {
  const children = (node.children ?? [])
    .map((child) => renderInitialNode(child, mediaByID))
    .join('');

  if (node.type === 'text') {
    let html = escapeHtml(node.text ?? '').replace(/\n/g, '<br>');
    const format = typeof node.format === 'number' ? node.format : 0;
    if ((format & FORMAT_CODE) === FORMAT_CODE) html = `<code>${html}</code>`;
    if ((format & FORMAT_BOLD) === FORMAT_BOLD) html = `<strong>${html}</strong>`;
    if ((format & FORMAT_ITALIC) === FORMAT_ITALIC) html = `<em>${html}</em>`;
    if ((format & FORMAT_UNDERLINE) === FORMAT_UNDERLINE) html = `<u>${html}</u>`;
    if ((format & FORMAT_STRIKETHROUGH) === FORMAT_STRIKETHROUGH) html = `<s>${html}</s>`;
    return html;
  }
  if (node.type === 'paragraph') return `<p>${children || '<br>'}</p>`;
  if (node.type === 'heading') {
    const tag = ['h2', 'h3', 'h4'].includes(node.tag ?? '') ? node.tag : 'h2';
    return `<${tag}>${children || '<br>'}</${tag}>`;
  }
  if (node.type === 'quote') return `<blockquote>${children || '<br>'}</blockquote>`;
  if (node.type === 'list') {
    const tag = node.listType === 'number' || node.tag === 'ol' ? 'ol' : 'ul';
    return `<${tag}>${children}</${tag}>`;
  }
  if (node.type === 'listitem') return `<li>${children || '<br>'}</li>`;
  if (node.type === 'linebreak') return '<br>';
  if (node.type === 'horizontalrule') return '<hr>';
  if (node.type === 'link' || node.type === 'autolink') {
    const href = safeLinkUrl(node.fields?.url ?? node.url);
    return href
      ? `<a href="${escapeHtml(href)}"${node.fields?.newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${children}</a>`
      : children;
  }
  if (node.type === 'upload' && node.relationTo === 'media') {
    const image = mediaValue(node.value, mediaByID);
    const src = safeHttpsUrl(image?.url);
    if (!image || !src) return '';
    const caption = node.fields?.caption || image.caption || '';
    const width = image.width ? ` width="${Math.round(image.width)}"` : '';
    const height = image.height ? ` height="${Math.round(image.height)}"` : '';
    return `<figure data-media-id="${escapeHtml(String(image.id))}"><img src="${escapeHtml(src)}" alt="${escapeHtml(image.alt ?? '')}"${width}${height}><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
  }
  return children;
}

function initialHtml(initialState: unknown, mediaByID: Map<string, MediaDoc>): string {
  if (!initialState || typeof initialState !== 'object' || !('root' in initialState)) {
    return '<p><br></p>';
  }
  const root = (initialState as LexicalState).root;
  if (!Array.isArray(root?.children)) return '<p><br></p>';
  return root.children.map((node) => renderInitialNode(node, mediaByID)).join('') || '<p><br></p>';
}

function textNode(value: string, format: number): LexicalNode {
  return {
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text: value,
    type: 'text',
    version: 1,
  };
}

function serializeChildren(element: Element, format = 0): LexicalNode[] {
  return Array.from(element.childNodes).flatMap((node) => serializeDomNode(node, format));
}

function serializeDomNode(node: Node, inheritedFormat = 0): LexicalNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text ? [textNode(text, inheritedFormat)] : [];
  }
  if (!(node instanceof HTMLElement)) return [];

  const tag = node.tagName.toLowerCase();
  let format = inheritedFormat;
  if (tag === 'strong' || tag === 'b') format |= FORMAT_BOLD;
  if (tag === 'em' || tag === 'i') format |= FORMAT_ITALIC;
  if (tag === 'u') format |= FORMAT_UNDERLINE;
  if (tag === 's' || tag === 'strike') format |= FORMAT_STRIKETHROUGH;
  if (tag === 'code') format |= FORMAT_CODE;

  if (['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'code', 'span'].includes(tag)) {
    return serializeChildren(node, format);
  }
  if (tag === 'br') return [{ type: 'linebreak', version: 1 }];
  if (tag === 'hr') return [{ type: 'horizontalrule', version: 1 }];
  if (tag === 'a') {
    const href = safeLinkUrl(node.getAttribute('href'));
    const children = serializeChildren(node, format);
    if (!href) return children;
    return [
      {
        children,
        fields: {
          newTab: node.getAttribute('target') === '_blank',
          url: href,
        },
        type: 'link',
        version: 1,
      },
    ];
  }
  if (tag === 'figure') {
    const mediaID = node.dataset.mediaId;
    const image = node.querySelector('img');
    const caption = node.querySelector('figcaption')?.textContent?.trim() ?? '';
    if (!mediaID || !image) return [];
    return [
      {
        fields: { caption },
        relationTo: 'media',
        type: 'upload',
        value: /^\d+$/.test(mediaID) ? Number.parseInt(mediaID, 10) : mediaID,
        version: 1,
      },
    ];
  }
  if (tag === 'p' || tag === 'div') {
    return [
      {
        children: serializeChildren(node, format),
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ];
  }
  if (['h2', 'h3', 'h4'].includes(tag)) {
    return [
      {
        children: serializeChildren(node, format),
        format: '',
        indent: 0,
        tag,
        type: 'heading',
        version: 1,
      },
    ];
  }
  if (tag === 'blockquote') {
    return [
      {
        children: serializeChildren(node, format),
        format: '',
        indent: 0,
        type: 'quote',
        version: 1,
      },
    ];
  }
  if (tag === 'ul' || tag === 'ol') {
    return [
      {
        children: Array.from(node.children).flatMap((child) => serializeDomNode(child, format)),
        format: '',
        indent: 0,
        listType: tag === 'ol' ? 'number' : 'bullet',
        start: 1,
        tag,
        type: 'list',
        version: 1,
      } as LexicalNode,
    ];
  }
  if (tag === 'li') {
    return [
      {
        children: serializeChildren(node, format),
        format: '',
        indent: 0,
        type: 'listitem',
        value: 1,
        version: 1,
      },
    ];
  }

  return serializeChildren(node, format);
}

function serializeEditor(element: HTMLDivElement): LexicalState {
  const children = Array.from(element.childNodes).flatMap((node) => {
    const serialized = serializeDomNode(node);
    if (node.nodeType === Node.TEXT_NODE && serialized.length) {
      return [
        {
          children: serialized,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        } satisfies LexicalNode,
      ];
    }
    return serialized;
  });

  return {
    root: {
      children: children.length
        ? children
        : [{ children: [], format: '', indent: 0, type: 'paragraph', version: 1 }],
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  };
}

export default function BlogRichTextEditor({ initialState, media, name }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const mediaByID = useMemo(
    () => new Map(media.map((item) => [String(item.id), item])),
    [media],
  );
  const startingHtml = useMemo(
    () => initialHtml(initialState, mediaByID),
    [initialState, mediaByID],
  );

  const syncValue = useCallback(() => {
    if (!editorRef.current || !hiddenRef.current) return;
    hiddenRef.current.value = JSON.stringify(serializeEditor(editorRef.current));
  }, []);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedRangeRef.current;
    if (!range) return false;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return true;
  }, []);

  useEffect(() => {
    syncValue();
    const handleSelection = () => saveSelection();
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [saveSelection, syncValue]);

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    syncValue();
  };

  const applyLink = () => {
    const href = safeLinkUrl(linkUrl);
    if (!href) {
      setUploadError('Use a complete https:// link or a site path that starts with /.');
      return;
    }
    runCommand('createLink', href);
    setLinkUrl('');
    setUploadError('');
  };

  const uploadImage = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadAlt.trim()) {
      setUploadError('Choose an image and add an image description.');
      return;
    }

    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.set('file', file);
    formData.set('alt', uploadAlt.trim());
    formData.set('caption', uploadCaption.trim());

    try {
      const response = await fetch('/blog/media', {
        body: formData,
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'The image could not be uploaded.');

      const figure = `<figure data-media-id="${escapeHtml(String(result.id))}"><img src="${escapeHtml(String(result.url))}" alt="${escapeHtml(String(result.alt))}"${result.width ? ` width="${Number(result.width)}"` : ''}${result.height ? ` height="${Number(result.height)}"` : ''}><figcaption>${escapeHtml(String(result.caption || ''))}</figcaption></figure><p><br></p>`;
      editorRef.current?.focus();
      if (restoreSelection()) {
        document.execCommand('insertHTML', false, figure);
      } else if (editorRef.current) {
        editorRef.current.insertAdjacentHTML('beforeend', figure);
      }
      syncValue();
      setUploadOpen(false);
      setUploadAlt('');
      setUploadCaption('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The image could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar} aria-label="Article formatting">
        <div className={styles.formatGroup}>
          <button onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('formatBlock', 'p')} type="button">
            Body
          </button>
          <button onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('formatBlock', 'h2')} type="button">
            H2
          </button>
          <button onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('formatBlock', 'h3')} type="button">
            H3
          </button>
        </div>
        <div className={styles.formatGroup}>
          <button aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')} type="button">
            <strong>B</strong>
          </button>
          <button aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')} type="button">
            <em>I</em>
          </button>
          <button aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')} type="button">
            • List
          </button>
          <button aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertOrderedList')} type="button">
            1. List
          </button>
          <button aria-label="Quote" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('formatBlock', 'blockquote')} type="button">
            Quote
          </button>
        </div>
        <div className={styles.linkControl}>
          <label>
            <span className={styles.srOnly}>Link URL</span>
            <input
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https:// or /site-page"
              type="url"
              value={linkUrl}
            />
          </label>
          <button onClick={applyLink} type="button">Add link</button>
        </div>
        <button
          className={styles.imageButton}
          onClick={() => setUploadOpen((value) => !value)}
          type="button"
        >
          Add image
        </button>
      </div>

      {uploadOpen ? (
        <section className={styles.uploadPanel} aria-label="Add article image">
          <label>
            <span>Image file</span>
            <input accept="image/gif,image/jpeg,image/png,image/webp" ref={fileRef} type="file" />
          </label>
          <label>
            <span>Image description</span>
            <input
              maxLength={180}
              onChange={(event) => setUploadAlt(event.target.value)}
              placeholder="Teams solving a glowing mission room"
              type="text"
              value={uploadAlt}
            />
          </label>
          <label>
            <span>Caption <small>Optional</small></span>
            <input
              maxLength={240}
              onChange={(event) => setUploadCaption(event.target.value)}
              placeholder="Shown beneath the image"
              type="text"
              value={uploadCaption}
            />
          </label>
          <button disabled={uploading} onClick={uploadImage} type="button">
            {uploading ? 'Uploading image…' : 'Upload and place image'}
          </button>
        </section>
      ) : null}

      {uploadError ? <p className={styles.error} role="alert">{uploadError}</p> : null}

      <div
        aria-label="Article body"
        aria-multiline="true"
        className={styles.surface}
        contentEditable
        dangerouslySetInnerHTML={{ __html: startingHtml }}
        onBlur={syncValue}
        onInput={syncValue}
        ref={editorRef}
        role="textbox"
        suppressContentEditableWarning
      />
      <input name={name} ref={hiddenRef} type="hidden" />
      <p className={styles.help}>
        Select text to format it. Place the cursor where an image should appear, then choose Add image.
      </p>
    </div>
  );
}
