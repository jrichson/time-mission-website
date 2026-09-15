import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plainTextLexicalState } from '../cms/lib/blog-authoring';

const { payload, user } = vi.hoisted(() => ({
  payload: { find: vi.fn(), findByID: vi.fn(), update: vi.fn(), create: vi.fn() },
  user: { id: 1, collection: 'users', role: 'admin' },
}));

vi.mock('../cms/lib/cms-auth', () => ({
  requireCmsUser: vi.fn(async () => ({ payload, user })),
}));

import { saveBlogPost } from '../cms/app/blog/actions';

beforeEach(() => {
  vi.clearAllMocks();
  payload.find.mockResolvedValue({ docs: [] });
  payload.findByID.mockResolvedValue({ seo: {} });
  payload.update.mockResolvedValue({ id: 4 });
  payload.create.mockResolvedValue({ id: 5 });
});

function articleForm(location = '') {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    id: '4', title: 'Company announcement', slug: 'company-announcement',
    locationSlug: location, publishDate: '2026-09-15', excerpt: 'Announcement summary',
    bodyJson: JSON.stringify(plainTextLexicalState('Article content.')),
    published: 'on', showInPressRoom: 'on', intent: 'preview',
  })) form.set(key, value);
  return form;
}

describe('blog save persistence', () => {
  it('stores company-wide location as null and redirects to the saved preview', async () => {
    await expect(saveBlogPost(articleForm())).rejects.toMatchObject({ digest: expect.stringContaining('/preview/blog/4') });
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      id: '4', overrideAccess: false, user,
      data: expect.objectContaining({ locationSlug: null, published: true, showInPressRoom: true }),
    }));
  });

  it('preserves a selected location', async () => {
    await expect(saveBlogPost(articleForm('houston'))).rejects.toMatchObject({ digest: expect.stringContaining('/preview/blog/4') });
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ locationSlug: 'houston' }),
    }));
  });

  it('rejects a location-free post outside the Press Room before writing', async () => {
    const form = articleForm();
    form.delete('showInPressRoom');
    await expect(saveBlogPost(form)).rejects.toMatchObject({ digest: expect.stringContaining('required-fields') });
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });
});
