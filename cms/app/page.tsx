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

const workflowSteps = ['Edit content', 'Preview the page', 'Publish in CMS', 'Deploy when ready'];

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
