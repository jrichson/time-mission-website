import Link from 'next/link';

import styles from './home.module.css';

const landingActions = [
  {
    href: '/landings/new?template=paid_social_campaign',
    label: 'Create Paid/Social Campaign',
    meta: 'Ad or social campaign',
    description: 'Use when there is an actual ad, post, email, or seasonal offer that needs a matching destination.',
  },
  {
    href: '/landings/new?template=local_venue_city',
    label: 'Create Local Venue/City Landing',
    meta: 'Local venue or city campaign',
    description: 'Use for a city, venue opening, local SEO push, or place-specific offer with real location context.',
  },
  {
    href: '/landings/new?template=group_event',
    label: 'Create Group/Event Landing',
    meta: 'Group or event landing',
    description: 'Use when an event buyer or planner needs a page tied to a specific group use case.',
  },
];

const commonTasks = [
  {
    href: '/admin/collections/location-details',
    label: 'Update hours or address',
    meta: 'Locations',
    description: 'Change the public address and hours for an existing location.',
  },
  {
    href: '/admin/collections/announcement-banners',
    label: 'Change ticker or banner copy',
    meta: 'Shared surface',
    description: 'Edit top-banner messages, targeting, priority, and schedule.',
  },
  {
    href: '/landings/new',
    label: 'Start a landing page brief',
    meta: 'Campaigns',
    description: 'Open the brief-first wizard before choosing a campaign template.',
  },
  {
    href: '/deploy',
    label: 'Push approved content live',
    meta: 'Release',
    description: 'Deploy only after content is Published in CMS and ready for the public site.',
  },
];

const workAreas = [
  {
    title: 'Site content',
    description: 'Reusable public-site surfaces editors can safely update without changing page layouts.',
    links: [
      {
        href: '/admin/collections/location-details',
        label: 'Location Details',
        meta: 'Address and hours',
        description: 'Pages, booking links, providers, and location status stay code-owned.',
      },
      {
        href: '/admin/collections/announcement-banners',
        label: 'Announcement Banners',
        meta: 'Ticker and banner',
        description: 'Text-only top banner messages with scheduling, priority, and location targeting.',
      },
      {
        href: '/admin/collections/site-pages',
        label: 'Page SEO Overrides',
        meta: 'SEO metadata',
        description:
          'Update search and social metadata. Canonical page body copy, layouts, and booking settings stay code-owned.',
      },
    ],
  },
  {
    title: 'Landing pages',
    description: 'Campaign pages start from a brief, preview privately, and publish through the CMS workflow.',
    links: [
      {
        href: '/admin/collections/landings',
        label: 'Manage Landing Pages',
        meta: 'All drafts and published pages',
        description: 'Review existing campaign pages, drafts, previews, and publish state.',
      },
      ...landingActions,
    ],
  },
];

const utilityLinks = [
  {
    href: '/admin',
    label: 'Open Payload admin',
    meta: 'Admin',
  },
  {
    href: '/admin/collections/user-invites',
    label: 'Review invites',
    meta: 'Access',
  },
  {
    href: '/admin/collections/users',
    label: 'Manage users',
    meta: 'Users',
  },
];

const workflowSteps = ['Draft', 'Preview', 'Published in CMS', 'Live after deploy'];

export default function Home() {
  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brandMark} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <div className={styles.topbarActions}>
          <Link href="/admin">Admin</Link>
          <Link href="/deploy">Deploy</Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="cms-home-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>CMS workbench</p>
          <h1 id="cms-home-title">Find the right CMS task quickly.</h1>
          <p className={styles.lede}>
            Choose the thing you need to update, make the edit in Payload, then use the deploy gate when approved
            content should become public.
          </p>
        </div>

        <aside className={styles.publishPanel} aria-label="Publishing workflow">
          <p className={styles.panelLabel}>Publishing model</p>
          <ol className={styles.stepList}>
            {workflowSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className={styles.panelNote}>
            Published in CMS means approved in Payload. Live after deploy means the static public site has rebuilt.
          </p>
        </aside>
      </section>

      <section className={styles.taskPanel} aria-labelledby="common-tasks-title">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Start here</p>
          <h2 id="common-tasks-title">Common tasks</h2>
          <p>Each row goes to one place. Pick the row that matches the work you came to do.</p>
        </div>
        <div className={styles.taskList}>
          {commonTasks.map((item) => (
            <Link className={styles.taskRow} href={item.href} key={item.href}>
              <span className={styles.rowMeta}>{item.meta}</span>
              <strong>{item.label}</strong>
              <p>{item.description}</p>
              <span className={styles.rowAction}>Open</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.workspace} aria-label="CMS work areas">
        <div className={styles.workAreaStack}>
          {workAreas.map((area) => (
            <section className={styles.workArea} aria-labelledby={`${area.title.replace(/\s+/g, '-')}-title`} key={area.title}>
              <div className={styles.workAreaHeader}>
                <h2 id={`${area.title.replace(/\s+/g, '-')}-title`}>{area.title}</h2>
                <p>{area.description}</p>
              </div>
              <div className={styles.linkList}>
                {area.links.map((item) => (
                  <Link className={styles.linkRow} href={item.href} key={item.href}>
                    <span className={styles.rowMeta}>{item.meta}</span>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className={styles.sideRail} aria-label="Admin utilities">
          <section className={styles.sideCard}>
            <h2>Release gate</h2>
            <p>Use this after approved CMS content is ready to become public.</p>
            <Link className={styles.railAction} href="/deploy">
              Open deploy gate
            </Link>
          </section>

          <section className={styles.sideCard}>
            <h2>Access</h2>
            <p>Invites and user management stay here, separate from content editing.</p>
            <div className={styles.utilityList}>
              {utilityLinks.map((item) => (
                <Link href={item.href} key={item.href}>
                  <span>{item.meta}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
