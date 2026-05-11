import React from 'react';

export function LandingWizardDashboard() {
  return (
    <section className="tm-landing-wizard-card" aria-labelledby="tm-landing-wizard-title">
      <div>
        <p className="tm-landing-wizard-card__eyebrow">Landing launch workflow</p>
        <h2 id="tm-landing-wizard-title">Create campaign landings from a brief</h2>
        <p>
          Start here for paid/social, local venue, and group/event landing pages. The wizard creates a
          draft and opens the saved-content preview before anything is published.
        </p>
      </div>
      <a className="tm-landing-wizard-card__button" href="/landings/new">
        Open landing wizard
      </a>
    </section>
  );
}

export default LandingWizardDashboard;
