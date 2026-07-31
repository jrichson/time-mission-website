import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import { createFirstCmsOwner } from './actions';
import styles from '../login/page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const metadata = {
  title: 'Set up CMS owner - Time Mission CMS',
};

export default async function SetupPage({ searchParams }: PageProps) {
  const payload = await getPayload({ config });
  const [users, query] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
    }),
    searchParams,
  ]);
  if (users.totalDocs > 0) redirect('/login');

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="setup-title">
        <div className={styles.brand}>
          <span>Time Mission</span>
          <strong>CMS</strong>
        </div>
        <div className={styles.heading}>
          <p>First-time setup</p>
          <h1 id="setup-title">Create the CMS owner.</h1>
          <span>
            This page works only while the database has no CMS users. The first account receives
            admin and deploy access.
          </span>
        </div>

        {query.error ? (
          <p className={styles.error} role="alert">
            Use the configured owner email and matching passwords of at least 12 characters.
          </p>
        ) : null}

        <form action={createFirstCmsOwner} className={styles.form}>
          <label>
            <span>Owner email address</span>
            <input
              autoComplete="email"
              defaultValue={process.env.CMS_OWNER_EMAIL?.trim() || ''}
              name="email"
              required
              type="email"
            />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="new-password" minLength={12} name="password" required type="password" />
          </label>
          <label>
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength={12}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
          <button type="submit">Create owner and enter Mission Control</button>
        </form>
      </section>
    </main>
  );
}
