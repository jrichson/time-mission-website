// Mega-menu content: desktop nav hover panels (SiteNav) and the mobile menu's expandable sections.
// Images are the 480w crops already in /assets.
export const megaMenus: Record<string, {
    cards: { title: string; text: string; href: string; img: string; i18n?: string }[];
    links: { label: string; href: string; i18n?: string }[];
    // When set, `cards` is a pool: three are shown at random (nav.js) and this tile comes last.
    viewAll?: { title: string; text: string; href: string; img: string; i18n?: string };
}> = {
    '/missions': {
        cards: [
            { title: 'Magma Mayhem', text: 'Dodge the lava. Hit the targets.', href: '/missions', img: '/assets/photos/experiences/Time-Mission-Magma-Mayhem-1-480.webp' },
            { title: 'Alien Awakening', text: 'Crack the code before they wake.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Alien_Awakening-480.webp' },
            { title: 'Big Bang', text: 'Rebuild the universe, fast.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Big-Bang-480.webp' },
            { title: 'Server Heist', text: 'Slip past the lasers.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Server_Heist5-480.webp' },
            { title: 'Glitch Matrix', text: 'Find the pattern before it finds you.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Glitch-Matrix-480.webp' },
            { title: 'Jungle Temple', text: 'Brave the traps of a lost temple.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Jungle-Temple-480.webp' },
            { title: 'Orbital Relay', text: 'Keep the station running.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Orbital_Relay-480.webp' },
            { title: 'Piano Piano', text: 'Play it back, note for note.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Piano_Piano-480.webp' },
            { title: 'Pirates Attack', text: 'Defend the ship. Sink the raiders.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Pirates_Attack-480.webp' },
        ],
        viewAll: { title: 'View All', text: 'See all 25+ missions.', href: '/missions', img: '/assets/photos/experiences/Time-Mission_Orbital_Pit-480.webp' },
        links: [
            { label: 'Leaderboard', href: '/leaderboard', i18n: 'leaderboard.badge' },
            { label: 'All 25+ missions', href: '/missions' },
            { label: 'Physical', href: '/missions?filter=physical' },
            { label: 'Mental', href: '/missions?filter=mental' },
            { label: 'Skill', href: '/missions?filter=skill' },
            { label: 'Speed', href: '/missions?filter=speed' },
        ],
    },
    '/groups': {
        cards: [
            { title: 'Birthdays', text: 'Games, cake and a crew to celebrate.', href: '/groups/birthdays', img: '/assets/photos/experiences/_Time-Mission_0321-480.webp', i18n: 'home.groups.birthdays' },
            { title: 'Corporate', text: 'Team building people actually enjoy.', href: '/groups/corporate', img: '/assets/photos/groups/corporate-events-480.webp', i18n: 'home.groups.corporate' },
            { title: 'Field Trips', text: 'Learning disguised as pure fun.', href: '/groups/field-trips', img: '/assets/photos/groups/field-trips-480.webp', i18n: 'home.groups.fieldTrips' },
            { title: 'Bachelor/ette', text: 'Make the last night out legendary.', href: '/groups/bachelor-ette', img: '/assets/photos/groups/bachelor-bachelorette-480.webp', i18n: 'home.groups.bachelor' },
        ],
        links: [
            { label: 'All groups & parties', href: '/groups' },
            { label: 'Private Events', href: '/groups/private-events', i18n: 'home.groups.privateEvents' },
            { label: 'Holidays', href: '/groups/holidays', i18n: 'home.groups.holidays' },
            { label: 'Plan an event', href: '/contact?type=event' },
        ],
    },
    '/about': {
        cards: [
            { title: 'How to Play', text: 'Team up, pick your missions, beat the clock.', href: '/about', img: '/assets/photos/venue/_Time-Mission_0024-480.webp' },
            { title: 'Locations', text: 'Find a Time Mission near you.', href: '/locations', img: '/assets/photos/nav/mega-locations-map-480.webp', i18n: 'nav.locations' },
            { title: 'Gift Cards', text: 'Give the gift of adventure.', href: '/gift-cards', img: '/assets/photos/nav/mega-gift-card-480.webp', i18n: 'nav.giftCards' },
            { title: 'Blog', text: 'News, tips and new missions.', href: '/blog', img: '/assets/photos/venue/_Time-Mission_0078-480.webp' },
        ],
        links: [
            { label: 'FAQ', href: '/faq', i18n: 'nav.faq' },
            { label: 'Contact', href: '/contact', i18n: 'nav.contact' },
            { label: 'Press', href: '/press' },
            { label: 'Waiver', href: '/waiver' },
        ],
    },
};
