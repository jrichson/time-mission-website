import Link from 'next/link';

import styles from './home.module.css';

const landingActions = [
  {
    href: '/landings/new?preset=general-ticket-booking',
    label: 'Simple ticket page',
    meta: 'Fast start',
    description: 'Use this when the goal is getting visitors to book.',
  },
  {
    href: '/landings/new?preset=general-group-inquiry',
    label: 'Group inquiry page',
    meta: 'Groups',
    description: 'Use this for parties, teams, schools, or private events.',
  },
  {
    href: '/landings/new?preset=local-venue-booking',
    label: 'Local venue page',
    meta: 'Location',
    description: 'Use this for a city or venue booking page.',
  },
  {
    href: '/admin/collections/landings',
    label: 'Review existing drafts',
    meta: 'Drafts',
    description: 'Open saved drafts, previews, and published pages.',
  },
];

const primaryTasks = [
  {
    href: '/landings/new?preset=general-ticket-booking',
    label: 'Create a landing page',
    meta: 'New page',
    description: 'Start from a short form. Most brief details are optional.',
    action: 'Create',
  },
  {
    href: '/admin/collections/location-details',
    label: 'Change location info',
    meta: 'Addresses and hours',
    description: 'Edit address, hours, booking links, and location page details.',
    action: 'Edit',
  },
  {
    href: '/admin/collections/announcement-banners',
    label: 'Add a website banner',
    meta: 'Ticker and banner',
    description: 'Show a short message at the top of the public website.',
    action: 'Edit',
  },
  {
    href: '/admin/collections/landings',
    label: 'Review landing drafts',
    meta: 'Campaign pages',
    description: 'Open saved campaign pages, previews, and publish settings.',
    action: 'Review',
  },
  {
    href: '/admin/collections/blog-posts',
    label: 'Write a blog post',
    meta: 'Location updates',
    description: 'Publish local blog posts for location news, openings, and event ideas.',
    action: 'Write',
  },
  {
    href: '/deploy',
    label: 'Make approved changes live',
    meta: 'Release',
    description: 'Use this after edits are reviewed and marked Published in CMS.',
    action: 'Deploy',
  },
];

const advancedLinks = [
  {
    href: '/admin/collections/site-pages',
    label: 'Page SEO Overrides',
    meta: 'SEO',
    description:
      'Search and social metadata only. Canonical page body copy, layouts, and booking settings stay code-owned.',
  },
  {
    href: '/admin/collections/user-invites',
    label: 'User Invites',
    meta: 'Access',
    description: 'Invite editors, copy setup links, and review invite status.',
  },
  {
    href: '/admin/collections/users',
    label: 'Users',
    meta: 'Permissions',
    description: 'Review CMS accounts and owner-granted permissions.',
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
          <Link href="/deploy">Deploy</Link>
        </div>
      </nav>

      <section className={styles.header} aria-labelledby="cms-home-title">
        <div>
          <p className={styles.kicker}>Mission Control</p>
          <h1 id="cms-home-title">What do you need to update?</h1>
          <p className={styles.lede}>
            Pick the plain-English job. If you are not sure where something lives, start here instead of hunting
            through CMS collections.
          </p>
        </div>
      </section>

      <section className={styles.workspace} aria-label="CMS directory">
        <div className={styles.directoryPanel}>
          <section className={styles.directoryGroup} aria-labelledby="primary-cms-work-title">
            <div className={styles.groupHeader}>
              <h2 id="primary-cms-work-title">Common jobs</h2>
              <p>These cover the normal editing work.</p>
            </div>

            <div className={styles.linkList}>
              {primaryTasks.map((item) => (
                <Link className={styles.linkRow} href={item.href} key={item.href}>
                  <span className={styles.rowMeta}>{item.meta}</span>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                  <span className={styles.rowAction}>{item.action}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.templatePanel} aria-labelledby="campaign-starters-title">
            <div>
              <p className={styles.panelLabel}>Landing pages</p>
              <h2 id="campaign-starters-title">Start with a shortcut</h2>
            </div>
            <div className={styles.templateList}>
              {landingActions.map((item) => (
                <Link href={item.href} key={item.href}>
                  <span>{item.meta}</span>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideRail} aria-label="Admin utilities">
          <section className={styles.sideCard} aria-labelledby="help-title">
            <p className={styles.panelLabel}>If you are unsure</p>
            <h2 id="help-title">Use the shortest path</h2>
            <div className={styles.helpList}>
              <p>Need a top message? Use Add a website banner.</p>
              <p>Need a new campaign page? Use Create a landing page.</p>
              <p>Need public changes visible? Publish first, then deploy.</p>
            </div>
          </section>

          <section className={styles.sideCard} aria-labelledby="publishing-flow-title">
            <p className={styles.panelLabel}>Publishing flow</p>
            <h2 id="publishing-flow-title">What live means</h2>
            <ol className={styles.stepList}>
              {workflowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className={styles.panelNote}>
              Published in CMS means approved for release. Live after deploy means the static public site has rebuilt.
            </p>
          </section>

          <section className={styles.sideCard} aria-labelledby="admin-shortcuts-title">
            <details className={styles.advancedDetails}>
              <summary>
                <span className={styles.panelLabel}>Advanced</span>
                <strong id="admin-shortcuts-title">Less common work</strong>
              </summary>
              <div className={styles.advancedList}>
                {advancedLinks.map((item) => (
                  <Link aria-label={`${item.label}: ${item.description}`} href={item.href} key={item.href}>
                    <span>{item.meta}</span>
                    <strong>{item.label}</strong>
                  </Link>
                ))}
              </div>
            </details>
          </section>
        </aside>
      </section>
    </main>
  );
}
