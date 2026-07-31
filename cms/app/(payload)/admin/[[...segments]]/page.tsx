import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Payload remains the authenticated data and API layer, but its generated admin
 * interface is intentionally not an editor-facing product surface.
 */
export default function DeprecatedPayloadAdminPage() {
  redirect('/');
}
