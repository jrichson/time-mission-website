import Link from 'next/link';
import React from 'react';

export function TimeMissionLogo() {
  return (
    <Link className="tm-admin-logo" href="/" aria-label="Mission Control">
      <span>Time</span>
      <span>Mission</span>
      <small>CMS</small>
    </Link>
  );
}

export default TimeMissionLogo;
