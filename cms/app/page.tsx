import Link from 'next/link';

import styles from './home.module.css';

const quickLinks = [
  {
    href: '/admin/collections/site-pages',
    label: 'Existing Pages',
    description: 'Update canonical site pages, SEO metadata, and page-specific content without changing code.',
  },
  {
    href: '/admin/collections/landings',
    label: 'Landing Pages',
    description: 'Create campaign pages at /c/{page-url}, preview them, and publish when they are ready.',
  },
  {
    href: '/admin/collections/user-invites',
    label: 'User Invites',
    description: 'Invite editors, copy invite links, and keep CMS access limited to approved users.',
  },
];

const landingActions = [
  {
    href: '/admin/collections/landings/create?template=paid_social_campaign',
    label: 'Create Paid/Social Campaign',
    meta: 'Ad or social campaign',
    description: 'Match the source promise, keep one booking-first action, and use concrete proof.',
  },
  {
    href: '/admin/collections/landings/create?template=local_venue_city',
    label: 'Create Local Venue/City Landing',
    meta: 'Local venue or city campaign',
    description: 'Make the place feel real with venue proof, city context, and launch-state-aware CTAs.',
  },
  {
    href: '/admin/collections/landings/create?template=group_event',
    label: 'Create Group/Event Landing',
    meta: 'Group or event landing',
    description: 'Reassure the planner, reduce logistics anxiety, and route high-touch inquiries clearly.',
  },
];

const workflowSteps = ['Choose the marketing job', 'Fill guided fields', 'Preview the page', 'Publish and deploy'];

export default function Home() {
  return (
    <main className={styles.shell}>
      <section className={styles.hero} aria-labelledby="cms-home-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Time Mission CMS</p>
          <h1 id="cms-home-title">Keep the site current without touching code</h1>
          <p className={styles.lede}>
            Update existing pages, launch campaign landings, preview work, and invite approved
            editors from one operator console.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/admin">
              Open admin
            </Link>
            <Link className={styles.secondaryAction} href="/admin/collections/landings">
              Manage landing pages
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
            CMS saves do not automatically deploy the public site. Use the Cloudflare direct upload
            process when changes are approved for launch.
          </p>
        </aside>
      </section>

      <section className={styles.landingBuilder} aria-labelledby="landing-builder-title">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>Landing builder</p>
          <h2 id="landing-builder-title">Start with the page goal</h2>
          <p>
            Pick the landing type before writing copy. Each template keeps the page aligned with
            Time Mission&apos;s brand and the visitor&apos;s decision path.
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
