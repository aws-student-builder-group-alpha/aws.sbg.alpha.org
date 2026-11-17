"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import KineticType from "../kinetic-type"
import PixelWolf from "./pixel-wolf"
import "./opening-sequence.css"

export default function OpeningSequence() {
 const root = useRef<HTMLElement>(null)
 useEffect(() => {
  gsap.registerPlugin(ScrollTrigger)
  const media = gsap.matchMedia()
  media.add("(prefers-reduced-motion: no-preference)", () => {
   const context = gsap.context(() => {
    const timeline = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } })
    timeline.to(".alpha-opening-title .alpha-type-letter", {
      yPercent: index => index % 2 ? -55 : -90,
      rotation: index => index % 2 ? 12 : -12,
      xPercent: index => (index - 2) * 7,
      opacity: .15, stagger: .025, ease: "none",
    }, 0)
     .to(".alpha-opening-scene", { yPercent: 36, xPercent: 14, rotation: 38, scale: .72, ease: "none" }, 0)
     .to(".alpha-opening-memory-one", { xPercent: -25, rotation: -24, ease: "none" }, 0)
     .to(".alpha-opening-memory-two", { xPercent: 25, rotation: 22, ease: "none" }, 0)
     .to(".alpha-opening-floor", { scale: 1.2, opacity: 0, ease: "none" }, 0)

   }, root)
   return () => context.revert()
  })
  const observer = new IntersectionObserver(([entry]) => root.current?.setAttribute("data-visible", String(entry.isIntersecting)))
  if (root.current) observer.observe(root.current)
  return () => { observer.disconnect(); media.revert() }
 }, [])

 return <section ref={root} className="alpha-opening" data-theme="dark" aria-labelledby="alpha-opening-heading"
  onPointerMove={event => {
   if (event.pointerType === "touch" || window.matchMedia("(hover: none), (pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
   const rect = event.currentTarget.getBoundingClientRect()
   event.currentTarget.style.setProperty("--opening-x", String((event.clientX - rect.left) / rect.width - .5))
   event.currentTarget.style.setProperty("--opening-y", String((event.clientY - rect.top) / rect.height - .5))
  }} onPointerLeave={event => { event.currentTarget.style.setProperty("--opening-x", "0"); event.currentTarget.style.setProperty("--opening-y", "0") }}>
  <div className="alpha-opening-grain" aria-hidden="true" />
  <p className="alpha-opening-eyebrow">It’s always</p>
  <h1 id="alpha-opening-heading" className="alpha-opening-title" aria-label="AWS Student Builder Group Alpha. Your Day One starts here"><span><KineticType text="DAY" /></span><span><KineticType text="ONE" /><span className="alpha-opening-dot">.</span></span></h1>
  <div className="alpha-opening-floor" aria-hidden="true" />
  <div className="alpha-opening-scene">
   <div className="alpha-opening-orbit alpha-opening-orbit-one" aria-hidden="true"><i /><i /><i /></div>
   <div className="alpha-opening-orbit alpha-opening-orbit-two" aria-hidden="true"><i /><i /></div>
   <a href="#alpha-community" className="alpha-opening-mascot" data-wolf-stop="opening" aria-label="Why join Alpha?"><PixelWolf dimensional pose="wave" /></a>
   <div className="alpha-opening-memory alpha-opening-memory-one" aria-hidden="true"><Image src="/optimized/gallery/full/scd-2026-certificates.webp" alt="" fill sizes="190px" /></div>
   <div className="alpha-opening-memory alpha-opening-memory-two" aria-hidden="true"><Image src="/optimized/gallery/full/scd-2026-team.webp" alt="" fill sizes="155px" /></div>
   <span className="alpha-opening-star alpha-opening-star-one" aria-hidden="true">✦</span>
   <span className="alpha-opening-star alpha-opening-star-two" aria-hidden="true">+</span>
  </div>
  <div className="alpha-opening-bottom">
   <p>We’re recruiting<br /><span>Core Team &amp; Committee.</span></p>
   <a href="#about" className="alpha-opening-recruit">Why join Alpha?<ArrowDown size={15} aria-hidden="true" /></a>
  </div>
 </section>
}
