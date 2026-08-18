import type { LexicalNode, LexicalState } from '../lib/blog-authoring';

const text = (value: string, format = 0): LexicalNode => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
});

const paragraph = (...children: LexicalNode[]): LexicalNode => ({
  children,
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
});

const heading = (value: string): LexicalNode => ({
  children: [text(value)],
  format: '',
  indent: 0,
  tag: 'h2',
  type: 'heading',
  version: 1,
});

const quote = (value: string): LexicalNode => ({
  children: [text(value)],
  format: '',
  indent: 0,
  type: 'quote',
  version: 1,
});

const link = (label: string, url: string): LexicalNode => ({
  children: [text(label)],
  fields: { newTab: url.startsWith('http'), url },
  format: '',
  indent: 0,
  type: 'link',
  version: 1,
});

const list = (items: string[]): LexicalNode => ({
  children: items.map((item) => ({
    children: [text(item)],
    format: '',
    indent: 0,
    type: 'listitem',
    value: 1,
    version: 1,
  })),
  format: '',
  indent: 0,
  listType: 'bullet',
  start: 1,
  tag: 'ul',
  type: 'list',
  version: 1,
});

const root = (...children: LexicalNode[]): LexicalState => ({
  root: {
    children,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
});

export interface PressReleaseSnapshot {
  body: LexicalState;
  excerpt: LexicalState;
  heroImage: string;
  locationSlug: string | null;
  publishDate: string;
  seo: {
    metaDescription: string;
    metaTitle: string;
  };
  slug: string;
  title: string;
}

export const PRESS_RELEASES_SNAPSHOT: PressReleaseSnapshot[] = [
  {
    slug: 'boston-announcement',
    title: "Time Mission Announces New Immersive Adventure Steps from Boston's Faneuil Hall",
    locationSlug: 'boston',
    publishDate: '2026-08-06T12:00:00.000Z',
    heroImage: '/assets/photos/experiences/Time-Mission_Control-Room-1200.webp',
    excerpt: root(paragraph(text('The Fully Themed Experience With 25+ Mission Rooms Is Set to Open in Early 2027'))),
    body: root(
      paragraph(text('BOSTON, MA (Aug. 6, 2026) - ', 1), text('Time Mission, the team-based time-travel experience, plans to open an 8,600-square-foot venue at Marketplace Center, 200 State Street, in early 2027. The new venue, adjacent to Faneuil Hall Marketplace, will bring mission rooms to downtown Boston for the first time.')),
      paragraph(text('Players will travel through time into fully themed missions, dodging lasers, cracking codes, and escaping the unexpected, all while racing the clock to climb the leaderboard. Every mission is set to a different point in time, across the past, present, and future, with challenges that test anything from speed and agility to sharp thinking and teamwork. Teams choose their own adventure, playing any mission in any order and replaying favorites as often as they like.')),
      paragraph(text('The team behind Time Mission is no stranger to Boston. In 2024, the LOL Entertainment team helped bring Museum of Illusions Boston to Marketplace Center, where the attraction quickly became a popular destination for both residents and visitors. Now, the team is returning to the neighborhood with an entirely new concept designed to inspire curiosity, collaboration, and adventure.')),
      paragraph(text('The opening comes as location-based entertainment continues to grow across U.S. cities, with consumers increasingly trading screen time for shared, active experiences. Time Mission was built for that shift: already enjoyed by hundreds of thousands of players across the United States and Europe, it delivers a story-driven experience unlike anything else in Boston.')),
      quote('"We\'ve been looking for the right opportunity to bring Time Mission to Boston, and there\'s no better time, or place, than right now at Marketplace Center," said Rob Cooper, CEO of LOL Entertainment. "Boston has embraced immersive entertainment unlike almost any city in the country, and Time Mission brings an entirely new experience to that landscape. Every mission room challenges players to think, move, and work together, creating a highly replayable adventure that guests will want to play again and again."'),
      paragraph(text("Steps from Faneuil Hall Marketplace, one of the most visited destinations in the United States, and within walking distance of downtown's restaurants, attractions, and waterfront, the venue is built for every kind of group: residents and tourists, students and families, date nights and corporate outings.")),
      quote('"Bringing this type of tenant to Marketplace Center creates excitement and drives foot traffic across the neighborhood," said Zvi Gordon, CEO of Gazit Horizons, owner of Marketplace Center. "Building on the proven draw of Museum of Illusions and the adjacent energy of Faneuil Hall Marketplace and The Rose Kennedy Greenway, Time Mission further cements our property as a world-class entertainment and retail destination for residents and visitors alike."'),
      paragraph(text("Construction begins later this year, with the venue set to open in early 2027 as one of Time Mission's flagship North American locations.")),
      paragraph(
        text('For more information, visit '),
        link('TimeMission.com/Boston', 'https://www.timemission.com/boston'),
        text(' or '),
        link('LOLEntertainment.com', 'https://lolentertainment.com'),
        text('. Connect with Time Mission on '),
        link('Facebook', 'https://www.facebook.com/TimeMissionHQ'),
        text(' and '),
        link('Instagram', 'https://www.instagram.com/timemission/'),
        text('. For media inquiries, please email Helen at '),
        link('info@kmprllc.com', 'mailto:info@kmprllc.com'),
        text('.'),
      ),
      heading('About Time Mission'),
      paragraph(
        text('Time Mission is a live-action team game where players earn points by completing missions across more than 25 fully themed mission rooms. Every mission room is set at a different point in time, and teams of two to five dodge lasers, crack codes, solve puzzles, and race the clock to the top of the leaderboard. Built for kids and adults alike, from family outings to team-building events, Time Mission blends competition and collaboration, making every second count. To learn more, visit '),
        link('TimeMission.com', 'https://www.timemission.com'),
        text('.'),
      ),
      heading('About LOL Entertainment'),
      paragraph(
        text('LOL Entertainment is a leading innovator in location-based entertainment, creating unforgettable immersive experiences that inspire curiosity, connection, and play. Its growing portfolio includes Time Mission, Museum of Illusions, Sandbox VR, and Cluville Kids Escape Room. Through strategic development, investment, marketing, and operations, LOL Entertainment continues to redefine experiential entertainment by bringing world-class attractions to communities across North America and beyond. To learn more, visit '),
        link('LOLEntertainment.com', 'https://lolentertainment.com'),
        text('.'),
      ),
    ),
    seo: {
      metaTitle: 'Time Mission Announces Boston Location | Time Mission',
      metaDescription: 'Time Mission will open an 8,600-square-foot immersive adventure venue near Faneuil Hall in Boston in early 2027.',
    },
  },
  {
    slug: 'time-mission-global-expansion-2027',
    title: 'Time Mission announces major global expansion with 15 to 20 new locations planned for 2027',
    locationSlug: null,
    publishDate: '2026-07-28T12:00:00.000Z',
    heroImage: '/assets/photos/TM-Groups-1200.webp',
    excerpt: root(paragraph(text('Time Mission plans its most ambitious expansion to date, with 15 to 20 new locations planned for 2027 and new venues under development across the United States and Europe.'))),
    body: root(
      paragraph(text('PROVIDENCE, R.I. — ', 1), text('Time Mission, the rapidly growing international leader in location-based entertainment (LBE), announced plans for its most ambitious expansion to date, with 15 to 20 new locations planned for 2027 and six venues currently under construction across the United States and Europe.')),
      paragraph(text('Founded in 2019 from a single hand-built concept, Time Mission has quickly evolved into one of the fastest-growing immersive entertainment brands in the industry. The company’s strategic expansion is fueled by a data-driven site selection process that combines proprietary analytics with third-party demographic research to identify markets where the interactive experience is most likely to thrive.')),
      paragraph(text('Unlike many entertainment brands, Time Mission operates under a direct licensing model rather than a traditional franchise system, allowing the company to maintain consistent quality while partnering with experienced operators around the world.')),
      paragraph(text('Each Time Mission venue represents an average investment of $2 million to $2.5 million, spans approximately 10,000 square feet, and typically opens within six to eight months of lease execution.')),
      paragraph(text('Six new locations are currently under development in:')),
      list([
        'Dallas, Texas',
        'Nashville, Tennessee',
        'Boston, Massachusetts',
        'Charleston, South Carolina',
        'Edison, New Jersey',
        'Columbus, Ohio',
        'Eindhoven, Netherlands',
      ]),
      paragraph(text('The Charleston, Edison, and Columbus locations will be integrated into Family Entertainment Centers (FECs), further expanding the brand’s reach into high-traffic entertainment destinations.')),
      paragraph(text('Time Mission currently operates locations in Illinois, Pennsylvania, Texas, Virginia, New York, Rhode Island, and Belgium, with additional international expansion planned as consumer demand for immersive experiences continues to accelerate. Additionally, Time Mission has launched a secondary headquarters in Eindhoven, Netherlands, which will serve as a testing site for new attractions and entertainment features.')),
      quote('“Our growth isn’t about opening more locations for the sake of expansion. It’s about thoughtfully building a global brand with a proven operating model, working with exceptional partners, and delivering an experience that continues to resonate with guests across cultures,” said Pieter Martens, CEO and Founder of Time Mission. “We’re incredibly proud of how far we’ve come, and even more excited about what’s ahead.”'),
      paragraph(text('Time Mission’s expansion comes as immersive entertainment continues to experience unprecedented consumer demand. Industry research shows that Generation Z is four times more likely than older generations to visit immersive experiences, signaling a significant shift in how consumers seek entertainment and social experiences.')),
      paragraph(text('As Time Mission enters its next phase of growth, the company remains focused on delivering innovative, high-quality experiences while expanding its footprint in strategic markets worldwide.')),
    ),
    seo: {
      metaTitle: 'Time Mission Announces Global Expansion | Time Mission',
      metaDescription: 'Time Mission plans 15 to 20 new locations for 2027 as its immersive entertainment footprint expands across the United States and Europe.',
    },
  },
  {
    slug: 'nashville-announcement',
    title: 'START THE COUNTDOWN: TIME MISSION TO OPEN IN MUSIC CITY THIS YEAR',
    locationSlug: 'nashville',
    publishDate: '2026-08-18T12:00:00.000Z',
    heroImage: '/assets/photos/venue/_Time-Mission_0042-1200.webp',
    excerpt: root(paragraph(text('Immersive and experiential social gaming adventure unlike anything else in Nashville arrives at Cummins Station in Q4; at 12,000 sf with 28 unique missions, it will be the largest location in the United States for fast-growing Time Mission.'))),
    body: root(
      paragraph(
        text('AUGUST 18, 2026 - Nashville, TN - ', 1),
        text('The race is on. '),
        link('Time Mission', 'https://www.timemission.com/'),
        text(', an immersive social gaming venue where teams of 2-5 compete through missions ranging from brain-bending puzzles to full-body physical challenges, today formally announced it would open its largest location yet by the end of this year in the iconic '),
        link('Cummins Station', 'https://cumminsstation.com/'),
        text(' building at 209 10th Avenue South, Nashville, TN 37203.'),
      ),
      paragraph(text('Since opening its first location in Rhode Island in 2021, Time Mission has rapidly expanded across North America and Europe while building a passionate following. By the end of 2026, 12 locations are expected to be open and to date every venue maintains an exceptional 4.9- or 5-star Google rating.')),
      paragraph(text('Time Mission Nashville will be owned and operated by TM Operations based in Tampa, FL.')),
      quote('"Nashville has been at the top of our list for a long time because it\'s a city full of energy that knows and loves great entertainment," said David Larson, Managing Partner at TM Operations. "Time Mission delivers something that\'s been missing: an indoor, year-round experience that\'s just as perfect for families as it is for friends, coworkers or date nights. Whether you\'re 6 or 106, everyone contributes in different ways, and that\'s what makes it so much fun. People always leave talking about their favorite missions and immediately planning when they\'re coming back."'),
      paragraph(
        text('At 12,000 sf and the largest Time Mission location in the United States, Time Mission Nashville will feature '),
        link('28 unique missions', 'https://www.timemission.com/missions'),
        text('.'),
      ),
      quote('“Cummins Station unlocked exactly what we were looking for in establishing an exciting and accessible destination in Nashville,” added Michael Greene, CFO of TM Operations. “It’s centrally located, features ample parking, and offers incredible neighboring restaurants and entertainment, establishing a truly dynamic and synergistic entertainment destination. The size and scale of Time Mission Nashville is a testament to our confidence in the location and our belief that Music City will embrace the concept.”'),
      heading('How does Time Mission work?'),
      paragraph(text('Teams of 2-5 players (with larger groups divided into multiple teams) begin by selecting a 60-, 90- or 120-minute session, then set off to explore a network of 28 immersive mission portals, each transporting players to a different place in time and presenting a completely unique challenge.')),
      paragraph(text("Every mission lasts just a few minutes, allowing teams to choose whichever challenges fit their strengths, whether that's solving puzzles, spotting patterns, testing memory, climbing obstacles, throwing accurately, racing against the clock or working together to overcome physical and mental hurdles.")),
      paragraph(text("Like a real-life video game, each completed mission earns points that contribute to a team's overall score. Players can replay missions to improve their performance, skip challenges that aren't the right fit, or race to discover new portals before time expires.")),
      paragraph(text('Because every room requires different skills, everyone on the team has an opportunity to contribute. Most guests complete 15 to 20 missions during a 90-minute visit, with countless reasons to return and improve their score.')),
      heading('Preparing for Opening by End of Year'),
      paragraph(text("Time Mission expects to employ more than 20 team members, with hiring anticipated to begin in October ahead of the venue's Q4 opening. A specific opening date will be announced later this year.")),
      paragraph(
        text('For updates, sneak peeks and opening announcements, visit '),
        link('timemission.com/nashville', 'https://www.timemission.com/nashville'),
        text(' or follow '),
        link('@timemission', 'https://www.instagram.com/timemission/'),
        text(' on social media.'),
      ),
    ),
    seo: {
      metaTitle: 'Time Mission Nashville Opening in 2026 | Time Mission',
      metaDescription: 'Time Mission will open its largest U.S. venue, a 12,000-square-foot, 28-mission experience at Cummins Station in Nashville, in Q4 2026.',
    },
  },
];
