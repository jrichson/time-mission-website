"use strict";

const INTERNAL_PATH = /^\/(?!\/)[a-z0-9\-\/]*$/;

function isSafeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  const cleaned = value.trim();
  if (INTERNAL_PATH.test(cleaned)) return true;
  return isSafeHttpsUrl(cleaned);
}

function isSafeHttpsUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  const cleaned = value.trim();
  if (cleaned.length > 2048 || /[<>"'\\\s]/.test(cleaned)) return false;

  try {
    const url = new URL(cleaned);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateMap(location, field, groupTypeIds, validateValue) {
  const id = location.id || "(unknown)";
  const value = location[field];
  if (value == null) return [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${id}: ${field} must be an object when present`];
  }

  const allowed = new Set(groupTypeIds);
  const errors = [];
  for (const [key, item] of Object.entries(value)) {
    if (!allowed.has(key))
      errors.push(`${id}: ${field} key ${key} is not a supported group type`);
    const valueError = validateValue(item);
    if (valueError) errors.push(`${id}: ${field}.${key} ${valueError}`);
  }
  return errors;
}

function validateLocationExtensions(location, groupTypeIds) {
  const id = location.id || "(unknown)";
  const errors = [];

  if (
    location.counterpartUrl != null &&
    !isSafeHttpsUrl(location.counterpartUrl)
  ) {
    errors.push(`${id}: counterpartUrl must be a credential-free HTTPS URL`);
  }

  errors.push(
    ...validateMap(location, "groupCheckoutUrls", groupTypeIds, (value) =>
      isSafeUrl(value)
        ? ""
        : "must be a credential-free HTTPS URL or internal path",
    ),
  );
  errors.push(
    ...validateMap(location, "groupInquiryLabels", groupTypeIds, (value) =>
      typeof value === "string" && value.trim() && value.trim().length <= 80
        ? ""
        : "must be a non-empty string of at most 80 characters",
    ),
  );

  return errors;
}

module.exports = { validateLocationExtensions };
