import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isOwner, normalizeEmail } from '../../collections/Users.js';
import type { User } from '../../payload-types';
import { requireCmsUser } from '../../lib/cms-auth';
import workspaceStyles from '../blog/blog.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type InviteDoc = {
  createdAt?: string;
  deliveryMethod?: string | null;
  email?: string | null;
  errorMessage?: string | null;
  id: number | string;
  inviteLink?: string | null;
  role?: string | null;
  sentAt?: string | null;
  status?: string | null;
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function formString(formData: FormData, name: string, maxLength = 320): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function createInvite(formData: FormData) {
  'use server';

  const { payload, user } = await requireCmsUser('/access');
  const owner = await isOwner({ req: { payload, user } });
  if (!owner) redirect('/access?status=forbidden');

  const email = normalizeEmail(formString(formData, 'email'));
  const role = formString(formData, 'role', 20) === 'admin' ? 'admin' : 'editor';
  const deliveryMethod = formString(formData, 'deliveryMethod', 20) === 'link' ? 'link' : 'email';
  if (!email || !email.includes('@')) redirect('/access?status=invalid-email');

  await payload.create({
    collection: 'user-invites' as never,
    data: { deliveryMethod, email, role } as never,
    overrideAccess: false,
    user,
  });
  redirect('/access?status=invite-created');
}

function userKey(id: number | string, field: string): string {
  return `user:${id}:${field}`;
}

async function saveUserPermissions(formData: FormData) {
  'use server';

  const { payload, user } = await requireCmsUser('/access');
  const owner = await isOwner({ req: { payload, user } });
  if (!owner) redirect('/access?status=forbidden');

  const ids = formData.getAll('userId').map(String).filter(Boolean);
  for (const id of ids) {
    const roleValue = formString(formData, userKey(id, 'role'), 20);
    await payload.update({
      collection: 'users',
      data: {
        canDeploy: formData.has(userKey(id, 'canDeploy')),
        role: roleValue === 'admin' ? 'admin' : 'editor',
      },
      id,
      overrideAccess: false,
      user,
    });
  }
  redirect('/access?status=users-saved');
}

function notice(status: string | undefined): { error?: boolean; text: string } | null {
  const messages: Record<string, { error?: boolean; text: string }> = {
    forbidden: { error: true, text: 'Only the CMS owner can change access.' },
    'invalid-email': { error: true, text: 'Enter a valid email address.' },
    'invite-created': { text: 'Invite created. Review its delivery status below.' },
    'users-saved': { text: 'User permissions saved.' },
  };
  return status ? messages[status] || null : null;
}

export const metadata = {
  title: 'CMS access - Time Mission CMS',
};

export default async function AccessPage({ searchParams }: PageProps) {
  const [{ payload, user }, query] = await Promise.all([
    requireCmsUser('/access'),
    searchParams,
  ]);
  const owner = await isOwner({ req: { payload, user } });
  const [usersResult, inviteResult] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      sort: 'email',
      user,
    }),
    owner
      ? payload.find({
          collection: 'user-invites' as never,
          depth: 0,
          limit: 50,
          overrideAccess: false,
          sort: '-createdAt',
          user,
        })
      : Promise.resolve({ docs: [] }),
  ]);
  const users = usersResult.docs as User[];
  const invites = inviteResult.docs as unknown as InviteDoc[];
  const message = notice(query.status);

  return (
    <main className={workspaceStyles.shell}>
      <nav className={workspaceStyles.topbar} aria-label="CMS shortcuts">
        <Link className={workspaceStyles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Access actions">
          <Link href="/">Mission Control</Link>
        </nav>
      </nav>

      <nav className={workspaceStyles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Access</span>
      </nav>

      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.kicker}>Account control</p>
          <h1>CMS access without the control panel.</h1>
          <p>
            Invite editors, create secure setup links, and decide who can approve or deploy website
            changes. Only the CMS owner can change these settings.
          </p>
        </div>
        <div className={workspaceStyles.headerFact}>
          <span>Your access</span>
          <strong>{owner ? 'CMS owner' : user.role || 'Editor'}</strong>
        </div>
      </header>

      <section className={workspaceStyles.workspace}>
        {message ? (
          <p className={message.error ? styles.error : styles.success} role={message.error ? 'alert' : 'status'}>
            {message.text}
          </p>
        ) : null}

        {owner ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Invite someone</span>
                <h2>Create CMS access</h2>
              </div>
              <p>Email delivery requires configured SMTP. A setup link can be copied and sent manually.</p>
            </div>
            <form action={createInvite} className={styles.inviteForm}>
              <label>
                <span>Email address</span>
                <input autoComplete="email" name="email" required type="email" />
              </label>
              <label>
                <span>Role</span>
                <select defaultValue="editor" name="role">
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label>
                <span>Delivery</span>
                <select defaultValue="link" name="deliveryMethod">
                  <option value="link">Create a setup link</option>
                  <option value="email">Send setup email</option>
                </select>
              </label>
              <button type="submit">Create invite</button>
            </form>
          </section>
        ) : null}

        {owner && invites.length ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Invite history</span>
                <h2>Recent invitations</h2>
              </div>
              <p>Setup links expire after 24 hours. Create a new invite if an old link expires.</p>
            </div>
            <div className={styles.inviteList}>
              {invites.map((invite) => (
                <div className={styles.inviteRow} key={invite.id}>
                  <div>
                    <strong>{invite.email}</strong>
                    <span>{invite.role || 'editor'} · {invite.deliveryMethod || 'email'}</span>
                  </div>
                  <span className={styles.status}>{invite.status || 'pending'}</span>
                  {invite.inviteLink ? (
                    <input aria-label={`Setup link for ${invite.email}`} readOnly value={invite.inviteLink} />
                  ) : (
                    <small>{invite.errorMessage || (invite.sentAt ? 'Email sent' : 'No setup link')}</small>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span>CMS accounts</span>
              <h2>Users and permissions</h2>
            </div>
            <p>Deploy permission is separate from role access so publishing remains deliberate.</p>
          </div>
          <form action={saveUserPermissions}>
            <div className={styles.userList}>
              {users.map((cmsUser) => (
                <div className={styles.userRow} key={cmsUser.id}>
                  <input name="userId" type="hidden" value={String(cmsUser.id)} />
                  <div>
                    <strong>{cmsUser.email}</strong>
                    <span>{String(cmsUser.id) === String(user.id) ? 'Current account' : 'CMS account'}</span>
                  </div>
                  {owner ? (
                    <>
                      <label>
                        <span>Role</span>
                        <select defaultValue={cmsUser.role} name={userKey(cmsUser.id, 'role')}>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <label className={styles.deployCheck}>
                        <input
                          defaultChecked={cmsUser.canDeploy === true}
                          name={userKey(cmsUser.id, 'canDeploy')}
                          type="checkbox"
                        />
                        <span>Can deploy</span>
                      </label>
                    </>
                  ) : (
                    <span className={styles.status}>{cmsUser.role}</span>
                  )}
                </div>
              ))}
            </div>
            {owner ? <button className={styles.saveUsers} type="submit">Save user permissions</button> : null}
          </form>
        </section>
      </section>
    </main>
  );
}
