import { NextResponse } from 'next/server';

import { currentCmsUser } from '../../../lib/cms-auth';

const ALLOWED_TYPES = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

type UploadedMedia = {
  alt?: string | null;
  caption?: string | null;
  height?: number | null;
  id: number | string;
  url?: string | null;
  width?: number | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  const { payload, user } = await currentCmsUser();
  if (!user) return jsonError('Sign in again before uploading an image.', 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const alt = typeof formData?.get('alt') === 'string'
    ? String(formData.get('alt')).trim().slice(0, 180)
    : '';
  const caption = typeof formData?.get('caption') === 'string'
    ? String(formData.get('caption')).trim().slice(0, 240)
    : '';

  if (!(file instanceof File)) return jsonError('Choose an image to upload.', 400);
  if (!alt) return jsonError('Add an image description before uploading.', 400);
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError('Use a JPG, PNG, WebP, or GIF image.', 400);
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return jsonError('Use an image smaller than 12 MB.', 400);
  }

  try {
    const media = await payload.create({
      collection: 'media' as never,
      data: {
        alt,
        caption,
      } as never,
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      overrideAccess: false,
      user,
    }) as unknown as UploadedMedia;

    return NextResponse.json({
      alt: media.alt,
      caption: media.caption,
      height: media.height,
      id: media.id,
      url: media.url,
      width: media.width,
    });
  } catch (error) {
    payload.logger.error(
      `[blog-media] upload failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return jsonError('The image could not be uploaded. Try a smaller file or a different format.', 500);
  }
}
