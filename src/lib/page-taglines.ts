const homeTaglines = [
    'Social Gaming Adventure',
    'Date Night, Leveled Up',
    'Family Game Night Reimagined',
    'Fast-Paced Team Challenges',
    'Indoor Adventure for Every Group',
    'Corporate Team Building, But Fun',
    'Compete, Collaborate, Replay',
    'Built for Friends and Families',
    'Score Points Across Every Mission',
    'Choose Your Next Adventure',
    'Play Together in Real Life',
];

const standardLocationTaglines = [
    'Social Gaming Adventure',
    'Family Game Night Reimagined',
    'Birthday Parties, Leveled Up',
    'Fast-Paced Team Challenges',
    'Indoor Adventure for Every Group',
    'Corporate Team Building, But Fun',
    'Making Memories Together',
    'Built for Every Age',
    'Your New Favorite Weekend',
    'No Screens. Just Fun.',
    'Team Up. Beat The Clock.',
];

const comingSoonTaglines = [
    'Social Gaming Adventure',
    'Family Game Night Reimagined',
    'Birthday Parties, Leveled Up',
    'Corporate Team Building, But Fun',
    'Built for Every Age',
    'Team Up. Beat The Clock.',
];

export function homePageTaglines(): string[] {
    return homeTaglines.slice();
}

export function openLocationPageTaglines(slug: string): string[] {
    if (slug === 'philadelphia') return homeTaglines.slice();
    return standardLocationTaglines.slice();
}

export function comingSoonLocationPageTaglines(statusLabel: string): string[] {
    return [statusLabel, ...comingSoonTaglines];
}
