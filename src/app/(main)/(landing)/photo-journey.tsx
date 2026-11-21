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

export default function PhotoJourney({ photos, collagePhotos }: {
  photos: readonly JourneyPhoto[]
  collagePhotos: readonly string[]
}) {
  const flight = useRef<HTMLDivElement>(null)
  useGalleryZoom(flight, true, photos.map(photo => photo.src).join("|"), COLLAGE_SCROLL_DISTANCE)

  return (
    <div className="alpha-photo-journey">
      <div ref={flight} className="alpha-photo-flight" role="group" aria-label="Alpha community photos">
        <div className="gallery-grid">
          {photos.map(photo => (
            <figure key={photo.src} className="gallery-item">
              <div className="alpha-flight-image">
                <Image src={photo.src} alt={photo.alt ?? ""} fill sizes="(min-width: 1440px) 360px, (min-width: 600px) 25vw, 50vw" />
              </div>
              <figcaption>{photo.title}</figcaption>
            </figure>
          ))}
        </div>
        <GalleryCollage photos={collagePhotos} animate={false} />
      </div>
    </div>
  )
}
