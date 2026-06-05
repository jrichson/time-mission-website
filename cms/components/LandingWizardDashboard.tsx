import Link from 'next/link';
import React from 'react';

type DashboardAction = {
  href: string;
  label: string;
  meta: string;
  text: string;
};

type DashboardGroup = {
  actions: DashboardAction[];
  aria: string;
  id: string;
  intro: string;
  title: string;
};

const landingActions: DashboardAction[] = [
  {
    href: '/landings/new',
    label: 'Start brief',
    meta: 'Wizard',
    text: 'Open the brief-first wizard and save a draft before choosing final page content.',
  },
  {
    href: '/admin/collections/landings',
    label: 'Manage all landing pages',
    meta: 'Collection',
    text: 'Review drafts, previews, publish state, and saved campaign pages.',
  },
  {
    href: '/landings/new?template=paid_social_campaign',
    label: 'Paid/social',
    meta: 'Template',
    text: 'Ad, email, seasonal, or social traffic that needs one fast booking path.',
  },
  {
    href: '/landings/new?template=local_venue_city',
    label: 'Local venue',
    meta: 'Template',
    text: 'City, venue, opening, or local-search page with place-specific proof.',
  },
  {
    href: '/landings/new?template=group_event',
    label: 'Group/event',
    meta: 'Template',
    text: 'Planner-led birthday, corporate, school, private event, or buyout page.',
  },
];

const siteSurfaceActions: DashboardAction[] = [
  {
    href: '/admin/collections/location-details',
    label: 'Location details',
    meta: 'Locations',
    text: 'Update public address and hours for existing code-owned locations.',
  },
  {
    href: '/admin/collections/announcement-banners',
    label: 'Announcement banners',
    meta: 'Shared surface',
    text: 'Manage text-only top banner copy, targeting, priority, and scheduling.',
  },
  {
    href: '/admin/collections/site-pages',
    label: 'Page SEO overrides',
    meta: 'SEO',
    text: 'Update metadata for code-owned pages without changing body copy or layout.',
  },
];

const ownerActions: DashboardAction[] = [
  {
    href: '/admin/collections/user-invites/create',
    label: 'Invite people',
    meta: 'Invite',
    text: 'Create an email invite or copyable setup link for an approved CMS user.',
  },
  {
    href: '/admin/collections/user-invites',
    label: 'Review invites',
    meta: 'Status',
    text: 'Check invite status, resend failed invites, or copy generated setup links.',
  },
  {
    href: '/admin/collections/users',
    label: 'Manage users',
    meta: 'Users',
    text: 'Review roles and owner-granted permissions for existing CMS accounts.',
  },
];

const dashboardGroups: DashboardGroup[] = [
  {
    actions: siteSurfaceActions,
    aria: 'Reusable site surface shortcuts',
    id: 'tm-site-surfaces-title',
    intro:
      'Location detail records only update address and hours for existing locations. Pages, booking links, providers, and location status stay code-owned.',
    title: 'Site content',
  },
  {
    actions: landingActions,
    aria: 'Start a landing draft by template',
    id: 'tm-landing-wizard-title',
    intro:
      'Pick the campaign job, capture the promise and proof, then preview the saved page before anything is published.',
    title: 'Landing pages',
  },
  {
    actions: ownerActions,
    aria: 'CMS user management shortcuts',
    id: 'tm-owner-tools-title',
    intro:
      'Invite approved CMS users, review setup links, and keep access controlled after the content workflow is configured.',
    title: 'Manage CMS access',
  },
];

const workflowSteps = ['Draft', 'Preview', 'Published in CMS', 'Live after deploy'];

function actionRow(action: DashboardAction) {
  if (action.href === '/landings/new') {
    return (
      <Link className="tm-landing-wizard-card__action" href="/landings/new" key={action.href}>
        <span>{action.meta}</span>
        <strong>{action.label}</strong>
        <p>{action.text}</p>
        <em>Open</em>
      </Link>
    );
  }

  if (action.href === '/admin/collections/user-invites/create') {
    return (
      <Link className="tm-landing-wizard-card__action" href="/admin/collections/user-invites/create" key={action.href}>
        <span>{action.meta}</span>
        <strong>{action.label}</strong>
        <p>{action.text}</p>
        <em>Open</em>
      </Link>
    );
  }

  return (
    <Link className="tm-landing-wizard-card__action" href={action.href} key={action.href}>
      <span>{action.meta}</span>
      <strong>{action.label}</strong>
      <p>{action.text}</p>
      <em>Open</em>
    </Link>
  );
}

export function LandingWizardDashboard() {
  return (
    <div className="tm-landing-wizard">
      <section className="tm-landing-wizard__intro" aria-labelledby="tm-cms-directory-title">
        <div>
          <p className="tm-landing-wizard__eyebrow">CMS directory</p>
          <h2 id="tm-cms-directory-title">Choose the CMS area.</h2>
        </div>
        <p>
          Content work is grouped by job. Use the workflow as a reminder: Published in CMS is approved, Live after
          deploy is public.
        </p>
        <ol className="tm-landing-wizard__workflow" aria-label="Publishing workflow">
          {workflowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="tm-landing-wizard__groups">
        {dashboardGroups.map((group) => (
          <section
            className="tm-landing-wizard-card"
            aria-labelledby={group.id}
            key={group.id}
          >
            <div className="tm-landing-wizard-card__header">
              <h2 id={group.id}>{group.title}</h2>
              <p>{group.intro}</p>
            </div>

            <div className="tm-landing-wizard-card__actions" aria-label={group.aria}>
              {group.actions.map((action) => actionRow(action))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default LandingWizardDashboard;
