"use client"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useEffect, useRef, useState } from "react"
import PixelWolf from "./hero/pixel-wolf"
import { wolfPose, wolfCoversText, safeWolfPose, wolfRoute, wolfSegmentClear, stepWolfPose, resizeWolfPose, type WolfPoint, type WolfPose } from "./journey-geometry"

export default function JourneyWolf() {
  const reducedMotion = useReducedMotion()
  const wolf = useRef<HTMLButtonElement>(null)
  const [excited, setExcited] = useState(false)
  useEffect(() => {
    const button = wolf.current
    const page = button?.closest<HTMLElement>(".alpha-landing")
    if (!button || !page || reducedMotion) return
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)")
    let dispose = () => {}
    const sync = () => {
      dispose()
      if (!motion.matches) return
      const hosts = Array.from(page.querySelectorAll<HTMLElement>("[data-wolf-stop]"))
      if (hosts.length < 2) return
      // Whole content blocks are protected, including photos and service demos.
      // The mascot belongs beside these elements, never on their surface.
      const readingSelector = ".alpha-opening-title, .alpha-opening-eyebrow, .alpha-opening-bottom, .alpha-opening-memory, .alpha-video-toggle, .alpha-benefit-copy, .alpha-benefit-art, .alpha-scene-snapshot, .alpha-scene-heading, .alpha-quote, .alpha-roles-heading>p, .alpha-role-panel, .alpha-button, .alpha-team h2, .alpha-team-grid, .alpha-community-dock, .alpha-proof .alpha-hero-visual, .alpha-text-link, .alpha-kicker, .alpha-scene-stamp, .alpha-upcoming, .alpha-closing-friend, .alpha-finale footer>.container, nav"
      let frame = 0
      let active = true
      let previousPose: WolfPose | null = null
      let previousScroll = Math.max(0, window.scrollY)
      let previousTime = performance.now()
      let path: WolfPoint[] = []
      let routeTarget: WolfPoint | null = null
      const draw = (time: number) => {
        frame = 0
        if (!active) return
        const scroll = Math.max(0, window.scrollY)
        const elapsed = Math.min(.05, Math.max(.001, (time - previousTime) / 1000))
        const scrollDelta = scroll - previousScroll
        previousTime = time
        previousScroll = scroll
        // Only the route moves with the page; the rendered wolf keeps its viewport position.
        path.forEach(point => { point.y -= scrollDelta })
        if (routeTarget) routeTarget.y -= scrollDelta
        const stops = hosts.map((host, index) => {
          const rect = (host.dataset.wolfStop === "opening" ? host.closest(".alpha-opening-scene")! : host).getBoundingClientRect()
          const y = rect.top + rect.height / 2 + scroll
          return { x: rect.left + rect.width / 2, y, width: host.offsetWidth, scroll: index === 0 ? 0 : Math.max(0, y - window.innerHeight * .55) }
        })
        // Very short viewports may put consecutive checkpoints at the same scroll offset.
        stops.forEach((stop, index) => { if (index) stop.scroll = Math.max(stop.scroll, stops[index - 1].scroll + 1) })
        let desired = wolfPose(scroll, stops, document.documentElement.clientWidth, window.innerHeight)
        if (!desired) return
        const regions = Array.from(page.querySelectorAll<HTMLElement>(readingSelector), element => element.getBoundingClientRect())
        const header = page.querySelector("nav")?.getBoundingClientRect().bottom ?? 96
        desired = resizeWolfPose(desired, Math.min(desired.width, 400, document.documentElement.clientWidth * .6))
        let heroDocked = false
        const opening = hosts[0].closest<HTMLElement>(".alpha-opening")
        const orbit = opening?.querySelector(".alpha-opening-orbit-one")
        if (opening && orbit) {
          const transition = Math.max(0, Math.min(1, (scroll / opening.offsetHeight - .2) / .45))
          const blend = transition * transition * (3 - 2 * transition)
          if (blend < 1) {
            heroDocked = true
            const rect = orbit.getBoundingClientRect()
            const width = hosts[0].offsetWidth
            // Center the wolf's face, excluding the SVG's shadow and empty space.
            const centered = { x: rect.left + rect.width / 2 - width * 176 / 360, y: rect.top + rect.height / 2 - width * 148 / 360 }
            desired = { ...desired, x: centered.x + (desired.x - centered.x) * blend, y: centered.y + (desired.y - centered.y) * blend, width: width + (desired.width - width) * blend, rotation: desired.rotation * blend }
          }
        }
        const target = heroDocked ? desired : safeWolfPose(desired, regions, document.documentElement.clientWidth, window.innerHeight, header, previousPose ?? undefined)
        let moving = false
        // Initial placement happens once. A temporarily blocked route never resets it.
        if (!previousPose && target) previousPose = target
        if (previousPose) {
          const previous = previousPose
          let pose = previous
          if (target) {
            if (heroDocked) {
              // Grow/shrink around the face center, rather than sliding its top-left corner.
              const centered = stepWolfPose(
                { ...previous, x: previous.x + previous.width * 176 / 360, y: previous.y + previous.width * 148 / 360 },
                { ...target, x: target.x + target.width * 176 / 360, y: target.y + target.width * 148 / 360 },
                elapsed,
              )
              pose = { ...centered, x: centered.x - centered.width * 176 / 360, y: centered.y - centered.width * 148 / 360 }
              path = []
              routeTarget = null
            } else {
              const footprint = Math.max(previous.width, Math.min(target.width, previous.width + 100 * elapsed))
              // The header can cover an offscreen wolf as it naturally re-enters the page.
              const routeRegions = regions.filter(rect => rect.bottom > header && rect.top < window.innerHeight - 100)
              if (wolfSegmentClear(previous, target, footprint, routeRegions)) {
                path = [{ x: target.x, y: target.y }]
                routeTarget = { x: target.x, y: target.y }
              } else if (!path.length || !routeTarget || Math.hypot(target.x - routeTarget.x, target.y - routeTarget.y) > 40 || !wolfSegmentClear(previous, path[0], footprint, routeRegions)) {
                path = wolfRoute(previous, target, footprint, routeRegions, document.documentElement.clientWidth, window.innerHeight, header) ?? []
                routeTarget = { x: target.x, y: target.y }
              }
              while (path.length && Math.hypot(path[0].x - previous.x, path[0].y - previous.y) < 1) path.shift()
              const next = path[0] ?? previous
              pose = stepWolfPose(previous, { ...target, x: next.x, y: next.y }, elapsed)
              // Resizing must fit too; a path can open up while the wolf gently shrinks.
              if (pose.width > previous.width && wolfCoversText(pose, regions)) pose.width = previous.width
              if (wolfCoversText(pose, regions) && !wolfCoversText(previous, regions)) {
                pose.x = previous.x
                pose.y = previous.y
                path = []
              }
            }
            const remaining = Math.max(Math.abs(pose.x - target.x), Math.abs(pose.y - target.y), Math.abs(pose.width - target.width), Math.abs(pose.rotation - target.rotation))
            const progress = Math.max(Math.abs(pose.x - previous.x), Math.abs(pose.y - previous.y), Math.abs(pose.width - previous.width), Math.abs(pose.rotation - previous.rotation))
            moving = remaining > .3 && progress > .01
          }
          previousPose = pose
          const reading = wolfCoversText(pose, regions)
          const visible = pose.x + pose.width > 0 && pose.x < document.documentElement.clientWidth && pose.y + pose.width * 8 / 9 > header && pose.y < window.innerHeight - 100
          button.dataset.reading = String(reading)
          button.dataset.visible = String(visible)
          button.setAttribute("aria-hidden", String(!visible))
          button.style.width = `${pose.width}px`
          button.style.transform = `translate3d(${pose.x}px,${pose.y}px,0) rotate(${pose.rotation}deg)`
          button.dataset.stop = String(desired.index)
          button.tabIndex = visible ? 0 : -1
        } else {
          button.dataset.visible = "false"
          button.setAttribute("aria-hidden", "true")
          button.tabIndex = -1
        }
        page.dataset.journeyActive = "true"
        if (moving) frame = requestAnimationFrame(draw)
      }
      const queue = () => { if (!frame) frame = requestAnimationFrame(draw) }
      const pointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !window.matchMedia("(pointer: fine)").matches) return
        button.style.setProperty("--wolf-look-x", String(event.clientX / window.innerWidth - .5))
        button.style.setProperty("--wolf-look-y", String(event.clientY / window.innerHeight - .5))
      }
      window.addEventListener("scroll", queue, { passive: true })
      const relayout = () => { path = []; routeTarget = null; queue() }
      window.addEventListener("resize", relayout)
      window.addEventListener("pointermove", pointer, { passive: true })
      // Font/image layout changes must update the path even without another scroll.
      const observer = new ResizeObserver(relayout)
      observer.observe(page)
      queue()
      void document.fonts.ready.then(() => { if (active) queue() })
      dispose = () => {
        active = false
        cancelAnimationFrame(frame)
        observer.disconnect()
        window.removeEventListener("scroll", queue)
        window.removeEventListener("resize", relayout)
        window.removeEventListener("pointermove", pointer)
        delete page.dataset.journeyActive
        button.removeAttribute("style")
        button.removeAttribute("tabindex")
        button.removeAttribute("aria-hidden")
      }
    }
    sync()
    motion.addEventListener("change", sync)
    return () => { dispose(); motion.removeEventListener("change", sync) }
  }, [reducedMotion])
  return <button ref={wolf} type="button" className="alpha-journey-wolf" aria-label="Give Alpha a high five" onClick={() => setExcited(true)}>
    <span className="alpha-journey-body" data-excited={excited} onAnimationEnd={event => { if (event.target === event.currentTarget) setExcited(false) }}><PixelWolf dimensional pose="wave" /></span>
    <span className="alpha-wolf-hint">{excited ? "High five!" : "High five?"}</span>
  </button>
}
