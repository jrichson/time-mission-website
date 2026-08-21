import type { LocationRecord, LocationSpecialHours } from '../data/locations';

const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function localCalendarDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calendarDateInTimeZone(date: Date, timeZone: string | null | undefined): string {
    if (!timeZone) return localCalendarDate(date);

    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            day: '2-digit',
            month: '2-digit',
            timeZone,
            year: 'numeric',
        }).formatToParts(date);
        const part = (type: Intl.DateTimeFormatPartTypes): string => (
            parts.find((candidate) => candidate.type === type)?.value ?? ''
        );
        const value = `${part('year')}-${part('month')}-${part('day')}`;
        if (ISO_CALENDAR_DATE.test(value)) return value;
    } catch {
        // Invalid or unsupported IANA zones fall back to the runtime calendar.
    }

    return localCalendarDate(date);
}

export function upcomingLocationSpecialHours(
    loc: Pick<LocationRecord, 'specialHours' | 'timeZone'> | null | undefined,
    now = new Date(),
): LocationSpecialHours[] {
    const today = calendarDateInTimeZone(now, loc?.timeZone);
    return [...(loc?.specialHours ?? [])]
        .filter((hours) => (
            ISO_CALENDAR_DATE.test(hours.date)
            && hours.date >= today
            && Boolean(hours.name.trim())
            && Boolean(hours.label.trim())
        ))
        .sort((left, right) => left.date.localeCompare(right.date));
}
