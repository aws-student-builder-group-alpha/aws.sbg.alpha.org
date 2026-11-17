"use client"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useEffect, useRef, type ReactNode } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export default function LandingMotion({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current || reducedMotion) return
    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia()
    const scenes = root.current.querySelectorAll<HTMLElement>(".alpha-benefit, .alpha-roles, .alpha-proof, .alpha-team, .alpha-closing")
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.motionVisible = String(entry.isIntersecting)
    })
    scenes.forEach(scene => observer.observe(scene))
    media.add({ motion: "(prefers-reduced-motion: no-preference)", small: "(max-width: 799px)" }, mediaContext => {
      if (!mediaContext.conditions?.motion) return
      const small = Boolean(mediaContext.conditions.small)
      const context = gsap.context(() => {
        scenes.forEach(scene => {
          const heading = scene.querySelector("h2")
          if (heading) gsap.fromTo(heading, { y: small ? 12 : 24 }, {
            y: small ? -8 : -16, ease: "none",
            scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: true },
          })
        })
        gsap.utils.toArray<HTMLElement>(".alpha-scene-transition").forEach(boundary => {
          gsap.fromTo(boundary.querySelector(".alpha-transition-fill"), {
            clipPath: "ellipse(55% 0% at 50% 100%)",
          }, {
            clipPath: "ellipse(110% 180% at 50% 100%)", ease: "none",
            scrollTrigger: { trigger: boundary, start: "top bottom", end: "bottom 65%", scrub: true },
          })
        })
        gsap.to("#alpha-ribbon-curve", {
          attr: { d: "M-600 110C-200 210 100 10 500 110S1200 210 1600 110S2300 10 2700 110" }, ease: "none",
          scrollTrigger: { trigger: ".alpha-motion-ribbon", start: "top bottom", end: "bottom top", scrub: true },
        })
        gsap.fromTo(".alpha-motion-ribbon textPath", { attr: { startOffset: "-8%" } }, {
          attr: { startOffset: "-28%" }, ease: "none",
          scrollTrigger: { trigger: ".alpha-motion-ribbon", start: "top bottom", end: "bottom top", scrub: true },
        })
        gsap.utils.toArray<HTMLElement>(".alpha-benefit").forEach((scene, index) => {
          const art = scene.querySelector(".alpha-benefit-art")
          const snapshot = scene.querySelector(".alpha-scene-snapshot")
          const photo = scene.querySelector(".alpha-photo-frame")
          const words = scene.querySelectorAll("h2 > .alpha-type-word, h2 > em")
          const travel = small ? 8 : 32
          const timeline = gsap.timeline({ scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: true } })
          timeline.fromTo(art, { y: travel, rotation: index % 2 ? 3 : -3, scale: .96 }, { y: 0, rotation: 0, scale: 1, duration: .5, ease: "none" }, 0)
            .to(art, { y: -travel, rotation: index % 2 ? -3 : 3, scale: .98, duration: .5, ease: "none" }, .5)
          if (photo) timeline.fromTo(photo, { rotation: 3 }, { rotation: -3, duration: 1, ease: "none" }, 0)
          if (snapshot) timeline.fromTo(snapshot, { y: travel * .6, x: index % 2 ? -8 : 8, rotation: -5 }, { y: -travel * .6, x: index % 2 ? 8 : -8, rotation: 5, duration: 1, ease: "none" }, 0)
          if (!small) timeline.fromTo(words, { xPercent: word => word ? 3 : -3 }, { xPercent: word => word ? -3 : 3, duration: 1, ease: "none" }, 0)
        })
        gsap.utils.toArray<HTMLElement>(".alpha-role-panel").forEach((panel, index) => {
          const fan = gsap.timeline({ scrollTrigger: { trigger: ".alpha-role-panels", start: "top 95%", end: "bottom top", scrub: true } })
          fan.fromTo(panel, { xPercent: index ? -4 : 4, y: 32, rotation: index ? 5 : -5 }, { xPercent: 0, y: 0, rotation: 0, duration: .35, ease: "none" }, 0)
            .to(panel, { y: -16, rotation: index ? -2 : 2, duration: .2, ease: "none" }, .8)
        })
        const gallery = gsap.timeline({ scrollTrigger: { trigger: ".alpha-proof", start: "top bottom", end: "bottom top", scrub: true } })
        gallery.fromTo(".alpha-proof .alpha-hero-visual", { rotation: -3, scale: .94, y: 30 }, { rotation: 0, scale: 1, y: 0, duration: .4, ease: "none" }, 0)
          .to(".alpha-proof .alpha-hero-visual", { rotation: 3, scale: .98, y: -24, duration: .3, ease: "none" }, .7)
      }, root)
      return () => context.revert()
    })
    media.add("(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)", () => {
      const cards = Array.from(root.current!.querySelectorAll<HTMLElement>(".alpha-photo-frame, .alpha-role-panel"))
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return
        const card = event.currentTarget as HTMLElement
        const rect = card.getBoundingClientRect()
        card.style.setProperty("--card-x", String((event.clientX - rect.left) / rect.width - .5))
        card.style.setProperty("--card-y", String((event.clientY - rect.top) / rect.height - .5))
      }
      const reset = (event: PointerEvent) => {
        const card = event.currentTarget as HTMLElement
        card.style.removeProperty("--card-x")
        card.style.removeProperty("--card-y")
      }
      cards.forEach(card => { card.addEventListener("pointermove", move); card.addEventListener("pointerleave", reset) })
      return () => cards.forEach(card => {
        card.removeEventListener("pointermove", move)
        card.removeEventListener("pointerleave", reset)
        card.style.removeProperty("--card-x")
        card.style.removeProperty("--card-y")
      })
    })
    return () => { observer.disconnect(); media.revert(); scenes.forEach(scene => delete scene.dataset.motionVisible) }
  }, [reducedMotion])
  return <div ref={root} className="alpha-story-motion">{children}</div>
}
