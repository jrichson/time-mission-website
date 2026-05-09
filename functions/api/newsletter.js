import { handleFormRequest } from '../_shared/form-handler.mjs';

export function onRequest({ env, request }) {
  if (request.method === 'POST') {
    return handleFormRequest({ env, formType: 'newsletter', request });
  }

  return new Response('Method not allowed.', {
    headers: { allow: 'POST' },
    status: 405,
  });
}
