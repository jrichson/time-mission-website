import fs from 'node:fs';
import path from 'node:path';
import type { LocationRecord } from '../../src/data/locations';
import { ticketPanelSelectOptions } from '../../src/lib/ticket-options';

export function ticketOptionsFromLocationsDocument(doc: { locations?: LocationRecord[] }) {
    return ticketPanelSelectOptions(doc.locations || []);
}

export function loadTicketOptions(repoRoot: string) {
    const raw = fs.readFileSync(path.join(repoRoot, 'data', 'locations.json'), 'utf8');
    return ticketOptionsFromLocationsDocument(JSON.parse(raw) as { locations?: LocationRecord[] });
}
