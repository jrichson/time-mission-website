import { describe, expect, it } from 'vitest';

import groupTypesConfig from '../config/group-types.cjs';
import locationExtensionContracts from '../scripts/lib/location-extension-contracts.cjs';

const { GROUP_TYPE_IDS } = groupTypesConfig;
const { validateLocationExtensions } = locationExtensionContracts;

describe('location extension contracts', () => {
  it('accepts typed group offers and a safe counterpart URL', () => {
    expect(validateLocationExtensions({
      counterpartUrl: 'https://time-mission-website-eu.pages.dev/eindhoven',
      groupCheckoutUrls: {
        birthdays: 'https://book.example.com/birthdays',
        holidays: 'https://book.example.com/holidays',
      },
      groupInquiryLabels: {
        birthdays: '25+ Group Inquire',
        holidays: '25+ Group Inquire',
      },
      id: 'example',
    }, GROUP_TYPE_IDS)).toEqual([]);
  });

  it('rejects unknown group keys, unsafe URLs, and blank labels', () => {
    expect(validateLocationExtensions({
      counterpartUrl: 'javascript:alert(1)',
      groupCheckoutUrls: {
        birthday: 'https://book.example.com/wrong-key',
        holidays: 'not-a-url',
        'private-events': '//evil.example/path',
      },
      groupInquiryLabels: {
        birthdays: '   ',
        unknown: 'Unexpected',
      },
      id: 'example',
    }, GROUP_TYPE_IDS)).toEqual(expect.arrayContaining([
      expect.stringContaining('counterpartUrl'),
      expect.stringContaining('groupCheckoutUrls key birthday'),
      expect.stringContaining('groupCheckoutUrls.holidays'),
      expect.stringContaining('groupCheckoutUrls.private-events'),
      expect.stringContaining('groupInquiryLabels.birthdays'),
      expect.stringContaining('groupInquiryLabels key unknown'),
    ]));
  });
});
