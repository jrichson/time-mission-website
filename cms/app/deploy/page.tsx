import config from '@payload-config';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import { canTriggerCmsDeploy } from '../../collections/Users.js';
import { triggerCmsDeploy } from '../../lib/cms-deploy-gate.js';
import styles from '../home.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

async function currentCmsUser() {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: await headers() });

  if (!auth.user) {
    redirect(`/admin/login?redirect=${encodeURIComponent('/deploy')}`);
  }

  return { payload, user: auth.user };
}

async function triggerDeployAction() {
  'use server';

  const { payload, user } = await currentCmsUser();
  const result = await triggerCmsDeploy({
    reason: 'manual-cms-deploy',
    req: { payload, user },
  });

  redirect(`/deploy?status=${encodeURIComponent(result.status)}`);
}

function statusCopy(status: string | undefined): string | null {
  const messages: Record<string, string> = {
    failed: 'Deploy hook failed. Check Railway logs before trying again.',
    forbidden: 'Your account does not have CMS Deploy Permission.',
    not_configured: 'Deploy trigger is not configured. Keep using the manual Wrangler deploy path.',
    triggered: 'Deploy trigger started. The public site updates after the Wrangler upload finishes.',
  };

  return status ? messages[status] || null : null;
}

export const metadata = {
  title: 'Deploy gate - Time Mission CMS',
  robots: {
    follow: false,
    index: false,
  },
};

export default async function DeployPage({ searchParams }: PageProps) {
  const { payload, user } = await currentCmsUser();
  const params = await searchParams;
  const canDeploy = await canTriggerCmsDeploy({ req: { payload, user } });
  const message = statusCopy(params.status);

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brandMark} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <div className={styles.topbarActions}>
          <Link href="/">Mission Control</Link>
          <Link href="/admin">Admin tools</Link>
          <Link href="/admin/collections/landings">Landings</Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="deploy-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Release control</p>
          <h1 id="deploy-title">Publish approved CMS changes deliberately</h1>
          <p className={styles.lede}>
            Use this after content is Published in CMS and ready to become Live after deploy. Permission stays separate
            from role access.
          </p>
          <div className={styles.actions}>
            <form action={triggerDeployAction}>
              <button className={styles.primaryAction} disabled={!canDeploy} type="submit">
                Trigger site deploy
              </button>
            </form>
            <Link className={styles.secondaryAction} href="/">
              Mission Control
            </Link>
          </div>
        </div>

        <aside className={styles.publishPanel} aria-label="Deploy permission status">
          <p className={styles.panelLabel}>Deploy access</p>
          <ol className={styles.stepList}>
            <li>Published in CMS</li>
            <li>Deploy permission checked</li>
            <li>Remote deploy triggered</li>
            <li>Live after deploy</li>
          </ol>
          <p className={styles.panelNote}>
            {message || (canDeploy ? 'You can trigger deploys from this account.' : 'Ask the CMS owner to grant deploy permission.')}
          </p>
        </aside>
      </section>

      <section className={styles.statGrid} aria-label="Deploy safeguards">
        <article className={styles.statCard}>
          <span>Current account</span>
          <strong>{canDeploy ? 'Ready' : 'Locked'}</strong>
          <p>{canDeploy ? 'This user can trigger the remote deploy runner.' : 'Owner approval is required before deploy.'}</p>
        </article>
        <article className={styles.statCard}>
          <span>Release state</span>
          <strong>Manual</strong>
          <p>CMS saves never publish the static site until this gate runs.</p>
        </article>
        <article className={styles.statCard}>
          <span>Remote runner</span>
          <strong>Wrangler</strong>
          <p>The public site updates after the GitHub Actions build and upload finish.</p>
        </article>
      </section>
    </main>
  );
}
