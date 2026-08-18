import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import groupTypesConfig from '../config/group-types.cjs';

const { GROUP_TYPE_IDS } = groupTypesConfig;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const detailPartials = [
  'bachelor-ette-main.frag.txt',
  'birthdays-main.frag.txt',
  'corporate-main.frag.txt',
  'field-trips-main.frag.txt',
  'holidays-main.frag.txt',
  'private-events-main.frag.txt',
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('canonical group order', () => {
  it('keeps data, navigation, the groups page, and all cross-sells aligned', () => {
    const groups = JSON.parse(read('src/data/site/groups.json'));
    const navigation = JSON.parse(read('src/data/site/navigation.json'));
    const main = read('src/partials/groups-main.frag.txt');
    const mainOrder = Array.from(
      main.matchAll(/data-tm-booking-kind="groups" data-tm-group-type="([^"]+)"/g),
      (match) => match[1],
    );

    expect(groups.items.map((item) => item.id)).toEqual(GROUP_TYPE_IDS);
    expect(navigation.groups.map((item) => item.href.replace('/groups/', ''))).toEqual(GROUP_TYPE_IDS);
    expect(mainOrder).toEqual(GROUP_TYPE_IDS);

    for (const partial of detailPartials) {
      const markup = read(`src/partials/${partial}`);
      const order = Array.from(
        markup.matchAll(/href="\/groups\/([a-z-]+)"/g),
        (match) => match[1],
      );
      expect(order, partial).toEqual(GROUP_TYPE_IDS);
    }
  });
});
