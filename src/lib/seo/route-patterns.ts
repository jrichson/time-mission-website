type Match = 'exact' | 'prefix' | 'default';

export interface RobotsRule {
    match: Match;
    path?: string;
    robots: string;
}

export function resolveRobotsForRoute(canonicalPath: string, table: { rules: RobotsRule[] }): string {
    for (const rule of table.rules) {
        if (rule.match === 'exact' && rule.path === canonicalPath) return rule.robots;
        if (rule.match === 'prefix' && rule.path && canonicalPath.startsWith(rule.path)) return rule.robots;
        if (rule.match === 'default') return rule.robots;
    }
    return 'index,follow';
}
