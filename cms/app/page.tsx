import Link from 'next/link';

import styles from './home.module.css';

const quickLinks = [
  {
    href: '/admin/collections/site-pages',
    label: 'Page SEO Overrides',
    meta: 'SEO',
    description:
      'Update search and social metadata for code-owned pages. Canonical page body copy, layouts, and booking settings stay code-owned.',
  },
  {
    href: '/admin/collections/announcement-banners',
    label: 'Announcement Banners',
    meta: 'Shared surface',
    description: 'Manage text-only top banner messages, scheduling, priority, and location or region targeting.',
  },
  {
    href: '/admin/collections/location-details',
    label: 'Location Details',
    meta: 'Locations',
    description: 'Update public address and hours for existing locations. Pages, booking links, and providers stay code-owned.',
  },
  {
    href: '/admin/collections/landings',
    label: 'Landing Pages',
    meta: 'Campaigns',
    description: 'Create campaign pages from a real brief, preview the public result, and publish when approved.',
  },
  {
    href: '/admin/collections/user-invites',
    label: 'User Invites',
    meta: 'Access',
    description: 'Invite editors, copy invite links, and keep CMS access limited to approved users.',
  },
  {
    href: '/deploy',
    label: 'Deploy Gate',
    meta: 'Release',
    description: 'Trigger the public-site deploy after approved CMS content is ready to go live.',
  },
];

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

const workflowSteps = ['Draft', 'Preview', 'Published in CMS', 'Live after deploy'];

const systemStats = [
  {
    label: 'Managed surfaces',
    value: '4',
    text: 'Banners, SEO, locations, and landings stay editable from the CMS.',
  },
  {
    label: 'Draft workflow',
    value: 'Preview',
    text: 'Campaign pages are reviewed before they are marked Published in CMS.',
  },
  {
    label: 'Release model',
    value: 'Gate',
    text: 'Published CMS content goes live only after an approved deploy.',
  },
];

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
          <p className={styles.kicker}>Operator console</p>
          <h1 id="cms-home-title">Manage CMS content without blurring ownership</h1>
          <p className={styles.lede}>
            Launch campaign pages, tune shared site surfaces, invite editors, and release approved changes through one
            measured workflow.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/landings/new">
              Start landing brief
            </Link>
            <Link className={styles.secondaryAction} href="/admin">
              Open admin
            </Link>
          </div>
        </div>

        <aside className={styles.publishPanel} aria-label="Publishing workflow">
          <p className={styles.panelLabel}>Publishing flow</p>
          <ol className={styles.stepList}>
            {workflowSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className={styles.panelNote}>
            CMS saves create drafts and previews first. Published in CMS means approved; content is Live after deploy
            when the static public site rebuilds.
          </p>
        </aside>
      </section>

      <section className={styles.statGrid} aria-label="CMS operating model">
        {systemStats.map((item) => (
          <article className={styles.statCard} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className={styles.landingBuilder} aria-labelledby="landing-builder-title">
        <div className={styles.sectionIntro}>
          <h2 id="landing-builder-title">Start with the campaign brief</h2>
          <p>
            Do not start from a blank template. Capture the source, visitor intent, and success metric
            first, then choose the landing shape that fits the job.
          </p>
        </div>
        <div className={styles.landingGrid}>
          {landingActions.map((item) => (
            <Link className={styles.landingAction} href={item.href} key={item.href}>
              <span className={styles.actionMeta}>{item.meta}</span>
              <strong>{item.label}</strong>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.quickLinks} aria-label="CMS work areas">
        {quickLinks.map((item) => (
          <Link className={styles.quickLink} href={item.href} key={item.href}>
            <small>{item.meta}</small>
            <span>{item.label}</span>
            <p>{item.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
