"use client"

import { useEffect, useRef, type ReactNode } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/** Short entrances and scroll-linked object movement, with no pinned scenes. */
export default function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current) return
    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia()
    const scenes = root.current.querySelectorAll<HTMLElement>(".alpha-benefit, .alpha-roles, .alpha-proof, .alpha-team, .alpha-closing")
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.motionVisible = String(entry.isIntersecting)
    })
    scenes.forEach(scene => observer.observe(scene))
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        scenes.forEach(scene => {
          const heading = scene.querySelector("h2")
          if (heading) gsap.from(heading, {
            y: 65, rotation: 3, opacity: 0, duration: .9, ease: "power3.out",
            scrollTrigger: { trigger: heading, start: "top 94%", once: true },
          })
          const photo = scene.querySelector(".alpha-photo-frame")
          if (photo) gsap.from(photo, {
            clipPath: "inset(0 0 100% 0)", y: 45, rotation: -4, duration: 1.1, ease: "power3.inOut",
            scrollTrigger: { trigger: photo, start: "top 92%", once: true },
          })
          const stickers = scene.querySelectorAll(".alpha-wolf-sticker, .alpha-proof-wolf, .alpha-closing-wolf")
          if (stickers.length) gsap.from(stickers, {
            scale: .45, rotation: -20, opacity: 0, duration: 1, ease: "back.out(1.5)",
            scrollTrigger: { trigger: scene, start: "top 80%", once: true },
          })
        })
        gsap.utils.toArray<HTMLElement>(".alpha-role-panel").forEach((panel, index) => {
          gsap.from(panel, {
            y: 65, rotation: index ? 4 : -4, opacity: 0, duration: .9, delay: index * .1, ease: "power3.out",
            scrollTrigger: { trigger: panel, start: "top 95%", once: true },
          })
        })
      }, root)
      return () => context.revert()
    })
    media.add("(min-width: 800px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".alpha-benefit-art").forEach((art, index) => {
          gsap.fromTo(art, { y: 30, rotation: index % 2 ? 2 : -2 }, {
            y: -30, rotation: index % 2 ? -2 : 2, ease: "none",
            scrollTrigger: { trigger: art.closest("article"), start: "top bottom", end: "bottom top", scrub: .6 },
          })
        })
      }, root)
      return () => context.revert()
    })
    return () => {
      observer.disconnect()
      media.revert()
      scenes.forEach(scene => delete scene.dataset.motionVisible)
    }
  }, [])
  return <div ref={root} className="alpha-story-motion">{children}</div>
}
