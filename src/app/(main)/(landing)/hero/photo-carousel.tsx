"use client"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"

const photos = [
 { src: "/optimized/gallery/full/scd-2026-audience.webp", alt: "Alpha and fellow builders at Student Community Day" },
 { src: "/optimized/gallery/full/scd-2026-team.webp", alt: "The Student Community Day team together on stage" },
 { src: "/optimized/gallery/full/scd-2026-certificates.webp", alt: "Builders celebrating with their certificates" },
]
const VIEWING_TIME = 2500
const TRANSITION_TIME = 720

export default function PhotoCarousel() {
 const root = useRef<HTMLDivElement>(null)
 const transitioning = useRef(false)
 const pointerStart = useRef<number | null>(null)
 const [index, setIndex] = useState(0)
 const [target, setTarget] = useState<number | null>(null)
 const [direction, setDirection] = useState("next")
 const [paused, setPaused] = useState(false)
 const [hovered, setHovered] = useState(false)
 const [focused, setFocused] = useState(false)
 const [visible, setVisible] = useState(true)
 const [tabVisible, setTabVisible] = useState(true)
 const reducedMotion = useReducedMotion()
 const playing = !paused && !hovered && !focused && visible && tabVisible && !reducedMotion

 const goTo = useCallback((next: number, movement = "next") => {
  if (transitioning.current || next === index) return
  if (reducedMotion) { setIndex(next); return }
  transitioning.current = true
  setDirection(movement)
  setTarget(next)
 }, [index, reducedMotion])
 const finishTransition = useCallback(() => {
  if (!transitioning.current || target === null) return
  transitioning.current = false
  setIndex(target)
  setTarget(null)
 }, [target])

 useEffect(() => {
  const syncVisibility = () => setTabVisible(!document.hidden)
  const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
  if (root.current) observer.observe(root.current)
  syncVisibility()
  document.addEventListener("visibilitychange", syncVisibility)
  return () => {
   observer.disconnect()
   document.removeEventListener("visibilitychange", syncVisibility)
  }
 }, [])

 useEffect(() => {
  if (!playing || target !== null) return
  const timer = setTimeout(() => goTo((index + 1) % photos.length), VIEWING_TIME)
  return () => clearTimeout(timer)
 }, [playing, target, index, goTo])

 useEffect(() => {
  if (target === null) return
  // Complete safely if an animation is cancelled, reduced motion changes, or the tab is hidden.
  const timer = setTimeout(finishTransition, reducedMotion ? 0 : TRANSITION_TIME + 80)
  return () => clearTimeout(timer)
 }, [target, reducedMotion, finishTransition])

 const nextIndex = target ?? (index + 1) % photos.length
 const order = [index, nextIndex, ...photos.map((_, i) => i).filter(i => i !== index && i !== nextIndex)]
 const previous = () => goTo((index + photos.length - 1) % photos.length, "previous")
 const next = () => goTo((index + 1) % photos.length)

 return <div ref={root} className="alpha-hero-visual" role="group" aria-roledescription="carousel" aria-label="Our builder community"
  onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
  onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
  onKeyDown={event => {
   if (event.key === "ArrowRight") { event.preventDefault(); next() }
   if (event.key === "ArrowLeft") { event.preventDefault(); previous() }
  }}>
  <div className="alpha-hero-visual-heading"><p className="alpha-hero-motto">It’s Always <span>Day One</span></p></div>
  <p id="alpha-photo-hint" className="sr-only">Use the left and right arrow keys or swipe to browse community photos.</p>
  <div id="alpha-photo-stack" className="alpha-hero-stack" data-discarding={target !== null} data-direction={direction}
   tabIndex={0} aria-label="Community photos" aria-describedby="alpha-photo-hint"
   onAnimationEnd={event => { if (event.animationName === "alpha-card-discard") finishTransition() }}
   onPointerDown={event => {
    if (!event.isPrimary || event.button !== 0) return
    pointerStart.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
   }}
   onPointerCancel={() => { pointerStart.current = null }}
   onPointerUp={event => {
    if (pointerStart.current === null) return
    const distance = event.clientX - pointerStart.current
    pointerStart.current = null
    if (Math.abs(distance) > 45) { if (distance < 0) next(); else previous() }
   }}>
   {photos.map((photo, i) => {
    const slot = order.indexOf(i)
    return <div key={photo.src} className="alpha-hero-photo" data-slot={slot} aria-hidden={slot !== 0} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${photos.length}`}>
     <div className="alpha-photo-hud" aria-hidden="true"><span><i />ALPHA GALLERY</span><span>0{i + 1}</span></div>
     <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1600px) 850px, (min-width: 901px) 54vw, 92vw" loading="lazy" draggable={false} />
    </div>
   })}
  </div>
  <div className="alpha-hero-photo-controls">
   <span className="alpha-hero-photo-number" aria-hidden="true">0{index + 1}<span> / 0{photos.length}</span></span>
   <div className="alpha-hero-photo-progress" role="group" aria-label="Choose a photo" data-playing={playing && target === null}>
    {photos.map((photo, i) => <button key={photo.src} type="button" aria-label={`Show photo ${i + 1}`} aria-current={i === index ? "true" : undefined} aria-controls="alpha-photo-stack" disabled={target !== null} onClick={() => goTo(i)}><span /></button>)}
   </div>
   <div className="alpha-hero-photo-buttons">
    <button type="button" onClick={previous} disabled={target !== null} aria-label="Previous photo" title="Previous photo"><ArrowLeft size={15} aria-hidden="true" /></button>
    <button type="button" onClick={() => {
     if (paused) { setPaused(false); setFocused(false); setHovered(false) }
     else setPaused(true)
    }} aria-pressed={paused} aria-label={paused ? "Play photos" : "Pause photos"} title={paused ? "Play photos" : "Pause photos"}>{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}</button>
    <button type="button" onClick={next} disabled={target !== null} aria-label="Next photo" title="Next photo"><ArrowRight size={15} aria-hidden="true" /></button>
   </div>
  </div>
  <span className="sr-only" aria-live={playing ? "off" : "polite"} aria-atomic="true">Photo {index + 1} of {photos.length}: {photos[index].alt}</span>
 </div>
}
