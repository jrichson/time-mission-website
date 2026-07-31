import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  LOCATION_HOUR_DAYS,
  LOCATION_MISSION_OPTIONS,
} from '../../../lib/location-details-options.js';
import { requireCmsUser } from '../../../lib/cms-auth';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type LocationHour = {
  close?: string | null;
  label?: string | null;
  open?: string | null;
};

type LocationDocument = {
  address?: {
    city?: string | null;
    country?: string | null;
    line1?: string | null;
    line2?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  externalLinks?: {
    bookingUrl?: string | null;
    externalUrl?: string | null;
    giftCardUrl?: string | null;
    rollerCheckoutUrl?: string | null;
    waiverUrl?: string | null;
  } | null;
  hiddenMissionIds?: Array<{
    missionId?: string | null;
  }> | null;
  hours?: Record<string, LocationHour | null | undefined> | null;
  id: number | string;
  locationSlug: string;
  published?: boolean | null;
  title: string;
};

type PageProps = {
  searchParams: Promise<{
    count?: string;
    status?: string;
  }>;
};

const textFields = ['line1', 'line2', 'city', 'state', 'zip', 'country'] as const;
const linkFields = [
  'bookingUrl',
  'rollerCheckoutUrl',
  'giftCardUrl',
  'waiverUrl',
  'externalUrl',
] as const;

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function inputName(id: LocationDocument['id'], path: string): string {
  return `location:${id}:${path}`;
}

function formText(formData: FormData, id: LocationDocument['id'], path: string): string {
  return cleanText(formData.get(inputName(id, path)));
}

function normalizedAddress(doc: LocationDocument) {
  return Object.fromEntries(textFields.map((field) => [field, cleanText(doc.address?.[field])]));
}

function normalizedHours(doc: LocationDocument) {
  return Object.fromEntries(
    LOCATION_HOUR_DAYS.map((day) => [
      day.name,
      {
        label: cleanText(doc.hours?.[day.name]?.label),
        open: cleanText(doc.hours?.[day.name]?.open),
        close: cleanText(doc.hours?.[day.name]?.close),
      },
    ]),
  );
}

function normalizedLinks(doc: LocationDocument) {
  return Object.fromEntries(linkFields.map((field) => [field, cleanText(doc.externalLinks?.[field])]));
}

function normalizedMissionIds(doc: LocationDocument): string[] {
  const selected = new Set(
    (doc.hiddenMissionIds ?? [])
      .map((row) => cleanText(row?.missionId))
      .filter(Boolean),
  );

  return LOCATION_MISSION_OPTIONS
    .map((option) => option.value)
    .filter((missionId) => selected.has(missionId));
}

function buildSubmittedData(
  formData: FormData,
  doc: LocationDocument,
  canEditProtectedLinks: boolean,
) {
  const address = Object.fromEntries(
    textFields.map((field) => [field, formText(formData, doc.id, `address.${field}`)]),
  );
  const hours = Object.fromEntries(
    LOCATION_HOUR_DAYS.map((day) => [
      day.name,
      {
        label: formText(formData, doc.id, `hours.${day.name}.label`),
        open: formText(formData, doc.id, `hours.${day.name}.open`),
        close: formText(formData, doc.id, `hours.${day.name}.close`),
      },
    ]),
  );
  const hiddenMissionIds = LOCATION_MISSION_OPTIONS
    .filter((option) => formData.has(inputName(doc.id, `mission.${option.value}`)))
    .map((option) => ({ missionId: option.value }));
  const data: Record<string, unknown> = {
    address,
    hiddenMissionIds,
    hours,
    published: formData.has(inputName(doc.id, 'published')),
  };

  if (canEditProtectedLinks) {
    data.externalLinks = Object.fromEntries(
      linkFields.map((field) => [field, formText(formData, doc.id, `externalLinks.${field}`)]),
    );
  }

  return data;
}

function locationChanged(
  doc: LocationDocument,
  data: Record<string, unknown>,
  canEditProtectedLinks: boolean,
): boolean {
  const current = {
    address: normalizedAddress(doc),
    hiddenMissionIds: normalizedMissionIds(doc).map((missionId) => ({ missionId })),
    hours: normalizedHours(doc),
    published: doc.published === true,
    ...(canEditProtectedLinks ? { externalLinks: normalizedLinks(doc) } : {}),
  };

  return JSON.stringify(current) !== JSON.stringify(data);
}

async function saveBulkLocations(formData: FormData) {
  'use server';

  const { payload, user } = await requireCmsUser('/locations/bulk');
  const submittedIds = formData
    .getAll('locationId')
    .map(cleanText)
    .filter(Boolean);

  if (!submittedIds.length) {
    redirect('/locations/bulk?status=no-locations');
  }

  const found = await payload
    .find({
      collection: 'location-details' as never,
      depth: 0,
      limit: submittedIds.length,
      overrideAccess: false,
      sort: 'locationSlug',
      user,
      where: {
        id: {
          in: submittedIds,
        },
      },
    })
    .catch((error: unknown) => {
      console.error('[locations] bulk lookup failed', error);
      redirect('/locations/bulk?status=lookup-failed');
    });
  const docs = found.docs as unknown as LocationDocument[];

  if (docs.length !== new Set(submittedIds).size) {
    redirect('/locations/bulk?status=location-mismatch');
  }

  const canEditProtectedLinks = user.role === 'admin';
  const updates = docs
    .map((doc) => ({
      data: buildSubmittedData(formData, doc, canEditProtectedLinks),
      doc,
    }))
    .filter(({ data, doc }) => locationChanged(doc, data, canEditProtectedLinks));

  if (!updates.length) {
    redirect('/locations/bulk?status=no-changes');
  }

  const transactionID = await payload.db.beginTransaction().catch((error: unknown) => {
    console.error('[locations] bulk transaction failed to start', error);
    redirect('/locations/bulk?status=transaction-unavailable');
  });

  if (!transactionID) {
    redirect('/locations/bulk?status=transaction-unavailable');
  }

  try {
    for (const { data, doc } of updates) {
      await payload.update({
        collection: 'location-details' as never,
        data: data as never,
        id: doc.id,
        overrideAccess: false,
        req: {
          payload,
          transactionID,
          user,
        } as never,
        user,
      });
    }

    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    console.error('[locations] bulk save failed', error);
    redirect('/locations/bulk?status=save-failed');
  }

  redirect(`/locations/bulk?status=saved&count=${updates.length}`);
}

function statusMessage(status: string | undefined, count: string | undefined) {
  if (status === 'saved') {
    const total = Number.parseInt(count || '', 10);
    const label = Number.isInteger(total) && total > 0 ? `${total} ${total === 1 ? 'location' : 'locations'}` : 'Your locations';
    return {
      body: `${label} saved in the CMS. Use Make changes live when the batch is approved.`,
      tone: 'success',
      title: 'Location changes saved',
    };
  }
  if (status === 'no-changes') {
    return {
      body: 'Nothing changed, so the CMS did not rewrite any location records.',
      tone: 'neutral',
      title: 'No changes to save',
    };
  }
  if (status) {
    return {
      body: 'No location changes were applied. Review required fields and 24-hour opening times, then try again.',
      tone: 'error',
      title: 'The batch was not saved',
    };
  }
  return null;
}

function addressSummary(doc: LocationDocument): string {
  const parts = [
    cleanText(doc.address?.line1),
    cleanText(doc.address?.city),
    cleanText(doc.address?.state),
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : 'Address needs review';
}

export const metadata = {
  title: 'Bulk location editor - Time Mission CMS',
  robots: {
    follow: false,
    index: false,
  },
};

export default async function BulkLocationsPage({ searchParams }: PageProps) {
  const { payload, user } = await requireCmsUser('/locations/bulk');
  const params = await searchParams;
  const result = await payload.find({
    collection: 'location-details' as never,
    depth: 0,
    limit: 100,
    overrideAccess: false,
    sort: 'locationSlug',
    user,
  });
  const locations = result.docs as unknown as LocationDocument[];
  const canEditProtectedLinks = user.role === 'admin';
  const message = statusMessage(params.status, params.count);

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brandMark} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <div className={styles.topbarActions}>
          <Link href="/deploy">Make changes live</Link>
        </div>
      </nav>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Bulk Locations</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Location operations</p>
          <h1>Edit every location in one workspace</h1>
          <p className={styles.lede}>
            Scan the shared fields, expand only the sections you need, then save the reviewed batch once.
          </p>
        </div>
        <dl className={styles.headerFacts}>
          <div>
            <dt>Locations</dt>
            <dd>{locations.length}</dd>
          </div>
          <div>
            <dt>Your access</dt>
            <dd>{canEditProtectedLinks ? 'Admin' : 'Editor'}</dd>
          </div>
          <div>
            <dt>Release state</dt>
            <dd>Deploy gated</dd>
          </div>
        </dl>
      </header>

      {message ? (
        <section
          className={`${styles.notice} ${styles[`notice_${message.tone}`]}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          <strong>{message.title}</strong>
          <p>{message.body}</p>
        </section>
      ) : null}

      <form action={saveBulkLocations} className={styles.editor}>
        <div className={styles.editorIntro}>
          <div>
            <p className={styles.sectionLabel}>Shared location fields</p>
            <h2>Venue matrix</h2>
          </div>
          <p>
            Address and publication fields stay visible. Hours, mission availability, and protected destinations expand
            per venue.
          </p>
        </div>

        <div className={styles.locationList}>
          {locations.map((location, index) => {
            const hiddenMissionIds = new Set(normalizedMissionIds(location));

            return (
              <section className={styles.locationRow} key={location.id}>
                <input name="locationId" type="hidden" value={String(location.id)} />

                <div className={styles.locationIdentity}>
                  <div>
                    <span className={styles.locationNumber}>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{location.title}</h3>
                      <p>{addressSummary(location)}</p>
                    </div>
                  </div>
                  <span className={styles.recordNote}>Complete editor</span>
                </div>

                <div className={styles.quickGrid}>
                  <label className={styles.publishField}>
                    <input
                      defaultChecked={location.published === true}
                      name={inputName(location.id, 'published')}
                      type="checkbox"
                    />
                    <span>
                      <strong>Published in CMS</strong>
                      <small>Approved for the next deploy</small>
                    </span>
                  </label>

                  <label>
                    <span>Address line 1</span>
                    <input
                      defaultValue={cleanText(location.address?.line1)}
                      maxLength={160}
                      name={inputName(location.id, 'address.line1')}
                      placeholder="Street address"
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Address line 2</span>
                    <input
                      defaultValue={cleanText(location.address?.line2)}
                      maxLength={120}
                      name={inputName(location.id, 'address.line2')}
                      placeholder="Suite, level, or unit"
                      type="text"
                    />
                  </label>
                  <label>
                    <span>City</span>
                    <input
                      defaultValue={cleanText(location.address?.city)}
                      maxLength={120}
                      name={inputName(location.id, 'address.city')}
                      required
                      type="text"
                    />
                  </label>
                  <label>
                    <span>State / province</span>
                    <input
                      defaultValue={cleanText(location.address?.state)}
                      maxLength={80}
                      name={inputName(location.id, 'address.state')}
                      type="text"
                    />
                  </label>
                  <label>
                    <span>ZIP / postal code</span>
                    <input
                      defaultValue={cleanText(location.address?.zip)}
                      maxLength={32}
                      name={inputName(location.id, 'address.zip')}
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Country</span>
                    <input
                      defaultValue={cleanText(location.address?.country)}
                      maxLength={80}
                      name={inputName(location.id, 'address.country')}
                      required
                      type="text"
                    />
                  </label>
                </div>

                <div className={styles.detailGrid}>
                  <details>
                    <summary>
                      <span>Hours</span>
                      <small>Seven-day schedule</small>
                    </summary>
                    <div className={styles.hoursTable}>
                      <div className={styles.hoursHead} aria-hidden="true">
                        <span>Day</span>
                        <span>Public label</span>
                        <span>Opens</span>
                        <span>Closes</span>
                      </div>
                      {LOCATION_HOUR_DAYS.map((day) => {
                        const hours = location.hours?.[day.name];
                        return (
                          <div className={styles.hoursRow} key={day.name}>
                            <strong>{day.label}</strong>
                            <label>
                              <span>Public label</span>
                              <input
                                defaultValue={cleanText(hours?.label)}
                                maxLength={80}
                                name={inputName(location.id, `hours.${day.name}.label`)}
                                placeholder="12pm – 9pm or Closed"
                                type="text"
                              />
                            </label>
                            <label>
                              <span>Opens</span>
                              <input
                                defaultValue={cleanText(hours?.open)}
                                inputMode="numeric"
                                maxLength={5}
                                name={inputName(location.id, `hours.${day.name}.open`)}
                                pattern="(?:[01]\d|2[0-3]):[0-5]\d"
                                placeholder="12:00"
                                type="text"
                              />
                            </label>
                            <label>
                              <span>Closes</span>
                              <input
                                defaultValue={cleanText(hours?.close)}
                                inputMode="numeric"
                                maxLength={5}
                                name={inputName(location.id, `hours.${day.name}.close`)}
                                pattern="(?:[01]\d|2[0-3]):[0-5]\d"
                                placeholder="21:00"
                                type="text"
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </details>

                  <details>
                    <summary>
                      <span>Unavailable missions</span>
                      <small>{hiddenMissionIds.size ? `${hiddenMissionIds.size} hidden` : 'All missions visible'}</small>
                    </summary>
                    <fieldset className={styles.missionGrid}>
                      <legend>Select missions to hide from this location</legend>
                      {LOCATION_MISSION_OPTIONS.map((option) => (
                        <label key={option.value}>
                          <input
                            defaultChecked={hiddenMissionIds.has(option.value)}
                            name={inputName(location.id, `mission.${option.value}`)}
                            type="checkbox"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </details>

                  {canEditProtectedLinks ? (
                    <details>
                      <summary>
                        <span>Booking destinations</span>
                        <small>Admin only</small>
                      </summary>
                      <div className={styles.linkGrid}>
                        <label>
                          <span>Ticket booking URL</span>
                          <input
                            defaultValue={cleanText(location.externalLinks?.bookingUrl)}
                            maxLength={2048}
                            name={inputName(location.id, 'externalLinks.bookingUrl')}
                            placeholder="https://"
                            type="url"
                          />
                        </label>
                        <label>
                          <span>Roller checkout override</span>
                          <input
                            defaultValue={cleanText(location.externalLinks?.rollerCheckoutUrl)}
                            maxLength={2048}
                            name={inputName(location.id, 'externalLinks.rollerCheckoutUrl')}
                            placeholder="https://"
                            type="url"
                          />
                        </label>
                        <label>
                          <span>Gift card URL</span>
                          <input
                            defaultValue={cleanText(location.externalLinks?.giftCardUrl)}
                            maxLength={2048}
                            name={inputName(location.id, 'externalLinks.giftCardUrl')}
                            placeholder="https://"
                            type="url"
                          />
                        </label>
                        <label>
                          <span>Waiver URL</span>
                          <input
                            defaultValue={cleanText(location.externalLinks?.waiverUrl)}
                            maxLength={2048}
                            name={inputName(location.id, 'externalLinks.waiverUrl')}
                            placeholder="https://"
                            type="url"
                          />
                        </label>
                        <label className={styles.fullField}>
                          <span>External location page URL</span>
                          <input
                            defaultValue={cleanText(location.externalLinks?.externalUrl)}
                            maxLength={2048}
                            name={inputName(location.id, 'externalLinks.externalUrl')}
                            placeholder="https://"
                            type="url"
                          />
                        </label>
                      </div>
                    </details>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>

        <footer className={styles.saveBar}>
          <div>
            <strong>Ready to save the batch?</strong>
            <p>Only changed records are written. If one location is invalid, none of the batch is applied.</p>
          </div>
          <button type="submit">Save all location changes</button>
        </footer>
      </form>
    </main>
  );
}
