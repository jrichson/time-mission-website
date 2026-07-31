'use server';

import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import { setCmsAuthToken } from '../../lib/cms-auth';

function formString(formData: FormData, name: string, maxLength = 512): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function createFirstCmsOwner(formData: FormData) {
  const email = formString(formData, 'email', 320).toLowerCase();
  const password = formString(formData, 'password');
  const confirmPassword = formString(formData, 'confirmPassword');
  const configuredOwner = process.env.CMS_OWNER_EMAIL?.trim().toLowerCase();

  if (
    !email ||
    !email.includes('@') ||
    password.length < 12 ||
    password !== confirmPassword ||
    (configuredOwner && email !== configuredOwner)
  ) {
    redirect('/setup?error=details');
  }

  const payload = await getPayload({ config });
  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  if (users.totalDocs > 0) redirect('/login');

  await payload.create({
    collection: 'users',
    data: {
      canDeploy: true,
      email,
      password,
      role: 'admin',
    },
    overrideAccess: true,
  });
  const result = await payload.login({
    collection: 'users',
    data: { email, password },
    overrideAccess: false,
  });
  if (!result.token) redirect('/login');
  await setCmsAuthToken(payload, result.token);
  redirect('/');
}
