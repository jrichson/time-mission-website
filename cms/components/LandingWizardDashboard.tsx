import Link from 'next/link';
import React from 'react';

type DashboardAction = {
  href: string;
  label: string;
  meta: string;
  text: string;
};

const landingTemplateActions: DashboardAction[] = [
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

const workflowSteps = ['Brief', 'Draft', 'Preview', 'Published in CMS', 'Live after deploy'];

const missionControlAction: DashboardAction = {
  href: '/',
  label: 'Back to Mission Control',
  meta: 'Main home',
  text: 'Return to the main CMS dashboard for banners, locations, blogs, releases, and access.',
};

const createDraftAction: DashboardAction = {
  href: '/landings/new',
  label: 'Create landing draft',
  meta: 'Wizard',
  text: 'Start with the campaign brief, save a draft, then open preview.',
};

const reviewDraftsAction: DashboardAction = {
    href: '/landings',
  label: 'Review landing drafts',
  meta: 'Drafts',
  text: 'Open saved landing pages to preview, refine, publish, or unpublish.',
};

function actionRow(action: DashboardAction) {
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
          <p className="tm-landing-wizard__eyebrow">Landing pages</p>
          <h2 id="tm-cms-directory-title">Create and review landing drafts.</h2>
        </div>
        <p>
          Use this bridge only for landing-page work. Mission Control is the main CMS home for every other task.
        </p>
        <ol className="tm-landing-wizard__workflow" aria-label="Publishing workflow">
          {workflowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="tm-landing-wizard__groups">
        <section className="tm-landing-wizard-card tm-landing-wizard-card--mission" aria-labelledby="tm-mission-control-title">
          <div className="tm-landing-wizard-card__header">
            <h2 id="tm-mission-control-title">Where to go next</h2>
            <p>Pick the landing task, or go back to the main dashboard.</p>
          </div>

          <div className="tm-landing-wizard-card__actions" aria-label="Landing page navigation">
            {[missionControlAction, createDraftAction, reviewDraftsAction].map((action) => actionRow(action))}
          </div>
        </section>

        <section
          className="tm-landing-wizard-card tm-landing-wizard-card--templates"
          aria-labelledby="tm-landing-wizard-title"
        >
          <div className="tm-landing-wizard-card__header">
            <h2 id="tm-landing-wizard-title">Landing page templates</h2>
            <p>Optional starters for common campaign pages.</p>
          </div>

          <div
            className="tm-landing-wizard-card__actions tm-landing-wizard-card__actions--templates"
            aria-label="Start a landing draft by template"
          >
            {landingTemplateActions.map((action) => actionRow(action))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default LandingWizardDashboard;
