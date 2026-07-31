import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { AnnouncementBanner } from '../../payload-types';
import { requireCmsUser } from '../../lib/cms-auth';
import { LOCATION_DETAIL_OPTIONS } from '../../lib/location-details-options.js';
import workspaceStyles from '../blog/blog.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    count?: string;
    status?: string;
  }>;
};

const scopes = new Set(['global', 'locations', 'regions']);
const behaviors = new Set(['animated', 'auto', 'static']);
const regions = new Set(['europe', 'us']);
const locationSlugs = new Set(LOCATION_DETAIL_OPTIONS.map((option) => option.value));

function key(id: number | string, field: string): string {
  return `announcement:${id}:${field}`;
}

function text(formData: FormData, id: number | string, field: string, maxLength = 2048): string {
  const value = formData.get(key(id, field));
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

function isoDate(value: string, endOfDay = false): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  const parsed = new Date(`${value}${suffix}`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function safeLink(value: string): string {
  if (!value || value.length > 2048 || /[<>"'\\\s]/.test(value)) return '';
  if (/^\/$|^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value)) {
    return value;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch {
    return '';
  }
}

async function saveAnnouncements(formData: FormData) {
  'use server';

  const { payload, user } = await requireCmsUser('/announcements');
  const ids = formData
    .getAll('announcementId')
    .map((value) => String(value).trim())
    .filter(Boolean);
  let changeCount = 0;

  for (const id of ids) {
    const title = text(formData, id, 'title', 120);
    const message = text(formData, id, 'message', 180);
    if (id === 'new' && !title && !message) continue;
    if (!title || !message) {
      redirect('/announcements?status=required-fields');
    }

    if (formData.has(key(id, 'remove'))) {
      await payload.delete({
        collection: 'announcement-banners',
        id,
        overrideAccess: false,
        user,
      });
      changeCount += 1;
      continue;
    }

    const targetScopeRaw = text(formData, id, 'targetScope', 20);
    const targetScope: AnnouncementBanner['targetScope'] = scopes.has(targetScopeRaw)
      ? targetScopeRaw as AnnouncementBanner['targetScope']
      : 'global';
    const tickerRaw = text(formData, id, 'tickerBehavior', 20);
    const tickerBehavior: AnnouncementBanner['tickerBehavior'] = behaviors.has(tickerRaw)
      ? tickerRaw as AnnouncementBanner['tickerBehavior']
      : 'auto';
    const start = isoDate(text(formData, id, 'startsAt', 10));
    const end = isoDate(text(formData, id, 'endsAt', 10), true);
    const linkUrlRaw = text(formData, id, 'linkUrl', 2048);
    const linkUrl = safeLink(linkUrlRaw);
    if (linkUrlRaw && !linkUrl) redirect('/announcements?status=link-url');
    if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
      redirect('/announcements?status=date-order');
    }

    const data = {
      endsAt: end,
      linkLabel: text(formData, id, 'linkLabel', 80),
      linkUrl,
      message,
      priority: Math.max(-1000, Math.min(1000, Number.parseInt(text(formData, id, 'priority', 8), 10) || 0)),
      published: formData.has(key(id, 'published')),
      startsAt: start,
      targetLocations: targetScope === 'locations'
        ? formData
            .getAll(key(id, 'targetLocations'))
            .map(String)
            .filter((slug) => locationSlugs.has(slug))
            .map((locationSlug) => ({ locationSlug }))
        : [],
      targetRegions: targetScope === 'regions'
        ? formData
            .getAll(key(id, 'targetRegions'))
            .map(String)
            .filter((region) => regions.has(region))
            .map((region) => ({ region: region as 'europe' | 'us' }))
        : [],
      targetScope,
      tickerBehavior,
      title,
    };

    if (id === 'new') {
      await payload.create({
        collection: 'announcement-banners',
        data,
        overrideAccess: false,
        user,
      });
    } else {
      await payload.update({
        collection: 'announcement-banners',
        data,
        id,
        overrideAccess: false,
        user,
      });
    }
    changeCount += 1;
  }

  redirect(`/announcements?status=saved&count=${changeCount}`);
}

function statusMessage(status: string | undefined, count: string | undefined) {
  if (status === 'saved') return { tone: 'success', text: `${count || '0'} announcement rows saved.` };
  if (status === 'required-fields') return { tone: 'error', text: 'Every saved row needs an internal title and public message.' };
  if (status === 'link-url') return { tone: 'error', text: 'Use a clean website path or complete https:// link.' };
  if (status === 'date-order') return { tone: 'error', text: 'An announcement end date must come after its start date.' };
  return null;
}

function targetSet(items: AnnouncementBanner['targetLocations']): Set<string> {
  return new Set(items?.map((item) => item.locationSlug) || []);
}

function AnnouncementFields({
  announcement,
  id,
}: {
  announcement?: AnnouncementBanner;
  id: number | string;
}) {
  const selectedLocations = targetSet(announcement?.targetLocations);
  const selectedRegions = new Set(announcement?.targetRegions?.map((item) => item.region) || []);

  return (
    <section className={styles.row}>
      <input name="announcementId" type="hidden" value={String(id)} />
      <div className={styles.identity}>
        <div>
          <span>{announcement ? 'Saved announcement' : 'New announcement'}</span>
          <strong>{announcement?.title || 'Add another website message'}</strong>
        </div>
        {announcement ? (
          <label className={styles.remove}>
            <input name={key(id, 'remove')} type="checkbox" />
            <span>Remove on save</span>
          </label>
        ) : null}
      </div>

      <div className={styles.fields}>
        <label>
          <span>Internal title</span>
          <input defaultValue={announcement?.title || ''} maxLength={120} name={key(id, 'title')} />
        </label>
        <label className={styles.message}>
          <span>Public message</span>
          <input defaultValue={announcement?.message || ''} maxLength={180} name={key(id, 'message')} />
        </label>
        <label>
          <span>Movement</span>
          <select defaultValue={announcement?.tickerBehavior || 'auto'} name={key(id, 'tickerBehavior')}>
            <option value="auto">Automatic</option>
            <option value="static">Keep centered</option>
            <option value="animated">Scroll across screen</option>
          </select>
        </label>
        <label>
          <span>Audience</span>
          <select defaultValue={announcement?.targetScope || 'global'} name={key(id, 'targetScope')}>
            <option value="global">All visitors</option>
            <option value="regions">Selected regions</option>
            <option value="locations">Selected locations</option>
          </select>
        </label>
        <label>
          <span>Starts <small>Optional</small></span>
          <input defaultValue={dateValue(announcement?.startsAt)} name={key(id, 'startsAt')} type="date" />
        </label>
        <label>
          <span>Ends <small>Optional</small></span>
          <input defaultValue={dateValue(announcement?.endsAt)} name={key(id, 'endsAt')} type="date" />
        </label>
        <label>
          <span>Link text <small>Optional</small></span>
          <input defaultValue={announcement?.linkLabel || ''} maxLength={80} name={key(id, 'linkLabel')} />
        </label>
        <label>
          <span>Link destination <small>Optional</small></span>
          <input defaultValue={announcement?.linkUrl || ''} maxLength={2048} name={key(id, 'linkUrl')} />
        </label>
        <label>
          <span>Priority</span>
          <input defaultValue={announcement?.priority || 0} max={1000} min={-1000} name={key(id, 'priority')} type="number" />
        </label>
      </div>

      <div className={styles.targets}>
        <details>
          <summary>Target regions</summary>
          <div>
            {[['us', 'United States'], ['europe', 'Europe']].map(([value, label]) => (
              <label key={value}>
                <input
                  defaultChecked={selectedRegions.has(value as 'us' | 'europe')}
                  name={key(id, 'targetRegions')}
                  type="checkbox"
                  value={value}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </details>
        <details>
          <summary>Target locations</summary>
          <div>
            {LOCATION_DETAIL_OPTIONS.map((location) => (
              <label key={location.value}>
                <input
                  defaultChecked={selectedLocations.has(location.value)}
                  name={key(id, 'targetLocations')}
                  type="checkbox"
                  value={location.value}
                />
                <span>{location.label.replace('Time Mission ', '')}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      <label className={styles.publish}>
        <input
          defaultChecked={announcement?.published === true}
          name={key(id, 'published')}
          type="checkbox"
        />
        <span>
          <strong>Published in CMS</strong>
          <small>Approved for the next deliberate website deploy.</small>
        </span>
      </label>
    </section>
  );
}

export const metadata = {
  title: 'Website announcements - Time Mission CMS',
};

export default async function AnnouncementsPage({ searchParams }: PageProps) {
  const [{ payload, user }, query] = await Promise.all([
    requireCmsUser('/announcements'),
    searchParams,
  ]);
  const result = await payload.find({
    collection: 'announcement-banners',
    depth: 0,
    limit: 100,
    overrideAccess: false,
    sort: '-priority',
    user,
  });
  const announcements = result.docs as AnnouncementBanner[];
  const notice = statusMessage(query.status, query.count);

  return (
    <main className={workspaceStyles.shell}>
      <nav className={workspaceStyles.topbar} aria-label="CMS shortcuts">
        <Link className={workspaceStyles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Announcement actions">
          <Link href="/deploy">Deploy</Link>
        </nav>
      </nav>

      <nav className={workspaceStyles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Website announcements</span>
      </nav>

      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.kicker}>Top-of-site message</p>
          <h1>Edit every announcement together.</h1>
          <p>
            Review existing messages, change audience and dates, or add a new row. The highest
            eligible priority wins after the next website deploy.
          </p>
        </div>
        <div className={workspaceStyles.headerFact}>
          <span>Saved messages</span>
          <strong>{announcements.length}</strong>
        </div>
      </header>

      <section className={workspaceStyles.workspace}>
        {notice ? (
          <p className={notice.tone === 'error' ? styles.error : styles.success} role={notice.tone === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        ) : null}

        <form action={saveAnnouncements} className={styles.form}>
          {announcements.map((announcement) => (
            <AnnouncementFields announcement={announcement} id={announcement.id} key={announcement.id} />
          ))}
          <AnnouncementFields id="new" />
          <footer className={styles.actions}>
            <div>
              <strong>One batch save</strong>
              <span>Only Published in CMS messages can appear after deploy.</span>
            </div>
            <button type="submit">Save announcement changes</button>
          </footer>
        </form>
      </section>
    </main>
  );
}
