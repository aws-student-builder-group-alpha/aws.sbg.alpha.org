"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { ArrowDownRight, ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import PixelWolf from "./pixel-wolf"
import { RECRUITMENT_URL } from "@/lib/recruitment"
import "./opening-sequence.css"

export default function OpeningSequence() {
 const root = useRef<HTMLElement>(null)
 useEffect(() => {
  gsap.registerPlugin(ScrollTrigger)
  const media = gsap.matchMedia()
  media.add("(prefers-reduced-motion: no-preference)", () => {
   const context = gsap.context(() => {
    const timeline = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: .6 } })
    timeline.to(".alpha-opening-title", { yPercent: -18, opacity: .2, ease: "none" }, 0)
     .to(".alpha-opening-scene", { yPercent: -14, rotation: 9, scale: 1.08, opacity: .25, ease: "none" }, 0)
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
  <div className="alpha-opening-meta"><span>AWS STUDENT BUILDER GROUP — ALPHA</span></div>
  <p className="alpha-opening-eyebrow">It’s always</p>
  <h1 id="alpha-opening-heading" className="alpha-opening-title" aria-label="AWS Student Builder Group Alpha. Your Day One starts here"><span>DAY</span><span>ONE<span className="alpha-opening-dot">.</span></span></h1>
  <div className="alpha-opening-floor" aria-hidden="true" />
  <div className="alpha-opening-scene">
   <div className="alpha-opening-orbit alpha-opening-orbit-one" aria-hidden="true"><i /><i /><i /></div>
   <div className="alpha-opening-orbit alpha-opening-orbit-two" aria-hidden="true"><i /><i /></div>
   <a href="#alpha-community" className="alpha-opening-mascot" aria-label="Why join Alpha?"><PixelWolf dimensional pose="wave" /></a>
   <div className="alpha-opening-memory alpha-opening-memory-one" aria-hidden="true"><Image src="/optimized/gallery/full/scd-2026-certificates.webp" alt="" fill sizes="190px" /></div>
   <div className="alpha-opening-memory alpha-opening-memory-two" aria-hidden="true"><Image src="/optimized/gallery/full/scd-2026-team.webp" alt="" fill sizes="155px" /></div>
   <span className="alpha-opening-star alpha-opening-star-one" aria-hidden="true">✦</span>
   <span className="alpha-opening-star alpha-opening-star-two" aria-hidden="true">+</span>
  </div>
  <div className="alpha-opening-bottom">
   <p>We’re recruiting<br /><span>Core Team &amp; Committee.</span></p>
   <a href={RECRUITMENT_URL + "/opportunities"} className="alpha-opening-start">Open roles <ArrowDownRight size={22} aria-hidden="true" /></a>
   <a href="#about" className="alpha-opening-recruit">Why join Alpha?<ArrowDown size={15} aria-hidden="true" /></a>
  </div>
 </section>
}
