'use client';

import { useMemo, useRef, useState } from 'react';

import styles from './BlogHeroPicker.module.css';

export type BlogMediaOption = {
  alt?: string | null;
  caption?: string | null;
  height?: number | null;
  id: number | string;
  thumbnailURL?: string | null;
  url?: string | null;
  width?: number | null;
};

type Props = {
  initialID?: number | string | null;
  media: BlogMediaOption[];
  name: string;
};

function displayURL(media: BlogMediaOption): string {
  return media.thumbnailURL || media.url || '';
}

export default function BlogHeroPicker({ initialID, media, name }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(media);
  const [selectedID, setSelectedID] = useState(initialID ? String(initialID) : '');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const selected = useMemo(
    () => items.find((item) => String(item.id) === selectedID) ?? null,
    [items, selectedID],
  );

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !alt.trim()) {
      setError('Choose an image and add an image description.');
      return;
    }

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.set('file', file);
    formData.set('alt', alt.trim());
    formData.set('caption', caption.trim());

    try {
      const response = await fetch('/blog/media', {
        body: formData,
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'The image could not be uploaded.');

      const uploaded: BlogMediaOption = {
        alt: result.alt,
        caption: result.caption,
        height: result.height,
        id: result.id,
        url: result.url,
        width: result.width,
      };
      setItems((current) => [uploaded, ...current]);
      setSelectedID(String(uploaded.id));
      setAlt('');
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The image could not be uploaded.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={styles.picker}>
      <input name={name} type="hidden" value={selectedID} />

      <div className={styles.current}>
        <div className={styles.currentMedia}>
          {selected && displayURL(selected) ? (
            // Payload media URLs are runtime uploads and cannot use Next's build-time image allowlist.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={selected.alt || ''} src={displayURL(selected)} />
          ) : (
            <div className={styles.placeholder}>
              <span>Hero image</span>
              <strong>Optional</strong>
            </div>
          )}
        </div>
        <div>
          <span className={styles.eyebrow}>Selected image</span>
          <strong>{selected?.alt || 'Use the website default'}</strong>
          <p>
            {selected
              ? 'Shown on the post and blog cards.'
              : 'Choose an existing image or upload a new one.'}
          </p>
          {selected ? (
            <button onClick={() => setSelectedID('')} type="button">
              Remove selection
            </button>
          ) : null}
        </div>
      </div>

      {items.length ? (
        <div className={styles.library}>
          <div>
            <span className={styles.eyebrow}>Recent uploads</span>
            <p>Choose one already in the media library.</p>
          </div>
          <div className={styles.mediaGrid}>
            {items.slice(0, 12).map((item) => (
              <button
                aria-pressed={String(item.id) === selectedID}
                className={String(item.id) === selectedID ? styles.selected : undefined}
                key={item.id}
                onClick={() => setSelectedID(String(item.id))}
                type="button"
              >
                {displayURL(item) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={displayURL(item)} />
                ) : (
                  <span>No preview</span>
                )}
                <small>{item.alt || 'Untitled image'}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <details className={styles.upload}>
        <summary>Upload a new hero image</summary>
        <div className={styles.uploadGrid}>
          <label>
            <span>Image file</span>
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              ref={fileRef}
              type="file"
            />
          </label>
          <label>
            <span>Image description</span>
            <input
              maxLength={180}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Friends entering a Time Mission venue"
              type="text"
              value={alt}
            />
          </label>
          <label>
            <span>Caption <small>Optional</small></span>
            <input
              maxLength={240}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Shown when this image is used in an article"
              type="text"
              value={caption}
            />
          </label>
          <button disabled={uploading} onClick={upload} type="button">
            {uploading ? 'Uploading…' : 'Upload and select'}
          </button>
        </div>
      </details>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
