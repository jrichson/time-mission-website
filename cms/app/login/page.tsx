import { redirect } from 'next/navigation';

import { currentCmsUser } from '../../lib/cms-auth';
import { signIn } from './actions';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    error?: string;
    redirect?: string;
  }>;
};

function safeRedirectPath(value: string | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/admin')) return '/';
  return value;
}

export const metadata = {
  title: 'Sign in - Time Mission CMS',
};

export default async function LoginPage({ searchParams }: PageProps) {
  const [{ user }, params] = await Promise.all([currentCmsUser(), searchParams]);
  const redirectPath = safeRedirectPath(params.redirect);
  if (user) redirect(redirectPath);

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.brand}>
          <span>Time Mission</span>
          <strong>CMS</strong>
        </div>
        <div className={styles.heading}>
          <p>Mission Control</p>
          <h1 id="login-title">Sign in to edit the website.</h1>
          <span>Use the CMS account created for your email address.</span>
        </div>

        {params.error ? (
          <p className={styles.error} role="alert">
            {params.error === 'required'
              ? 'Enter your email and password.'
              : 'That email and password did not match a CMS account.'}
          </p>
        ) : null}

        <form action={signIn} className={styles.form}>
          <input name="redirect" type="hidden" value={redirectPath} />
          <label>
            <span>Email address</span>
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          <button type="submit">Enter Mission Control</button>
        </form>
        <p className={styles.note}>
          Need access or a password reset? Ask the CMS owner for a new setup link.
        </p>
      </section>
    </main>
  );
}
