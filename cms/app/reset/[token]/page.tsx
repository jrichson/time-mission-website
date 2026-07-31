import { resetCmsPassword } from './actions';
import styles from '../../login/page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export const metadata = {
  title: 'Set password - Time Mission CMS',
};

export default async function ResetPasswordPage({ params, searchParams }: PageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="reset-title">
        <div className={styles.brand}>
          <span>Time Mission</span>
          <strong>CMS</strong>
        </div>
        <div className={styles.heading}>
          <p>Account setup</p>
          <h1 id="reset-title">Set your CMS password.</h1>
          <span>Use at least 12 characters. You will enter Mission Control after saving it.</span>
        </div>

        {query.error ? (
          <p className={styles.error} role="alert">
            {query.error === 'password'
              ? 'Passwords must match and contain at least 12 characters.'
              : 'This setup link is invalid or has expired. Ask the CMS owner for a new one.'}
          </p>
        ) : null}

        <form action={resetCmsPassword} className={styles.form}>
          <input name="token" type="hidden" value={token} />
          <label>
            <span>New password</span>
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
          <button type="submit">Set password and continue</button>
        </form>
      </section>
    </main>
  );
}
