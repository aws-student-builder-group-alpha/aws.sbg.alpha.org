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
    if (reducedMotion) {
      if (element.hasAttribute("src")) {
        element.pause()
        element.removeAttribute("src")
        element.load()
      }
      return
    }

    const playback = () => {
      if (!visible || document.hidden) {
        element.pause()
        return
      }

      const path = mobile.matches ? "/media/scd-hero-mobile.mp4" : "/media/scd-hero.mp4"
      if (element.getAttribute("src") !== path) {
        element.src = path
      }
      void element.play().catch(() => { /* The poster stays visible if autoplay is unavailable. */ })
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      playback()
    })
    observer.observe(element)
    mobile.addEventListener("change", playback)
    document.addEventListener("visibilitychange", playback)
    return () => {
      observer.disconnect()
      mobile.removeEventListener("change", playback)
      document.removeEventListener("visibilitychange", playback)
      element.pause()
    }
  }, [reducedMotion])

  return <>
    <div className="alpha-opening-backdrop" aria-hidden="true"><video ref={video} muted loop playsInline disablePictureInPicture disableRemotePlayback preload="none" poster="/media/scd-hero-poster.webp" /></div>
  </>
}
