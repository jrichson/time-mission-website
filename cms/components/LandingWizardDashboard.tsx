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

export function LandingWizardDashboard() {
  return (
    <>
      <section className="tm-landing-wizard-card tm-landing-wizard-card--operations" aria-labelledby="tm-owner-tools-title">
        <div className="tm-landing-wizard-card__header">
          <div>
            <p className="tm-landing-wizard-card__eyebrow">Owner tools</p>
            <h2 id="tm-owner-tools-title">Invite approved CMS users</h2>
          </div>
          <Link className="tm-landing-wizard-card__button" href="/admin/collections/user-invites/create">
            Invite people
          </Link>
        </div>

        <div className="tm-landing-wizard-card__body">
          <p>
            User invites are owner-only. Create an invite record, choose email delivery or a copyable 24-hour setup
            link, then Payload creates or updates the user account.
          </p>
          <ol className="tm-landing-wizard-card__steps" aria-label="Invite workflow">
            <li>Invite</li>
            <li>Role</li>
            <li>Setup link</li>
            <li>Access</li>
          </ol>
        </div>

        <div className="tm-landing-wizard-card__actions" aria-label="CMS user management shortcuts">
          {ownerActions.map((action) => (
            <Link className="tm-landing-wizard-card__action" href={action.href} key={action.href}>
              <strong>{action.label}</strong>
              <span>{action.text}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="tm-landing-wizard-card" aria-labelledby="tm-landing-wizard-title">
        <div className="tm-landing-wizard-card__header">
          <div>
            <p className="tm-landing-wizard-card__eyebrow">Landing launch workflow</p>
            <h2 id="tm-landing-wizard-title">Create a draft from a marketing brief</h2>
          </div>
          <Link className="tm-landing-wizard-card__button" href="/landings/new">
            Start brief
          </Link>
        </div>

        <div className="tm-landing-wizard-card__body">
          <p>
            Pick the campaign job, capture the promise and proof, then preview the saved page before anything is published.
          </p>
          <ol className="tm-landing-wizard-card__steps" aria-label="Landing workflow">
            <li>Brief</li>
            <li>Draft</li>
            <li>Preview</li>
            <li>Publish</li>
          </ol>
        </div>

        <div className="tm-landing-wizard-card__actions" aria-label="Start a landing draft by template">
          {landingActions.map((action) => (
            <Link className="tm-landing-wizard-card__action" href={action.href} key={action.href}>
              <strong>{action.label}</strong>
              <span>{action.text}</span>
            </Link>
          ))}
        </div>

        <Link className="tm-landing-wizard-card__manage" href="/admin/collections/landings">
          Manage all landing pages
        </Link>
      </section>
    </>
  );
}

export default LandingWizardDashboard;
