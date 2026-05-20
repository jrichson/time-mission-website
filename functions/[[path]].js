import { resolveLocationRedirectUrl } from './_shared/location-route-normalizer.mjs';

export function onRequest(context) {
  const redirectUrl = resolveLocationRedirectUrl(context.request.url);
  if (redirectUrl) {
    return Response.redirect(redirectUrl, 301);
  }

  return context.next();
}
