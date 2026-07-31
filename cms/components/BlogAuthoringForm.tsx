'use client';

import { useState } from 'react';

import { saveBlogPost } from '../app/blog/actions';
import { blogSlug } from '../lib/blog-authoring';
import BlogHeroPicker, { type BlogMediaOption } from './BlogHeroPicker';
import BlogRichTextEditor from './BlogRichTextEditor';
import styles from './BlogAuthoringForm.module.css';

export type BlogEditorDocument = {
  body?: unknown;
  excerptText?: string;
  externalPublisher?: string | null;
  externalUrl?: string | null;
  heroMedia?: BlogMediaOption | number | string | null;
  id?: number | string;
  includeInSitemap?: boolean | null;
  locationSlug?: string | null;
  postType?: string | null;
  publishDate?: string | null;
  published?: boolean | null;
  seo?: {
    metaDescription?: string | null;
    metaTitle?: string | null;
    robots?: string | null;
  } | null;
  slug?: string | null;
  title?: string | null;
};

type LocationOption = {
  label: string;
  value: string;
};

type Props = {
  document?: BlogEditorDocument | null;
  error?: string;
  locations: LocationOption[];
  media: BlogMediaOption[];
  status?: string;
};

const errorMessages: Record<string, string> = {
  'article-required': 'Write the article before publishing it.',
  'external-url': 'Use a complete, credential-free https:// source URL.',
  'external-url-required': 'Add the source URL before publishing this shared link.',
  'required-fields': 'Complete the title, URL, location, date, and short summary.',
  'slug-exists': 'That post URL is already in use. Choose a different one.',
};

function dateInputValue(value: unknown): string {
  if (typeof value !== 'string' || !value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
}

function heroID(value: BlogEditorDocument['heroMedia']): number | string | null {
  if (value && typeof value === 'object') return value.id;
  return value ?? null;
}

export default function BlogAuthoringForm({
  document,
  error,
  locations,
  media,
  status,
}: Props) {
  const [postType, setPostType] = useState(
    document?.postType === 'external' ? 'external' : 'article',
  );
  const [title, setTitle] = useState(document?.title ?? '');
  const [slug, setSlug] = useState(document?.slug ?? '');
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(document?.slug));
  const message = error ? errorMessages[error] || 'Review the highlighted details and try again.' : '';

  const updateTitle = (value: string) => {
    setTitle(value);
    if (!slugWasEdited) setSlug(blogSlug(value));
  };

  return (
    <form action={saveBlogPost} className={styles.form}>
      {document?.id ? <input name="id" type="hidden" value={String(document.id)} /> : null}

      {status === 'saved' ? (
        <div className={styles.success} role="status">
          <strong>Draft saved</strong>
          <span>The preview now reflects these changes.</span>
        </div>
      ) : null}
      {message ? (
        <div className={styles.error} role="alert">
          <strong>Couldn’t save this post</strong>
          <span>{message}</span>
        </div>
      ) : null}

      <section className={styles.section} aria-labelledby="post-type-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>01</span>
            <h2 id="post-type-title">Choose the story format</h2>
          </div>
          <p>Write the full story here or share coverage hosted by another publisher.</p>
        </div>

        <div className={styles.typeSwitch}>
          <label className={postType === 'article' ? styles.typeSelected : undefined}>
            <input
              checked={postType === 'article'}
              name="postType"
              onChange={() => setPostType('article')}
              type="radio"
              value="article"
            />
            <span>Original article</span>
            <small>Rich text, links, headings, lists, and inline images.</small>
          </label>
          <label className={postType === 'external' ? styles.typeSelected : undefined}>
            <input
              checked={postType === 'external'}
              name="postType"
              onChange={() => setPostType('external')}
              type="radio"
              value="external"
            />
            <span>Shared link</span>
            <small>Press releases, news coverage, and partner stories.</small>
          </label>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="post-details-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>02</span>
            <h2 id="post-details-title">Post details</h2>
          </div>
          <p>These details control the blog card, location feed, and public URL.</p>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.fullField}>
            <span>Title</span>
            <input
              maxLength={120}
              name="title"
              onChange={(event) => updateTitle(event.target.value)}
              placeholder="What is the story?"
              required
              type="text"
              value={title}
            />
          </label>
          <label>
            <span>Post URL</span>
            <div className={styles.slugField}>
              <small>/blog/</small>
              <input
                maxLength={120}
                name="slug"
                onChange={(event) => {
                  setSlugWasEdited(true);
                  setSlug(blogSlug(event.target.value));
                }}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="post-url"
                required
                type="text"
                value={slug}
              />
            </div>
          </label>
          <label>
            <span>Location feed</span>
            <select
              defaultValue={document?.locationSlug || locations[0]?.value}
              name="locationSlug"
              required
            >
              {locations.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Publish date</span>
            <input
              defaultValue={dateInputValue(document?.publishDate)}
              name="publishDate"
              required
              type="date"
            />
          </label>
          <label className={styles.fullField}>
            <span>Short summary</span>
            <textarea
              defaultValue={document?.excerptText || ''}
              maxLength={600}
              name="excerpt"
              placeholder="One or two sentences shown on blog lists and search previews."
              required
              rows={4}
            />
          </label>
        </div>
      </section>

      {postType === 'external' ? (
        <section className={styles.section} aria-labelledby="source-title">
          <div className={styles.sectionHeader}>
            <div>
              <span>03</span>
              <h2 id="source-title">Shared source</h2>
            </div>
            <p>The public post uses the Time Mission design and clearly links to the original source.</p>
          </div>
          <div className={styles.fieldGrid}>
            <label className={styles.fullField}>
              <span>Article or press release URL</span>
              <input
                defaultValue={document?.externalUrl || ''}
                maxLength={2048}
                name="externalUrl"
                placeholder="https://publisher.com/story"
                required
                type="url"
              />
            </label>
            <label className={styles.fullField}>
              <span>Publisher <small>Optional</small></span>
              <input
                defaultValue={document?.externalPublisher || ''}
                maxLength={120}
                name="externalPublisher"
                placeholder="PR Newswire, Chicago Tribune, partner organization…"
                type="text"
              />
            </label>
          </div>
        </section>
      ) : (
        <section className={styles.section} aria-labelledby="article-title">
          <div className={styles.sectionHeader}>
            <div>
              <span>03</span>
              <h2 id="article-title">Write the article</h2>
            </div>
            <p>What you format here is translated into the public Time Mission blog design.</p>
          </div>
          <BlogRichTextEditor
            initialState={document?.body}
            media={media}
            name="bodyJson"
          />
        </section>
      )}

      <section className={styles.section} aria-labelledby="image-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>04</span>
            <h2 id="image-title">Hero image</h2>
          </div>
          <p>Optional. If you leave this empty, the website uses the default blog image.</p>
        </div>
        <BlogHeroPicker initialID={heroID(document?.heroMedia)} media={media} name="heroMedia" />
      </section>

      <section className={styles.section} aria-labelledby="release-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>05</span>
            <h2 id="release-title">Search and release</h2>
          </div>
          <p>Save as a draft until it is reviewed. Publishing still requires a site deploy.</p>
        </div>

        <div className={styles.releaseGrid}>
          <label className={styles.checkField}>
            <input defaultChecked={document?.published === true} name="published" type="checkbox" />
            <span>
              <strong>Published in CMS</strong>
              <small>Approved for the next website deploy.</small>
            </span>
          </label>
          <label className={styles.checkField}>
            <input
              defaultChecked={document?.includeInSitemap !== false}
              name="includeInSitemap"
              type="checkbox"
            />
            <span>
              <strong>Include in sitemap</strong>
              <small>Allow search engines to discover this post.</small>
            </span>
          </label>
        </div>

        <details className={styles.searchDetails}>
          <summary>Custom search preview settings</summary>
          <div className={styles.fieldGrid}>
            <label>
              <span>Search title <small>Optional</small></span>
              <input
                defaultValue={document?.seo?.metaTitle || ''}
                maxLength={90}
                name="metaTitle"
                placeholder="Defaults to the post title"
                type="text"
              />
            </label>
            <label>
              <span>Search visibility</span>
              <select
                defaultValue={
                  document?.seo?.robots === 'noindex,follow'
                    ? 'noindex,follow'
                    : 'index,follow'
                }
                name="robots"
              >
                <option value="index,follow">Show in search results</option>
                <option value="noindex,follow">Hide from search results</option>
              </select>
            </label>
            <label className={styles.fullField}>
              <span>Search description <small>Optional</small></span>
              <textarea
                defaultValue={document?.seo?.metaDescription || ''}
                maxLength={220}
                name="metaDescription"
                placeholder="Defaults to the short summary"
                rows={3}
              />
            </label>
          </div>
        </details>
      </section>

      <footer className={styles.actionBar}>
        <div>
          <strong>{document?.id ? 'Editing saved post' : 'New post'}</strong>
          <span>Save before leaving this page.</span>
        </div>
        <div>
          <button className={styles.secondaryAction} name="intent" type="submit" value="save">
            Save draft
          </button>
          <button className={styles.primaryAction} name="intent" type="submit" value="preview">
            Save and preview
          </button>
        </div>
      </footer>
    </form>
  );
}
