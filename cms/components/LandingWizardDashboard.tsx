import Link from 'next/link';
import React from 'react';

const landingActions = [
  {
    href: '/landings/new?template=paid_social_campaign',
    label: 'Paid/social',
    text: 'Ad, email, seasonal, or social traffic that needs one fast booking path.',
  },
  {
    href: '/landings/new?template=local_venue_city',
    label: 'Local venue',
    text: 'City, venue, opening, or local-search page with place-specific proof.',
  },
  {
    href: '/landings/new?template=group_event',
    label: 'Group/event',
    text: 'Planner-led birthday, corporate, school, private event, or buyout page.',
  },
];

const siteSurfaceActions = [
  {
    href: '/admin/collections/location-details',
    label: 'Location details',
    text: 'Update public address and hours for existing code-owned locations.',
  },
  {
    href: '/admin/collections/announcement-banners',
    label: 'Announcement banners',
    text: 'Manage text-only top banner copy, targeting, priority, and scheduling.',
  },
  {
    href: '/admin/collections/site-pages',
    label: 'Page SEO overrides',
    text: 'Update metadata for code-owned pages without changing body copy or layout.',
  },
];

const ownerActions = [
  {
    href: '/admin/collections/user-invites/create',
    label: 'Invite people',
    text: 'Create an email invite or copyable setup link for an approved CMS user.',
  },
  {
    href: '/admin/collections/user-invites',
    label: 'Review invites',
    text: 'Check invite status, resend failed invites, or copy generated setup links.',
  },
  {
    href: '/admin/collections/users',
    label: 'Manage users',
    text: 'Review roles and owner-granted permissions for existing CMS accounts.',
  },
];

const dashboardPanels = [
  {
    actions: siteSurfaceActions,
    aria: 'Reusable site surface shortcuts',
    buttonHref: '/admin/collections/location-details',
    buttonLabel: 'Location details',
    id: 'tm-site-surfaces-title',
    intro:
      'Location detail records only update address and hours for existing locations. Pages, booking links, providers, and location status stay code-owned.',
    steps: ['Edit', 'Preview', 'Published in CMS', 'Live after deploy'],
    title: 'Update shared public details',
  },
  {
    actions: landingActions,
    aria: 'Start a landing draft by template',
    buttonHref: '/landings/new',
    buttonLabel: 'Start brief',
    id: 'tm-landing-wizard-title',
    intro:
      'Pick the campaign job, capture the promise and proof, then preview the saved page before anything is published.',
    manageHref: '/admin/collections/landings',
    manageLabel: 'Manage all landing pages',
    steps: ['Brief', 'Draft', 'Preview', 'Publish'],
    title: 'Create a draft from a marketing brief',
  },
  {
    actions: ownerActions,
    aria: 'CMS user management shortcuts',
    buttonHref: '/admin/collections/user-invites/create',
    buttonLabel: 'Invite people',
    id: 'tm-owner-tools-title',
    intro:
      'Invite approved CMS users, review setup links, and keep access controlled after the content workflow is configured.',
    steps: ['Invite', 'Role', 'Setup link', 'Access'],
    title: 'Manage CMS access',
  },
];

function panelButton(panel: (typeof dashboardPanels)[number]) {
  if (panel.id === 'tm-owner-tools-title') {
    return (
      <Link className="tm-landing-wizard-card__button" href="/admin/collections/user-invites/create">
        Invite people
      </Link>
    );
  }

  if (panel.id === 'tm-landing-wizard-title') {
    return (
      <Link className="tm-landing-wizard-card__button" href="/landings/new">
        Start brief
      </Link>
    );
  }

  return (
    <Link className="tm-landing-wizard-card__button" href={panel.buttonHref}>
      {panel.buttonLabel}
    </Link>
  );
}

export function LandingWizardDashboard() {
  return (
    <>
      {dashboardPanels.map((panel) => (
        <section
          className="tm-landing-wizard-card"
          aria-labelledby={panel.id}
          key={panel.id}
        >
          <div className="tm-landing-wizard-card__inner">
            <div className="tm-landing-wizard-card__header">
              <div>
                {panel.eyebrow ? <p className="tm-landing-wizard-card__eyebrow">{panel.eyebrow}</p> : null}
                <h2 id={panel.id}>{panel.title}</h2>
              </div>
              {panelButton(panel)}
            </div>

            <div className="tm-landing-wizard-card__body">
              <p>{panel.intro}</p>
              <ol className="tm-landing-wizard-card__steps" aria-label={`${panel.title} workflow`}>
                {panel.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="tm-landing-wizard-card__actions" aria-label={panel.aria}>
              {panel.actions.map((action) => (
                <Link className="tm-landing-wizard-card__action" href={action.href} key={action.href}>
                  <strong>{action.label}</strong>
                  <span>{action.text}</span>
                </Link>
              ))}
            </div>

            {panel.manageHref && panel.manageLabel ? (
              <Link className="tm-landing-wizard-card__manage" href={panel.manageHref}>
                {panel.manageLabel}
              </Link>
            ) : null}
          </div>
        </section>
      ))}
    </>
  );
}

export default LandingWizardDashboard;
