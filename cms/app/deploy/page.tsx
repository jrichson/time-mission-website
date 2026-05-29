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
  const canDeploy = canTriggerCmsDeploy({ req: { payload, user } });
  const message = statusCopy(params.status);

  return (
    <main className={styles.shell}>
      <section className={styles.hero} aria-labelledby="deploy-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>CMS Deploy Gate</p>
          <h1 id="deploy-title">Publish approved CMS changes to the public site</h1>
          <p className={styles.lede}>
            Use this only after content is Published in CMS and ready to become Live after deploy. The deploy
            permission is separate from role access.
          </p>
          <div className={styles.actions}>
            <form action={triggerDeployAction}>
              <button className={styles.primaryAction} disabled={!canDeploy} type="submit">
                Trigger site deploy
              </button>
            </form>
            <Link className={styles.secondaryAction} href="/admin">
              Open admin
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
    </main>
  );
}
