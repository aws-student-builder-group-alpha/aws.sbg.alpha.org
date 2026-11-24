"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import GalleryCollage from "@/components/gallery-collage"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface JourneyPhoto {
  src: string
  title: string
  alt?: string
}

const PhotoJourneyMotion = dynamic(() => import("./photo-journey-motion"))

function previewSource(src: string) {
  return "/optimized/landing/preview/" + src.slice(src.lastIndexOf("/") + 1)
}

export default function PhotoJourney({ photos, collagePhotos }: {
  photos: readonly JourneyPhoto[]
  collagePhotos: readonly string[]
}) {
  const flight = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [nearGallery, setNearGallery] = useState(false)

  useEffect(() => {
    const gallery = flight.current
    if (!gallery || nearGallery || reducedMotion) return

    const load = () => setNearGallery(true)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) load()
    }, { rootMargin: "1000px 0px" })
    observer.observe(gallery)
    const anchorFrame = window.location.hash ? requestAnimationFrame(load) : 0
    window.addEventListener("hashchange", load)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(anchorFrame)
      window.removeEventListener("hashchange", load)
    }
  }, [nearGallery, reducedMotion])

  const previews = Object.fromEntries(photos.map(photo => [photo.src, previewSource(photo.src)]))

  return (
    <div className="alpha-photo-journey">
      <div ref={flight} className="alpha-photo-flight" role="group" aria-label="Alpha community photos">
        {nearGallery && !reducedMotion && (
          <PhotoJourneyMotion gallery={flight} identity={photos.map(photo => photo.src).join("|")} />
        )}
        <div className="gallery-grid">
          {photos.map(photo => (
            <figure key={photo.src} className="gallery-item">
              <div className="alpha-flight-image">
                <picture>
                  <source media="(max-width: 767px)" srcSet={previews[photo.src]} data-full-src={photo.src} />
                  <Image src={photo.src} alt={photo.alt ?? ""} fill sizes="(min-width: 1440px) 360px, (min-width: 600px) 25vw, 50vw" />
                </picture>
              </div>
              <figcaption>{photo.title}</figcaption>
            </figure>
          ))}
        </div>
        <GalleryCollage photos={collagePhotos} mobilePreviews={previews} animate={false} />
      </div>
    </div>
  )
}
