/** Organizer recaps reviewed 5 November 2026. Keep source attribution with each highlight. */
export interface EventHighlight {
  id: string
  title: string
  dateLabel: string
  location: string
  role: string
  description: string
  image: string
  imageAlt: string
  imageCredit: string
  sourceUrl: string
  sourceLabel: string
  galleryUrl?: string
  videoUrl?: string
  replacesMeetupId?: string
}

export const eventHighlights: EventHighlight[] = [
  {
    id: 'student-community-day-2026',
    title: 'AWS Student Community Day Mega Manila 2026',
    dateLabel: 'September 11, 2026',
    location: 'Asia Pacific College, Makati',
    role: 'Co-presented by Alpha',
    description: 'A day of cloud and AI talks, hands-on workshops and collaborative architecture challenges. Alpha helped bring 381 student builders and technology enthusiasts together with AWS Student User Group Philippines.',
    image: '/events/student-community-day-2026.jpg',
    imageAlt: 'An SCD speaker presents Agents, APIs, and AWS to students at Asia Pacific College.',
    imageCredit: 'Photo: AWS Student User Group Philippines · Kyla Nicole Gagui',
    sourceUrl: 'https://builder.aws.com/content/3JdBMZVAgxteOstpyWiEaevAtxo/building-the-community-we-wanted-to-see-the-story-of-aws-student-community-day-mega-manila-2026',
    sourceLabel: 'Read the organizer’s story',
    galleryUrl: 'https://www.facebook.com/share/p/19rZkX4UL6/',
    videoUrl: 'https://www.facebook.com/reel/2276294056483919',
    // The organizer recap confirms September 11; Meetup lists September 27.
    replacesMeetupId: '316720779',
  },
  {
    id: 'ygg-play-summit-2025',
    title: 'YGG Play Summit 2025',
    dateLabel: '2025',
    location: 'SMX Convention Center',
    role: 'Student participation support',
    description: 'Alpha supported RTU Institute of Computer Studies students in exploring the City of Play, connecting with the technology community and discovering emerging digital experiences at YGG Play Summit.',
    image: '/events/ygg-play-summit-2025.jpg',
    imageAlt: 'RTU Institute of Computer Studies Student Council thanks YGG Play Summit and AWS Learning Club Alpha.',
    imageCredit: 'Artwork: RTU Institute of Computer Studies Student Council',
    sourceUrl: 'https://www.facebook.com/share/p/1BL1e7e2qd/',
    sourceLabel: 'Read the community recap',
  },
]
