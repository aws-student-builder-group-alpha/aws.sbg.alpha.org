"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "./motion";

type HomePreloaderProps = {
  onComplete: () => void;
};

export function HomePreloader({ onComplete }: HomePreloaderProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const root = scope.current;
    if (!root) return;
    const inner = root.querySelector<HTMLElement>(".home-preloader-inner");
    const content = root.querySelector<HTMLElement>(".home-preloader-content");
    const title = root.querySelector<HTMLElement>(".home-preloader-title");
    const bar = root.querySelector<HTMLElement>(".home-preloader-fill");
    if (!inner || !content || !title || !bar) return;
    let seenIntro = false;
    try {
      seenIntro = sessionStorage.getItem("alpha-intro-shown") === "1";
      sessionStorage.setItem("alpha-intro-shown", "1");
    } catch { /* The intro remains optional when storage is blocked. */ }
    if (seenIntro) {
      onComplete();
      return;
    }

    const media = gsap.matchMedia();
    media.add({
      desktop: "(min-width: 768px)",
      mobile: "(max-width: 767px)",
      reduce: "(prefers-reduced-motion: reduce)",
    }, (context) => {
      if (context.conditions?.reduce) {
        onComplete();
        return;
      }
      gsap.timeline({ defaults: { ease: "power2.out" }, onComplete })
        .fromTo(title, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: .3 }, 0)
        .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: .4, ease: "power2.inOut" }, .22)
        .addLabel("reveal", .7)
        .to(root, { yPercent: -100, duration: .65, ease: "power4.inOut" }, "reveal")
        .to(inner, { yPercent: 100, duration: .65, ease: "power4.inOut" }, "reveal")
        .to(content, { yPercent: -100, duration: .65, ease: "power4.inOut" }, "reveal");
    }, root);
    return () => media.revert();
  }, { scope });

  return <div ref={scope} className="home-preloader" aria-hidden="true">
    <div className="home-preloader-inner">
      <div className="home-preloader-content">
        <div className="home-preloader-title">AWS Student Builder Group - Alpha</div>
        <div className="home-preloader-track"><div className="home-preloader-fill" /></div>
      </div>
    </div>
  </div>;
}
