"use client"

import { useRef } from "react"
import Image from "next/image"
import GalleryCollage from "@/components/gallery-collage"
import { useGalleryZoom } from "@/components/use-gallery-zoom"

interface JourneyPhoto {
  src: string
  title: string
  alt?: string
}

const COLLAGE_SCROLL_DISTANCE = 2300

function previewSource(src: string) {
  return "/optimized/landing/preview/" + src.slice(src.lastIndexOf("/") + 1)
}

export default function PhotoJourney({ photos, collagePhotos }: {
  photos: readonly JourneyPhoto[]
  collagePhotos: readonly string[]
}) {
  const flight = useRef<HTMLDivElement>(null)
  useGalleryZoom(flight, true, photos.map(photo => photo.src).join("|"), COLLAGE_SCROLL_DISTANCE)
  const previews = Object.fromEntries(photos.map(photo => [photo.src, previewSource(photo.src)]))

  return (
    <div className="alpha-photo-journey">
      <div ref={flight} className="alpha-photo-flight" role="group" aria-label="Alpha community photos">
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
