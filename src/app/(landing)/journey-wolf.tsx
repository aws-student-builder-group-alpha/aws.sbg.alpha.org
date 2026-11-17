"use client"

import { useEffect, useRef, useState } from "react"
import PixelWolf from "./hero/pixel-wolf"
import { wolfPose } from "./journey-geometry"

export default function JourneyWolf() {
  const wolf = useRef<HTMLButtonElement>(null)
  const [excited, setExcited] = useState(false)
  useEffect(() => {
    const button = wolf.current
    const page = button?.closest<HTMLElement>(".alpha-landing")
    if (!button || !page) return
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)")
    let dispose = () => {}
    const sync = () => {
      dispose()
      if (!motion.matches) return
      const hosts = Array.from(page.querySelectorAll<HTMLElement>("[data-wolf-stop]"))
      if (hosts.length < 2) return
      let frame = 0
      let active = true
      let previousScroll = window.scrollY
      let bank = 0
      const draw = () => {
        frame = 0
        if (!active) return
        const scroll = Math.max(0, window.scrollY)
        const stops = hosts.map((host, index) => {
          const rect = host.getBoundingClientRect()
          const y = rect.top + rect.height / 2 + scroll
          return { x: rect.left + rect.width / 2, y, width: host.offsetWidth, scroll: index === 0 ? 0 : Math.max(0, y - window.innerHeight * .55) }
        })
        // Very short viewports may put consecutive checkpoints at the same scroll offset.
        stops.forEach((stop, index) => { if (index) stop.scroll = Math.max(stop.scroll, stops[index - 1].scroll + 1) })
        const pose = wolfPose(scroll, stops, document.documentElement.clientWidth, window.innerHeight)
        if (!pose) return
        const velocity = Math.max(-18, Math.min(18, (scroll - previousScroll) * .6))
        bank += (velocity - bank) * .2
        previousScroll = scroll
        button.style.width = `${pose.width}px`
        button.style.transform = `translate3d(${pose.x}px,${pose.y}px,0) rotate(${pose.rotation + bank}deg)`
        button.dataset.stop = String(pose.index)
        const visible = pose.y + pose.width * 8 / 9 > 0 && pose.y < window.innerHeight
        button.dataset.visible = String(visible)
        button.tabIndex = visible ? 0 : -1
        page.dataset.journeyActive = "true"
        if (Math.abs(bank) > .1) frame = requestAnimationFrame(draw)
      }
      const queue = () => { if (!frame) frame = requestAnimationFrame(draw) }
      const pointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !window.matchMedia("(pointer: fine)").matches) return
        button.style.setProperty("--wolf-look-x", String(event.clientX / window.innerWidth - .5))
        button.style.setProperty("--wolf-look-y", String(event.clientY / window.innerHeight - .5))
      }
      window.addEventListener("scroll", queue, { passive: true })
      window.addEventListener("resize", queue)
      window.addEventListener("pointermove", pointer, { passive: true })
      // Font/image layout changes must update the path even without another scroll.
      const observer = new ResizeObserver(queue)
      observer.observe(page)
      queue()
      void document.fonts.ready.then(() => { if (active) queue() })
      dispose = () => {
        active = false
        cancelAnimationFrame(frame)
        observer.disconnect()
        window.removeEventListener("scroll", queue)
        window.removeEventListener("resize", queue)
        window.removeEventListener("pointermove", pointer)
        delete page.dataset.journeyActive
        button.removeAttribute("style")
        button.removeAttribute("tabindex")
      }
    }
    sync()
    motion.addEventListener("change", sync)
    return () => { dispose(); motion.removeEventListener("change", sync) }
  }, [])
  return <button ref={wolf} type="button" className="alpha-journey-wolf" aria-label="Give Alpha a high five" onClick={() => setExcited(true)}>
    <span className="alpha-journey-body" data-excited={excited} onAnimationEnd={event => { if (event.target === event.currentTarget) setExcited(false) }}><PixelWolf dimensional pose="wave" /></span>
    <span className="alpha-wolf-hint">{excited ? "High five!" : "High five?"}</span>
  </button>
}
