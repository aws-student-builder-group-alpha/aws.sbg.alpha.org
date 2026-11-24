"use client"

import type { RefObject } from "react"
import { useGalleryZoom } from "@/components/use-gallery-zoom"

export default function PhotoJourneyMotion({ gallery, identity }: {
  gallery: RefObject<HTMLDivElement | null>
  identity: string
}) {
  useGalleryZoom(gallery, true, identity, 2300)
  return null
}
