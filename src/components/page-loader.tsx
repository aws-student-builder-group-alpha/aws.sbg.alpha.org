"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import PixelWolf from "@/app/(main)/(landing)/hero/pixel-wolf"
import { getReducedMotion, subscribeToSitePreferences } from "@/lib/site-preferences"

const INTRO_SESSION_KEY = "alpha-intro-shown"

export default function PageLoader({ replayOnDocument = false }: { replayOnDocument?: boolean }) {
  const pathname = usePathname()
  // Keep the entry route's replay policy when the layout persists through navigation.
  const [isHomeEntry] = useState(() => pathname === "/")
  const shouldReplay = replayOnDocument || isHomeEntry
  const root = useRef<HTMLDivElement>(null)
  const seenIntro = useRef<boolean | null>(null)

  useEffect(() => {
    const overlay = root.current
    if (!overlay) return

    const dismiss = () => {
      overlay.hidden = true
      overlay.removeAttribute("data-home-intro")
    }
    if (!shouldReplay && seenIntro.current === null) {
      seenIntro.current = false
      try {
        seenIntro.current = sessionStorage.getItem(INTRO_SESSION_KEY) === "1"
        sessionStorage.setItem(INTRO_SESSION_KEY, "1")
      } catch { /* The intro can still dismiss when storage is unavailable. */ }
    }

    if ((!shouldReplay && seenIntro.current) || getReducedMotion()) {
      dismiss()
      return
    }

    const restore = (event: PageTransitionEvent) => { if (event.persisted) dismiss() }
    const unsubscribe = subscribeToSitePreferences(() => { if (getReducedMotion()) dismiss() })
    window.addEventListener("pageshow", restore)
    window.addEventListener("pagehide", dismiss)
    document.addEventListener("focusin", dismiss, { once: true })

    return () => {
      unsubscribe()
      window.removeEventListener("pageshow", restore)
      window.removeEventListener("pagehide", dismiss)
      document.removeEventListener("focusin", dismiss)
    }
  }, [shouldReplay])

  useEffect(() => {
    if (pathname !== "/") root.current?.removeAttribute("data-home-intro")
  }, [pathname])

  return (
    <div
      ref={root}
      className="alpha-page-loader"
      data-home-intro={isHomeEntry ? "" : undefined}
      aria-hidden="true"
      inert
      onAnimationEnd={event => {
        if (event.target === event.currentTarget) event.currentTarget.hidden = true
      }}
    >
      <div className="alpha-page-loader-content">
        <div className="alpha-page-loader-scene">
          <div className="alpha-page-loader-sticker">
            <p className="alpha-page-loader-title">Loading</p>
          </div>
          <div className="alpha-page-loader-curl" />
          <PixelWolf className="alpha-page-loader-wolf" dimensional pose="wave" tilt={-8} />
        </div>
        <div className="alpha-page-loader-track" />
      </div>
    </div>
  )
}
