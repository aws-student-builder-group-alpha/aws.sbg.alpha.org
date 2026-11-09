'use client'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowUpRight, ChevronLeft, ChevronRight, Images, MapPin, Play, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import DepthSurface from './depth-surface'
import { useGalleryZoom } from './use-gallery-zoom'
import { storyCategories, type CommunityStory } from '@/data/community-stories'
import './community-gallery.css'
import './event-showcase.css'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const slideInterval = 3000

function galleryImage(src: string, variant: "card" | "full") {
  if (!src.startsWith("/gallery/")) return src
  const filename = src.slice("/gallery/".length).replace(/\.[^.]+$/, ".webp")
  return "/optimized/gallery/" + variant + "/" + filename
}

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function prefersReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches
}

function StoryDetails({ story, open }: { story: CommunityStory; open: boolean }) {
  const [slide, setSlide] = useState(0)
  const [manuallyNavigated, setManuallyNavigated] = useState(false)
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => true)
  const photoCount = story.images.length
  const playing = !manuallyNavigated && !reducedMotion
  const photo = story.images[slide]

  function changeSlide(next: number) {
    setManuallyNavigated(true)
    setSlide((next + photoCount) % photoCount)
  }

  useEffect(() => {
    if (!open || !playing || photoCount < 2) return

    let timer: number | undefined
    function updateTimer() {
      window.clearInterval(timer)
      if (document.hidden) return
      timer = window.setInterval(() => setSlide(current => (current + 1) % photoCount), slideInterval)
    }

    updateTimer()
    document.addEventListener('visibilitychange', updateTimer)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', updateTimer)
    }
  }, [open, playing, photoCount])

  return <>
    <div
      className="story-slideshow"
      role="group"
      aria-label={story.title + ' photos'}
      onKeyDown={event => {
        if (photoCount < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
        event.preventDefault()
        changeSlide(slide + (event.key === 'ArrowLeft' ? -1 : 1))
      }}
    >
      <div className="story-photo">
        {story.images.map((image, index) => (
          <div key={image.src} className="story-slide" aria-hidden={index !== slide}>
            <Image src={galleryImage(image.src, "full")} alt={image.alt} fill sizes="(min-width: 1090px) 1050px, 100vw" className="object-cover" />
          </div>
        ))}
        {photoCount > 1 && (
          <div className="story-photo-controls">
            <button type="button" className="story-photo-previous" onClick={() => changeSlide(slide - 1)} aria-label="Previous photo">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button type="button" className="story-photo-next" onClick={() => changeSlide(slide + 1)} aria-label="Next photo">
              <ChevronRight size={22} aria-hidden="true" />
            </button>
            <p className="sr-only" aria-live={playing ? 'off' : 'polite'}>Photo {slide + 1} of {photoCount}</p>
          </div>
        )}
      </div>
    </div>
    <div className="story-details">
      <p className="story-category">{story.category} / {story.role}</p>
      <DialogTitle className="story-title">{story.title}</DialogTitle>
      <p className="story-date">{story.dateLabel}</p>
      {story.location && <p className="story-location"><MapPin size={15} aria-hidden="true" />{story.location}</p>}
      <DialogDescription className="story-summary">{story.summary}</DialogDescription>
      <p className="story-description">{story.description}</p>
      <div className="story-links">
        {story.meetupLinks.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="story-meetup">{link.label}<ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>)}
        {story.videoUrl && <a href={story.videoUrl} target="_blank" rel="noopener noreferrer"><Play size={16} aria-hidden="true" />Watch the recap<span className="sr-only"> (opens in a new tab)</span></a>}
        {story.sources.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>)}
      </div>
      <p className="story-credit">Photo credit: {photo.credit}</p>
    </div>
  </>
}

function StoryCard({ story, index }: { story: CommunityStory; index: number }) {
  const [open, setOpen] = useState(false)
  return <article className="gallery-item" aria-label={story.title}>
    <h3 className="sr-only">{story.title}</h3>
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="gallery-reveal">
        <DepthSurface className="gallery-depth">
          <DialogTrigger asChild><button type="button" className="gallery-trigger" aria-label={'View details: '+story.title}>
            <span className="gallery-photo">
              <Image src={galleryImage(story.images[0].src, "card")} alt={story.images[0].alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 600px) 50vw, 100vw" className="object-cover" />
              <span className="gallery-image-count"><Images size={14} aria-hidden="true" />{story.images.length}</span>
            </span>
            <span className="gallery-caption">
              <span className="gallery-category">
                <span className="gallery-category-label">{story.category}</span>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <span className="gallery-title">{story.title}</span>
              <span className="gallery-date">{story.dateLabel}</span>
              <span className="gallery-action">View details<ArrowUpRight size={19} aria-hidden="true" /></span>
            </span>
          </button></DialogTrigger>
        </DepthSurface>
      </div>
      <DialogContent className="story-dialog" showCloseButton={false}>
        <DialogClose className="story-close" aria-label="Close"><X size={20} aria-hidden="true" /></DialogClose>
        <div className="story-dialog-body" data-lenis-prevent-wheel={true} data-lenis-prevent-touch={true}><StoryDetails story={story} open={open} /></div>
      </DialogContent>
    </Dialog>
    <noscript><a href={story.sources[0]?.url||story.meetupLinks[0]?.url}>Read the original record: {story.title}</a></noscript>
  </article>
}

export default function CommunityGallery({ stories, filterable = false, presentation = 'grid' }: { stories: CommunityStory[]; filterable?: boolean; presentation?: 'grid' | 'showcase' }) {
  const [filter, setFilter] = useState('All stories')
  const [view, setView] = useState<'gallery' | 'list'>('gallery')
  const root = useRef<HTMLDivElement>(null)
  const restoreViewPosition = useRef(false)
  function changeView(next: 'gallery' | 'list') {
    if (next === view) return
    restoreViewPosition.current = presentation === 'showcase'
    setView(next)
  }
  function changeFilter(next: string) {
    if (next === filter) return
    restoreViewPosition.current = presentation === 'showcase'
    setFilter(next)
  }
  const visible = useMemo(()=>filter==='All stories'?stories:stories.filter(story=>story.category===filter),[stories,filter])
  useGalleryZoom(root, presentation === 'showcase' && view === 'gallery', visible.map(story => story.id).join('|'))
  useEffect(() => {
    const gallery = root.current
    if (!gallery || presentation !== 'showcase') return
    let frame = 0
    let lastWidth = -1, lastHeight = -1
    const restorePosition = () => {
      if (!restoreViewPosition.current) return
      restoreViewPosition.current = false
      gallery.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
    ScrollTrigger.addEventListener('refresh', restorePosition)
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width === lastWidth && height === lastHeight) return
      lastWidth = width
      lastHeight = height
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => ScrollTrigger.refresh(true))
    })
    observer.observe(gallery)
    return () => { observer.disconnect(); cancelAnimationFrame(frame); ScrollTrigger.removeEventListener('refresh', restorePosition) }
  }, [presentation, filter, view])
  useEffect(() => {
    const gallery = root.current
    if (!gallery || !('IntersectionObserver' in window)) return
    if (gallery.hasAttribute('data-zoom-gallery')) return

    const cards = gallery.querySelectorAll<HTMLElement>('.gallery-item')
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        entry.target.toggleAttribute('data-in-view', entry.isIntersecting)
      }
    }, { threshold: 0.1 })

    gallery.dataset.galleryMotion = ''
    cards.forEach(card => observer.observe(card))
    return () => {
      observer.disconnect()
      delete gallery.dataset.galleryMotion
      cards.forEach(card => card.removeAttribute('data-in-view'))
    }
  }, [visible, view])
  return <div className={`community-gallery${presentation === 'showcase' ? ' gallery-showcase' : ''}`} data-gallery-view={view} ref={root}>
    {presentation === 'showcase' && <div className="gallery-showcase-toolbar"><p>{String(visible.length).padStart(2, '0')} moments. One Alpha community.</p><div className="gallery-view-controls" role="group" aria-label="Event presentation"><button type="button" aria-pressed={view === 'gallery'} onClick={() => changeView('gallery')}>Gallery view</button><button type="button" aria-pressed={view === 'list'} onClick={() => changeView('list')}>List view</button></div></div>}
    {filterable && <div className="gallery-filters" role="group" aria-label="Filter community stories">{['All stories',...storyCategories].map(category=><button key={category} type="button" aria-pressed={filter===category} onClick={()=>changeFilter(category)}>{category}<span>{category==='All stories'?stories.length:stories.filter(story=>story.category===category).length}</span></button>)}</div>}
    {filterable && <p className="gallery-result-count" role="status" aria-live="polite">{visible.length} {visible.length===1?'story':'stories'} · {filter}</p>}
    <div className="gallery-grid" key={view}>{visible.map((story,index)=><StoryCard key={story.id} story={story} index={index} />)}</div>
    {presentation === 'showcase' && <div className="gallery-zoom-guide"><p>Scroll to explore. Select an image for details.</p><span className="gallery-zoom-progress" aria-hidden="true" /><span className="sr-only">Use List view to browse every event without the zoom animation.</span></div>}
  </div>
}
