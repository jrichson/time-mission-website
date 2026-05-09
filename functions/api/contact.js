import { handleFormRequest } from '../_shared/form-handler.mjs';

export function onRequest({ env, request }) {
  if (request.method === 'POST') {
    return handleFormRequest({ env, formType: 'contact', request });
  }

  return new Response('Method not allowed.', {
    headers: { allow: 'POST' },
    status: 405,
  });
}
