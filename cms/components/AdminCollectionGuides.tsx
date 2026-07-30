import Link from 'next/link';
import React from 'react';

type CollectionGuideProps = {
  actionHref?: string;
  actionLabel?: string;
  eyebrow: string;
  goesLive: string;
  intro: string;
  title: string;
  whatChanges: string;
};

function CollectionGuide({
  actionHref,
  actionLabel,
  eyebrow,
  goesLive,
  intro,
  title,
  whatChanges,
}: CollectionGuideProps) {
  const titleId = `tm-guide-${eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section className="tm-collection-guide" aria-labelledby={titleId}>
      <div className="tm-collection-guide__intro">
        <p className="tm-collection-guide__eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p>{intro}</p>
        <div className="tm-collection-guide__actions">
          {actionHref && actionLabel ? (
            <Link className="tm-collection-guide__action tm-collection-guide__action--primary" href={actionHref}>
              {actionLabel}
            </Link>
          ) : null}
          <Link className="tm-collection-guide__action" href="/">
            Back to Mission Control
          </Link>
        </div>
      </div>
      <dl className="tm-collection-guide__facts">
        <div>
          <dt>What changes</dt>
          <dd>{whatChanges}</dd>
        </div>
        <div>
          <dt>When it is live</dt>
          <dd>{goesLive}</dd>
        </div>
      </dl>
    </section>
  );
}

export function AnnouncementBannersGuide() {
  return (
    <CollectionGuide
      actionHref="/admin/collections/announcement-banners/create"
      actionLabel="Create announcement"
      eyebrow="Website announcements"
      goesLive="Mark it Published in CMS, then use Make changes live."
      intro="Use one announcement for each message. Open a row to edit it, or create a new one for a future campaign."
      title="Show a message at the top of the site."
      whatChanges="The short ticker or banner message visitors see."
    />
  );
}

export function LocationDetailsGuide() {
  return (
    <CollectionGuide
      eyebrow="Locations"
      goesLive="Save the location, then use Make changes live."
      intro="Choose an existing location below. Address, hours, booking links, and availability are organized into separate tabs."
      title="Update an existing location."
      whatChanges="Public location information. This does not create a new venue page."
    />
  );
}

export function BlogPostsGuide() {
  return (
    <CollectionGuide
      actionHref="/admin/collections/blog-posts/create"
      actionLabel="Write a blog post"
      eyebrow="Blog posts"
      goesLive="Mark it Published in CMS, then use Make changes live."
      intro="Draft the article first. Images and search settings are kept in a separate tab so they do not interrupt writing."
      title="Write a location update."
      whatChanges="A post on the main blog and the selected location blog."
    />
  );
}

export function SitePagesGuide() {
  return (
    <CollectionGuide
      eyebrow="Search and sharing"
      goesLive="Save the page settings, then use Make changes live."
      intro="Choose an existing public page below. These settings change how the page appears in search results and social shares."
      title="Update a page preview."
      whatChanges="Page title, description, social image, and search visibility—not page copy or layout."
    />
  );
}
