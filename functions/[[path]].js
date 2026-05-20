import { resolveLocationRouteRequest } from './_shared/location-route-normalizer.mjs';

export async function onRequest(context) {
  const route = resolveLocationRouteRequest(context.request.url);
  if (route.redirectUrl) {
    return Response.redirect(route.redirectUrl, 301);
  }

  if (
    route.assetPath
    && ['GET', 'HEAD'].includes(context.request.method)
    && context.env
    && context.env.ASSETS
    && typeof context.env.ASSETS.fetch === 'function'
  ) {
    const assetUrl = new URL(context.request.url);
    assetUrl.pathname = route.assetPath;
    const assetRequest = new Request(assetUrl.toString(), context.request);
    return context.env.ASSETS.fetch(assetRequest);
  }

  return context.next();
}
