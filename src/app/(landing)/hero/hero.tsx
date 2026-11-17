"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowRight, Pause, Play } from "lucide-react"
import MeshGradient from "./mesh-gradient"
import AwsBuildMark from "./aws-build-mark"
import { RECRUITMENT_URL } from "@/lib/recruitment"
import "./hero.css"

const photos = [
 { src: "/optimized/gallery/full/scd-2026-audience.webp", alt: "Alpha and fellow builders at Student Community Day" },
 { src: "/optimized/gallery/full/scd-2026-team.webp", alt: "The Student Community Day team together on stage" },
 { src: "/optimized/gallery/full/scd-2026-certificates.webp", alt: "Builders celebrating with their certificates" },
]

export default function Hero() {
 const root = useRef<HTMLElement>(null)
 const [index, setIndex] = useState(0)
 const [paused, setPaused] = useState(false)
 const [discarding, setDiscarding] = useState(false)
 const [reducedMotion, setReducedMotion] = useState(false)
 const nextPhoto = useCallback(() => {
  if (reducedMotion) setIndex(value => (value + 1) % photos.length)
  else setDiscarding(true)
 }, [reducedMotion])

 useEffect(() => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  const sync = () => setReducedMotion(media.matches)
  sync()
  media.addEventListener("change", sync)
  return () => media.removeEventListener("change", sync)
 }, [])

 useEffect(() => {
  let visible = true
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
  if (root.current) observer.observe(root.current)
  const timer = setInterval(() => {
   if (!paused && !reducedMotion && visible && !document.hidden) nextPhoto()
  }, 2500)
  return () => { clearInterval(timer); observer.disconnect() }
 }, [paused, reducedMotion, nextPhoto])

 // Finish the shuffle even if the tab is hidden midway through the animation.
 useEffect(() => {
  if (!discarding) return
  const timer = setTimeout(() => {
   setIndex(value => (value + 1) % photos.length)
   setDiscarding(false)
  }, reducedMotion ? 0 : 800)
  return () => clearTimeout(timer)
 }, [discarding, reducedMotion])

 return <section ref={root} className="alpha-hero" data-theme="dark" aria-labelledby="alpha-hero-heading">
  <div className="alpha-hero-gradient" aria-hidden="true"><MeshGradient /></div>
  <div className="alpha-hero-content">
   <div className="alpha-hero-copy">
    <AwsBuildMark />
    <p className="alpha-hero-code-label" aria-hidden="true"><span>~/aws/alpha</span> · build together<span className="alpha-terminal-cursor">_</span></p>
    <h1 id="alpha-hero-heading" aria-label="AWS Student Builder Group Alpha"><span className="alpha-hero-heading-line">Student Builder</span><span className="alpha-hero-heading-line">Group <span className="alpha-hero-name"><span className="alpha-code-bracket" aria-hidden="true">&lt;</span>Alpha<span className="alpha-code-bracket" aria-hidden="true"> /&gt;</span></span></span></h1>
    <p className="alpha-hero-description">Have a community that supports your career, learn with peers, and accelerate your cloud career with us.</p>
    <div className="alpha-hero-actions">
     <a className="alpha-hero-primary" href={RECRUITMENT_URL + "/opportunities"}>Be a Member Here! <ArrowRight size={20} aria-hidden="true" /></a>
     <Link className="alpha-hero-secondary" href="/#about">How you can grow with us <ArrowDown size={17} aria-hidden="true" /></Link>
    </div>
   </div>
   <div className="alpha-hero-visual">
    <div className="alpha-hero-visual-heading"><p className="alpha-hero-motto">It’s Always <span>Day One</span></p></div>
    <div className="alpha-hero-stack" data-discarding={discarding} role="group" aria-roledescription="carousel" aria-label="Our builder community">
     {photos.map((photo, i) => {
      const slot = (i - index + photos.length) % photos.length
      return <div key={photo.src} className="alpha-hero-photo" data-slot={slot} aria-hidden={slot !== 0} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${photos.length}`}>
       <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1600px) 800px, (min-width: 901px) 54vw, 92vw" priority={i === 0} />
      </div>
     })}
    </div>
    <div className="alpha-hero-photo-controls">
     <div className="alpha-hero-photo-position"><span className="alpha-hero-photo-number">0{index + 1}</span><span className="alpha-hero-photo-progress" aria-hidden="true">{photos.map((photo, i) => <span key={photo.src} data-active={i === index} />)}</span><span>0{photos.length}</span></div>
     <div className="alpha-hero-photo-buttons">
      <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? "Play photos" : "Pause photos"}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}</button>
      <button type="button" onClick={nextPhoto} disabled={discarding} aria-label="Next photo"><ArrowRight size={16} aria-hidden="true" /></button>
     </div>
    </div>
   </div>
  </div>
 </section>
}
