import config from '@payload-config';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { generatePayloadCookie, getPayload } from 'payload';
import type { Payload } from 'payload';

function userAuthConfig(payload: Payload) {
  const collection = payload.config.collections.find((item) => item.slug === 'users');
  if (!collection?.auth) {
    throw new Error('The CMS user authentication collection is not configured.');
  }
  return collection.auth;
}

export async function currentCmsUser() {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: await headers() });

  return {
    payload,
    user: auth.user,
  };
}

export async function requireCmsUser(redirectPath: string) {
  const { payload, user } = await currentCmsUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  return {
    payload,
    user,
  };
}

export async function setCmsAuthToken(payload: Payload, token: string) {
  const cookie = generatePayloadCookie({
    collectionAuthConfig: userAuthConfig(payload),
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
    token,
  });
  const cookieStore = await cookies();

  cookieStore.set({
    domain: cookie.domain,
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
    httpOnly: cookie.httpOnly,
    maxAge: cookie.maxAge,
    name: cookie.name,
    path: cookie.path || '/',
    sameSite: cookie.sameSite?.toLowerCase() as 'lax' | 'none' | 'strict' | undefined,
    secure: cookie.secure,
    value: cookie.value || '',
  });
}

export async function clearCmsAuthToken(payload: Payload) {
  const cookieStore = await cookies();
  cookieStore.delete(`${payload.config.cookiePrefix}-token`);
}
