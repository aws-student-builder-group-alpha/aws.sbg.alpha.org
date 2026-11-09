import records from './community-stories.json'
import { events } from './events'

export const storyCategories = ['Organization Events', 'Community Partnership', 'Achievements', 'Scholarships'] as const
export type StoryCategory = (typeof storyCategories)[number]
export interface StoryLink { label: string; url: string }
export interface StoryImage { src: string; alt: string; credit: string; sourceUrl: string }
export interface CommunityStory {
  id: string; category: StoryCategory; title: string; dateLabel: string; location: string | null
  role: string; summary: string; description: string; featured: number; images: StoryImage[]
  sources: StoryLink[]; meetupLinks: StoryLink[]; meetupIds: string[]; videoUrl?: string
}
export const communityStories = records as CommunityStory[]

export function getCommunityStories(): CommunityStory[] {
  const represented = new Set(communityStories.flatMap(story => story.meetupIds))
  const additional = events.filter(event => !represented.has(event.id)).map(event => ({
    id: 'meetup-' + event.id, category: 'Organization Events' as const, title: event.title,
    dateLabel: event.date, location: event.location === 'TBA' ? null : event.location,
    role: 'Meetup event', summary: event.description, description: event.description, featured: 0,
    images: [{src:event.image,alt:event.title,credit:'Alpha Meetup event listing',sourceUrl:event.sourceUrl || event.registrationLink || ''}],
    sources: [], meetupLinks: event.sourceUrl || event.registrationLink ? [{label:'View the Meetup event',url:event.sourceUrl || event.registrationLink || ''}] : [], meetupIds:[event.id],
  }))
  return [...communityStories,...additional]
}
export function getFeaturedStories() {
  return communityStories.filter(story => story.featured > 0).sort((a,b) => a.featured-b.featured)
}
