/** Preserve an existing schedule's exact instant when its displayed date is unchanged. */
export function announcementDateForSave(input: string, previous: string | null | undefined, parsed: string | null) {
  const date = previous ? new Date(previous) : null;
  return date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === input
    ? previous
    : parsed;
}

/** Target order and Payload row IDs do not change an announcement's meaning. */
export function announcementDataChanged(previous: object, submitted: Record<string, unknown>): boolean {
  const current = previous as Record<string, unknown>;
  return Object.entries(submitted).some(([key, value]) => {
    if (key === 'targetLocations' || key === 'targetRegions') {
      const field = key === 'targetLocations' ? 'locationSlug' : 'region';
      const targets = (rows: unknown) => Array.isArray(rows)
        ? rows.map((row) => row[field]).sort()
        : [];
      return JSON.stringify(targets(current[key])) !== JSON.stringify(targets(value));
    }
    return (current[key] ?? '') !== (value ?? '');
  });
}
