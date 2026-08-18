'use strict';

const GROUP_TYPES = Object.freeze({
  birthdays: true,
  corporate: true,
  holidays: true,
  'field-trips': true,
  'private-events': true,
  'bachelor-ette': true,
});

const GROUP_TYPE_IDS = Object.freeze(Object.keys(GROUP_TYPES));

module.exports = { GROUP_TYPES, GROUP_TYPE_IDS };
