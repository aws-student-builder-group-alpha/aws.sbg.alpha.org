"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** A document-entry intro, independent of route loading and account state. */
export function PageLoader() {
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = root.current;
    if (!overlay) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let timeline: gsap.core.Timeline | undefined;
    const dismiss = () => { timeline?.kill(); overlay.hidden = true; };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) dismiss(); };
    const preference = () => { if (reduce.matches) dismiss(); };
    const deadline = setTimeout(dismiss, 2500);
    window.addEventListener("pageshow", restore);
    window.addEventListener("pagehide", dismiss);
    reduce.addEventListener("change", preference);
    if (reduce.matches) dismiss();
    else {
      try {
        timeline = gsap.timeline({ onComplete: dismiss });
        timeline.fromTo(title.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: "power3.out" })
          .fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, duration: .5, ease: "power2.inOut" }, "-=.1")
          .to(overlay, { yPercent: -100, duration: .6, ease: "power4.inOut" });
      } catch { dismiss(); }
    }
    return () => {
      timeline?.kill();
      clearTimeout(deadline);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("pagehide", dismiss);
      reduce.removeEventListener("change", preference);
    };
  }, []);

  return <div ref={root} className="recruitment-page-loader" aria-hidden="true" inert>
    <div ref={title} className="recruitment-page-loader-title">AWS Student Builder Group - Alpha</div>
    <div className="recruitment-page-loader-track"><div ref={bar} className="recruitment-page-loader-fill" /></div>
  </div>;
}
