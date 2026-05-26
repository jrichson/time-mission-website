import Link from 'next/link';

import styles from './home.module.css';

const quickLinks = [
  {
    href: '/admin/collections/site-pages',
    label: 'Page SEO Overrides',
    description: 'Update search and social metadata for code-owned pages. Canonical page body copy and layouts stay code-owned.',
  },
  {
    href: '/admin/collections/announcement-banners',
    label: 'Announcement Banners',
    description: 'Manage text-only top banner messages, scheduling, priority, and location or region targeting.',
  },
  {
    href: '/admin/collections/landings',
    label: 'Landing Pages',
    description: 'Create campaign pages from a real brief, preview the public result, and publish when approved.',
  },
  {
    href: '/admin/collections/user-invites',
    label: 'User Invites',
    description: 'Invite editors, copy invite links, and keep CMS access limited to approved users.',
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

export default function Home() {
  return (
    <main className={styles.shell}>
      <section className={styles.hero} aria-labelledby="cms-home-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Time Mission CMS</p>
          <h1 id="cms-home-title">Keep the site current without touching code</h1>
          <p className={styles.lede}>
            Launch campaign landings, manage reusable site surfaces, update page SEO, preview work, and invite approved
            editors from one operator console. Canonical page body copy and layouts stay code-owned.
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

      <section className={styles.landingBuilder} aria-labelledby="landing-builder-title">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>Landing builder</p>
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
            <span>{item.label}</span>
            <p>{item.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
