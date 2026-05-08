import React from 'react';

export function TimeMissionIcon() {
  return (
    <svg className="tm-admin-icon" viewBox="0 0 24 24" role="img" aria-label="Time Mission CMS">
      <rect className="tm-admin-icon__frame" x="1" y="1" width="22" height="22" rx="5" />
      <path className="tm-admin-icon__orbit" d="M5.75 12c0-3.45 2.8-6.25 6.25-6.25s6.25 2.8 6.25 6.25-2.8 6.25-6.25 6.25S5.75 15.45 5.75 12Z" />
      <path className="tm-admin-icon__pulse" d="M12 7.25v4.55l3.35 2.05" />
      <circle className="tm-admin-icon__dot" cx="12" cy="12" r="1.7" />
    </svg>
  );
}

export default TimeMissionIcon;
