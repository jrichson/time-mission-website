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

type DeployStatusMessage = {
  body: string;
  title: string;
  tone: 'statusNoticeError' | 'statusNoticeSuccess' | 'statusNoticeWarning';
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

function statusCopy(status: string | undefined): DeployStatusMessage | null {
  const messages: Record<string, DeployStatusMessage> = {
    failed: {
      body: 'The CMS could not reach the deploy hook. Check the deploy service logs before trying again.',
      title: 'Deploy request failed',
      tone: 'statusNoticeError',
    },
    forbidden: {
      body: 'Your account does not have CMS Deploy Permission. Ask the CMS owner to grant deploy access.',
      title: 'Deploy blocked',
      tone: 'statusNoticeWarning',
    },
    not_configured: {
      body: 'The deploy trigger is not configured. Keep using the manual deploy path until the hook is connected.',
      title: 'Deploy not connected',
      tone: 'statusNoticeWarning',
    },
    triggered: {
      body: 'The CMS sent the request to the remote deploy runner. The public site updates only after that build and upload finish.',
      title: 'Deploy request sent',
      tone: 'statusNoticeSuccess',
    },
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
  const publicSiteOrigin = process.env.PAYLOAD_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, '') || 'https://www.timemission.com';

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brandMark} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <div className={styles.topbarActions}>
          <Link href="/">Back to Mission Control</Link>
        </div>
      </nav>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Deploy</span>
      </nav>

      {message ? (
        <section className={`${styles.statusNotice} ${styles[message.tone]}`} role="status" aria-live="polite">
          <div>
            <span>Deploy status</span>
            <strong>{message.title}</strong>
          </div>
          <p>{message.body}</p>
        </section>
      ) : null}

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
            <a className={styles.secondaryAction} href={publicSiteOrigin} rel="noreferrer" target="_blank">
              Open public site
            </a>
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
            {message?.body || (canDeploy ? 'You can trigger deploys from this account.' : 'Ask the CMS owner to grant deploy permission.')}
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
          <strong>External build</strong>
          <p>The public site updates after the GitHub Actions build and upload finish.</p>
        </article>
        <article className={styles.statCard}>
          <span>Final check</span>
          <strong>Open the site</strong>
          <p>After the runner finishes, open the public site and confirm the published change is visible.</p>
        </article>
      </section>
    </main>
  );
}
