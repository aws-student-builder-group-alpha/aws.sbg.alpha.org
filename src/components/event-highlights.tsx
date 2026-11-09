import CommunityGallery from './community-gallery'
import { getCommunityStories } from '@/data/community-stories'

export default function EventHighlights() {
  return <CommunityGallery stories={getCommunityStories()} presentation="showcase" filterable />
}
