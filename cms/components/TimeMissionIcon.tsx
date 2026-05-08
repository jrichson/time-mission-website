import React from 'react';

export function TimeMissionIcon() {
  return (
    <svg className="tm-admin-icon" viewBox="0 0 48 48" role="img" aria-label="Time Mission CMS">
      <rect className="tm-admin-icon__frame" x="1" y="1" width="46" height="46" rx="6" />
      <path className="tm-admin-icon__letter" d="M9 13h18v5h-6v17h-6V18H9z" />
      <path
        className="tm-admin-icon__letter tm-admin-icon__letter--accent"
        d="M27 35V13h5l4 8.5 4-8.5h5v22h-5.5V25l-2.5 5h-2l-2.5-5v10z"
      />
    </svg>
  );
}

export default TimeMissionIcon;
