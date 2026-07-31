import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/+$/, '') || '/admin';
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  const collection = segments[2];
  const record = segments[3];

  let destination = '/';
  if (segments[1] === 'login') {
    destination = '/login';
  } else if (segments[1] === 'create-first-user') {
    destination = '/setup';
  } else if (segments[1] === 'reset' && segments[2]) {
    destination = `/reset/${encodeURIComponent(segments[2])}`;
  } else if (segments[1] === 'collections') {
    if (collection === 'blog-posts') {
      destination = record === 'create'
        ? '/blog/new'
        : record
          ? `/blog/${encodeURIComponent(record)}`
          : '/blog';
    } else if (collection === 'location-details') {
      destination = '/locations/bulk';
    } else if (collection === 'announcement-banners') {
      destination = '/announcements';
    } else if (collection === 'landings') {
      destination = record === 'create'
        ? '/landings/new'
        : record
          ? `/landings/${encodeURIComponent(record)}`
          : '/landings';
    } else if (collection === 'site-pages') {
      destination = '/search';
    } else if (collection === 'user-invites' || collection === 'users') {
      destination = '/access';
    }
  }

  const url = new URL(destination, request.url);
  if (destination === '/login') {
    const redirectPath = request.nextUrl.searchParams.get('redirect');
    if (redirectPath?.startsWith('/') && !redirectPath.startsWith('//')) {
      url.searchParams.set('redirect', redirectPath.startsWith('/admin') ? '/' : redirectPath);
    }
  }

  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/admin/:path*'],
};
