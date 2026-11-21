"use client"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useEffect, useRef } from "react"

export default function HeroBackground() {
  const reducedMotion = useReducedMotion()
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = video.current
    if (!element) return
    const mobile = window.matchMedia("(max-width: 799px)")
    let visible = false
    const playback = () => {
      if (reducedMotion || !visible || document.hidden) element.pause()
      else void element.play().catch(() => { /* The poster stays visible if autoplay is unavailable. */ })
    }
    const source = () => {
      if (reducedMotion) {
        element.pause()
        element.removeAttribute("src")
        element.load()
        return
      }
      const path = mobile.matches ? "/media/scd-hero-mobile.mp4" : "/media/scd-hero.mp4"
      if (element.getAttribute("src") !== path) {
        element.src = path
        element.load()
      }
      playback()
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      playback()
    })
    observer.observe(element)
    source()
    mobile.addEventListener("change", source)
    document.addEventListener("visibilitychange", playback)
    return () => {
      observer.disconnect()
      mobile.removeEventListener("change", source)
      document.removeEventListener("visibilitychange", playback)
      element.pause()
    }
  }, [reducedMotion])

  return <>
    <div className="alpha-opening-backdrop" aria-hidden="true"><video ref={video} muted loop playsInline disablePictureInPicture disableRemotePlayback preload="none" poster="/media/scd-hero-poster.jpg" /></div>
  </>
}
