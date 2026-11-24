"use client"

import { useEffect, useRef } from "react"

export default function ViewportFrame() {
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    const viewport = window.visualViewport
    if (!frame || !viewport) return

    let pending = 0
    const align = () => {
      pending = 0
      frame.style.width = `${viewport.width}px`
      frame.style.height = `${viewport.height}px`
      frame.style.transform = `translate(${viewport.offsetLeft}px, ${viewport.offsetTop}px)`
    }
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(align)
    }

    align()
    viewport.addEventListener("resize", schedule)
    viewport.addEventListener("scroll", schedule)
    return () => {
      cancelAnimationFrame(pending)
      viewport.removeEventListener("resize", schedule)
      viewport.removeEventListener("scroll", schedule)
    }
  }, [])

  return <div ref={frameRef} className="alpha-viewport-frame" aria-hidden="true" />
}
