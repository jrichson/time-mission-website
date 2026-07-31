'use server';

import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import { setCmsAuthToken } from '../../../lib/cms-auth';

function formString(formData: FormData, name: string, maxLength = 512): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function resetCmsPassword(formData: FormData) {
  const token = formString(formData, 'token', 2048);
  const password = formString(formData, 'password');
  const confirmPassword = formString(formData, 'confirmPassword');

  if (!token || password.length < 12 || password !== confirmPassword) {
    redirect(`/reset/${encodeURIComponent(token)}?error=password`);
  }

  const payload = await getPayload({ config });
  try {
    const result = await payload.resetPassword({
      collection: 'users',
      data: { password, token },
      overrideAccess: true,
    });
    if (!result.token) throw new Error('Password reset did not return a session token.');
    await setCmsAuthToken(payload, result.token);
  } catch {
    redirect(`/reset/${encodeURIComponent(token)}?error=token`);
  }

  redirect('/');
}
