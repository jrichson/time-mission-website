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

const directoryGroups = [
  {
    title: 'Site content',
    intro: 'Routine public-site updates that do not change page layouts.',
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
    intro: 'Campaign pages that start from a brief and preview before publish.',
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
  {
    title: 'Release and access',
    intro: 'Publishing, invites, and user management. Keep these separate from content edits.',
    links: [
      {
        href: '/deploy',
        label: 'Deploy Gate',
        meta: 'Release',
        description: 'Push approved CMS content live after it is Published in CMS.',
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

      <section className={styles.header} aria-labelledby="cms-home-title">
        <div>
          <p className={styles.kicker}>CMS workbench</p>
          <h1 id="cms-home-title">Choose the CMS area, then make the edit.</h1>
          <p className={styles.lede}>
            One directory for editor-safe content, landing pages, release, and access. Rows show what each area changes
            before you open Payload.
          </p>
        </div>

        <div className={styles.jumpList} aria-label="CMS section jump links">
          {directoryGroups.map((group) => (
            <a href={`#${group.title.replace(/\s+/g, '-').toLowerCase()}`} key={group.title}>
              {group.title}
            </a>
          ))}
        </div>
      </section>

      <section className={styles.workspace} aria-label="CMS directory">
        <div className={styles.directoryPanel}>
          {directoryGroups.map((group) => (
            <section
              className={styles.directoryGroup}
              aria-labelledby={`${group.title.replace(/\s+/g, '-').toLowerCase()}-title`}
              id={group.title.replace(/\s+/g, '-').toLowerCase()}
              key={group.title}
            >
              <div className={styles.groupHeader}>
                <h2 id={`${group.title.replace(/\s+/g, '-').toLowerCase()}-title`}>{group.title}</h2>
                <p>{group.intro}</p>
              </div>

              <div className={styles.linkList}>
                {group.links.map((item) => (
                  <Link className={styles.linkRow} href={item.href} key={item.href}>
                    <span className={styles.rowMeta}>{item.meta}</span>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                    <span className={styles.rowAction}>Open</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className={styles.sideRail} aria-label="Admin utilities">
          <section className={styles.sideCard} aria-labelledby="publishing-flow-title">
            <p className={styles.panelLabel}>Publishing flow</p>
            <h2 id="publishing-flow-title">What “live” means</h2>
            <ol className={styles.stepList}>
              {workflowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className={styles.panelNote}>
              Published in CMS means approved in Payload. Live after deploy means the static public site has rebuilt.
            </p>
          </section>

          <section className={styles.sideCard} aria-labelledby="admin-shortcuts-title">
            <p className={styles.panelLabel}>Shortcuts</p>
            <h2 id="admin-shortcuts-title">Admin utilities</h2>
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
