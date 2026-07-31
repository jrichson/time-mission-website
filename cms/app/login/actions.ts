'use server';

import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import { setCmsAuthToken } from '../../lib/cms-auth';

function formString(formData: FormData, name: string, maxLength = 320): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function safeRedirectPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/admin')) return '/';
  return value;
}

export async function signIn(formData: FormData) {
  const email = formString(formData, 'email').toLowerCase();
  const password = formString(formData, 'password', 512);
  const redirectPath = safeRedirectPath(formString(formData, 'redirect', 2048));

  if (!email || !password) {
    redirect(`/login?error=required&redirect=${encodeURIComponent(redirectPath)}`);
  }

  const payload = await getPayload({ config });
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
      overrideAccess: false,
    });
    if (!result.token) throw new Error('Authentication did not return a session token.');
    await setCmsAuthToken(payload, result.token);
  } catch {
    redirect(`/login?error=invalid&redirect=${encodeURIComponent(redirectPath)}`);
  }

  redirect(redirectPath);
}
