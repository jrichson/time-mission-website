import Link from 'next/link';
import React from 'react';

export default function AdminNavigation() {
  return (
    <nav className="tm-admin-shortcuts" aria-label="CMS shortcuts">
      <Link className="tm-admin-shortcuts__link tm-admin-shortcuts__link--primary" href="/">
        <strong>Mission Control</strong>
        <span>Start with a task</span>
      </Link>
      <Link className="tm-admin-shortcuts__link" href="/deploy">
        <strong>Make changes live</strong>
        <span>Review and deploy</span>
      </Link>
    </nav>
  );
}
