"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import MeshGradient from "./mesh-gradient"
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
 useEffect(() => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  let visible = true
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
  if (root.current) observer.observe(root.current)
  const timer = setInterval(() => { if (!paused && !media.matches && visible && !document.hidden) setIndex(value => (value + 1) % photos.length) }, 2500)
  return () => { clearInterval(timer); observer.disconnect() }
 }, [paused])
 return <section ref={root} className="alpha-hero" data-theme="dark" aria-labelledby="alpha-hero-heading">
  <div className="alpha-hero-gradient" aria-hidden="true"><MeshGradient /></div>
  <div className="alpha-hero-content">
   <div className="alpha-hero-copy">
    <p className="alpha-hero-kicker">Rizal Technological University · Est. 2025</p>
    <h1 id="alpha-hero-heading">AWS Student<br />Builder Group <span>— Alpha</span></h1>
    <p className="alpha-hero-description">Est. Rizal Technological University 2025. Have a community that supports your career, learn with peers, and accelerate your cloud career</p>
    <div className="alpha-hero-actions"><a href={RECRUITMENT_URL + "/opportunities"}>Be part of Alpha <span aria-hidden="true">&rarr;</span></a><Link href="/#about">How you can grow with us</Link></div>
   </div>
   <div className="alpha-hero-visual">
    <p className="alpha-hero-motto">It’s Always <span className="urban-starblues">Day One.</span></p>
    <div className="alpha-hero-stack" aria-label="Our builder community">
     <div className="alpha-hero-sheet" aria-hidden="true" /><div className="alpha-hero-sheet" aria-hidden="true" />
     {photos.map((photo, i) => <div key={photo.src} className="alpha-hero-photo" data-active={i === index} aria-hidden={i !== index}><Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 45vw, 90vw" priority={i === 0} /></div>)}
    </div>
    <button type="button" className="alpha-hero-pause" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Play photos" : "Pause photos"}</button>
   </div>
  </div>
 </section>
}
