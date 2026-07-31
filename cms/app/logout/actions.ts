'use server';

import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import { clearCmsAuthToken } from '../../lib/cms-auth';

export async function signOut() {
  const payload = await getPayload({ config });
  await clearCmsAuthToken(payload);
  redirect('/login');
}
