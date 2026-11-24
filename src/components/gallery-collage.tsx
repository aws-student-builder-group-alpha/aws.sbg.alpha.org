"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import "./gallery-collage.css"

export default function GalleryCollage({ photos, animate = true, mobilePreviews }: {
  photos: readonly string[]
  animate?: boolean
  mobilePreviews?: Readonly<Record<string, string>>
}) {
  const reducedMotion = useReducedMotion()
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = root.current
    if (!section || !animate || reducedMotion) return

    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia(section)
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(".gallery-collage-grid", { opacity: .15, scale: 1.03 }, {
        opacity: 1, scale: 1, ease: "none",
        scrollTrigger: { trigger: section, start: "top 85%", end: "top 15%", scrub: true },
      })
    })
    return () => media.revert()
  }, [animate, reducedMotion])

  if (!photos.length) return null

  return (
    <section ref={root} className="gallery-collage" aria-label="Our community, together">
      <div className="gallery-collage-grid" aria-hidden="true">
        {Array.from({ length: 36 }, (_, index) => {
          const src = photos[index % photos.length]
          const preview = mobilePreviews?.[src]
          const image = <Image src={src} alt="" fill sizes="(min-width: 768px) 17vw, 34vw" />
          return (
            <div key={index} style={{ "--gallery-tile-index": index } as CSSProperties}>
              {preview ? <picture><source media="(max-width: 767px)" srcSet={preview} />{image}</picture> : image}
            </div>
          )
        })}
      </div>
      <div className="gallery-collage-message"><h3>This is what we’ve<br />built together.</h3></div>
    </section>
  )
}
