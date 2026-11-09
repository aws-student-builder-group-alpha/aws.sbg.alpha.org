"use client";

import { type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";


gsap.registerPlugin(useGSAP, ScrollTrigger);

export { useGSAP };

type MotionScope = RefObject<HTMLElement | null>;
type MotionKey = string | number | undefined;

export const motionPresets = {
  ease: "power2.out",
  reveal: 0.4,
  panel: 0.2,
  heading: 0.25,
  dialog: 0.18,
  stagger: 0.06,
  maxStagger: 0.24,
} as const;

const conditions = {
  desktop: "(min-width: 768px)",
  mobile: "(max-width: 767px)",
  reduce: "(prefers-reduced-motion: reduce)",
};

const staggerFor = (count: number, stagger: number = motionPresets.stagger) =>
  count > 1 ? Math.min(stagger, motionPresets.maxStagger / (count - 1)) : 0;

function settle(targets: HTMLElement[]) {
  if (!targets.length) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { clearProps: "opacity,transform,visibility,willChange" });
}

// A focused or pressed component always finishes its visual entrance immediately.
// Scope the delayed event callback to the same media context as its animations.
function finishOnInteraction(
  root: HTMLElement,
  targets: HTMLElement[],
  context: gsap.Context,
  onFinish?: (element: HTMLElement) => void,
) {
  const finish = context.add("finishInteraction", (event: Event) => {
    if (!(event.target instanceof Node)) return;
    const target = event.target;
    const active = targets.filter((element) => element.contains(target));
    active.forEach((element) => onFinish?.(element));
    settle(active);
  }) as (event: Event) => void;
  root.addEventListener("focusin", finish);
  root.addEventListener("pointerdown", finish);
  return () => {
    root.removeEventListener("focusin", finish);
    root.removeEventListener("pointerdown", finish);
  };
}

type EntranceOptions = {
  selector?: string;
  motionKey?: MotionKey;
  duration?: number;
  distance?: number;
  stagger?: number;
  enabled?: boolean;
  allowFocused?: boolean;
};

/** Run only on mount or an explicit visual identity change, never on normal renders. */
export function useEntrance(
  scope: MotionScope,
  {
    selector,
    motionKey,
    duration = motionPresets.panel,
    distance = 8,
    stagger = 0,
    enabled = true,
    allowFocused = false,
  }: EntranceOptions = {},
) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || !enabled) return;
      const targets = selector
        ? Array.from(root.querySelectorAll<HTMLElement>(selector))
        : [root];
      if (!targets.length) return;
      // Local to this hook run: survives matchMedia refreshes, resets on actual
      // component identity changes and React Strict Mode setup/cleanup cycles.
      let started = false;
      const media = gsap.matchMedia();
      media.add(
        conditions,
        (context) => {
          if (started || context.conditions?.reduce) {
            started = true;
            settle(targets);
            return;
          }
          started = true;
          const focused = targets.some((target) =>
            target.contains(document.activeElement),
          );
          if (focused && !allowFocused) return;
          gsap.from(targets, {
            opacity: 0.65,
            y: context.conditions?.desktop ? distance : distance / 2,
            duration,
            ease: motionPresets.ease,
            stagger: staggerFor(targets.length, stagger),
            overwrite: "auto",
            clearProps: "opacity,transform,willChange",
          });
          return finishOnInteraction(root, targets, context);
        },
        root,
      );
      return () => media.revert();
    },
    {
      scope,
      dependencies: [
        selector,
        motionKey,
        duration,
        distance,
        stagger,
        enabled,
        allowFocused,
      ],
      revertOnUpdate: true,
    },
  );
}

/** One staged brand entrance after the Home preloader, independent of page interactions. */
export function useHeroMotion(scope: MotionScope, enabled: boolean = true) {
  useGSAP(() => {
    const root = scope.current;
    if (!root) return;
    const navbars = Array.from(document.querySelectorAll<HTMLElement>(
      ".site-header[data-adaptive='home'] .header-inner",
    ));
    const headline = root.querySelector<HTMLElement>(".hero-title-line");
    const accent = root.querySelector<HTMLElement>(".hero-particle-line");
    const description = root.querySelector<HTMLElement>(".hero-description");
    const heroTargets = [headline, accent, description]
      .filter((target): target is HTMLElement => target !== null);
    const targets = [...navbars, ...heroTargets];
    if (!enabled) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        settle(targets);
      } else {
        gsap.set(navbars, { autoAlpha: 0, y: -28 });
        gsap.set(heroTargets, {
          autoAlpha: 0,
          y: 36,
        });
      }
      return;
    }
    let started = false;
    const media = gsap.matchMedia();
    media.add(conditions, (context) => {
      if (started || context.conditions?.reduce) {
        started = true;
        settle(targets);
        return;
      }
      started = true;
      if (!navbars.length || !headline || !accent || !description) {
        settle(targets);
        return;
      }

      const lineStep = .7;
      const timeline = gsap.timeline({
        defaults: { ease: "power4.out" },
      });

      timeline
        .addLabel("blank", 0)
        .set(targets, { autoAlpha: 0 }, "blank")
        .addLabel("navbar", .3)
        .fromTo(navbars,
          { autoAlpha: 0, y: -28, willChange: "transform,opacity" },
          { autoAlpha: 1, y: 0, duration: .65, clearProps: "opacity,transform,visibility,willChange" },
          "navbar",
        )
        .addLabel("headline", `navbar+=${lineStep}`)
        .fromTo(headline,
          { autoAlpha: 0, y: context.conditions?.desktop ? 56 : 36, willChange: "transform,opacity" },
          { autoAlpha: 1, y: 0, duration: .72, clearProps: "opacity,transform,visibility,willChange" },
          "headline",
        )
        .addLabel("accent", `headline+=${lineStep}`)
        .fromTo(accent,
          { autoAlpha: 0, y: context.conditions?.desktop ? 56 : 36, willChange: "transform,opacity" },
          { autoAlpha: 1, y: 0, duration: .72, clearProps: "opacity,transform,visibility,willChange" },
          "accent",
        )
        .addLabel("description", `accent+=${lineStep}`)
        .fromTo(description,
          { autoAlpha: 0, y: 28, willChange: "transform,opacity" },
          { autoAlpha: 1, y: 0, duration: .65, clearProps: "opacity,transform,visibility,willChange" },
          "description",
        );
      return finishOnInteraction(root, targets, context);
    }, root);
    return () => media.revert();
  }, { scope, dependencies: [enabled], revertOnUpdate: true });
}

/** Coordinate the hero handoff and section entrances during normal scrolling. */
export function useHomeScrollMotion(scope: MotionScope, enabled: boolean) {
  useGSAP(() => {
    const root = scope.current;
    if (!root || !enabled) return;
    const gradient = root.querySelector(".brand-hero .hero-gradient");
    const message = root.querySelector(".hero-message");
    const introduction = root.querySelector("#opportunities");
    const lead = introduction?.querySelector(".opportunities-lead");

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (gradient && message && introduction && lead) {
        const handoff = gsap.timeline({
          defaults: { duration: 1, ease: "none" },
          scrollTrigger: {
            trigger: introduction,
            start: "clamp(top 98%)",
            end: "top 24%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        handoff
          .fromTo(gradient, { yPercent: 0, scale: 1, opacity: .65 }, {
            yPercent: () => gsap.utils.clamp(10, 22, window.innerWidth / 64),
            scale: 1.18,
            opacity: .36,
          }, 0)
          .fromTo(message, { y: 0, scale: 1, opacity: 1 }, {
            y: () => -gsap.utils.clamp(24, 64, window.innerHeight * .075),
            scale: .94,
            opacity: .66,
          }, 0)
          .fromTo(lead, { y: 40, opacity: .68 }, { y: 0, opacity: 1, duration: .8 }, .2);
      }

      gsap.utils.toArray<HTMLElement>("[data-home-reveal]", root).forEach(element => {
        const photo = element.dataset.homeReveal === "photo";
        gsap.fromTo(element, { y: photo ? 30 : 22, opacity: .76, scale: photo ? .975 : 1 }, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: photo ? .8 : .6,
          ease: "power2.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: element, start: "top 87%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>(".faq-question-label", root).forEach((label, index) => {
        gsap.fromTo(label, { x: -14, opacity: .78 }, {
          x: 0,
          opacity: 1,
          duration: .55,
          delay: index * .045,
          ease: "power2.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: label.closest("summary"), start: "top 90%", once: true },
        });
      });
    }, root);
    return () => media.revert();
  }, { scope, dependencies: [enabled], revertOnUpdate: true });
}

/** Reveal one department card per scroll interval, then hand off to the next card. */
export function useOpportunityTextMotion(scope: MotionScope, enabled: boolean, motionKey: MotionKey) {
  useGSAP(() => {
    const catalog = scope.current?.querySelector(".opportunity-catalog-section");
    if (!catalog || !enabled) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const panels = gsap.utils.toArray<HTMLElement>(".department-panel", catalog);
      panels.forEach((panel, index) => {
        const step = panel.closest<HTMLElement>(".department-step");
        if (!step) return;
        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: step, start: "top 90%", end: "bottom 20%", scrub: true, invalidateOnRefresh: true },
        }).fromTo(panel, { y: 44, scale: .94, opacity: .35 }, { y: 0, scale: 1, opacity: 1, duration: .25 })
          .to(panel, { y: 0, scale: 1, opacity: 1, duration: .5 })
          .to(panel, { y: -16, scale: .96, opacity: index === panels.length - 1 ? 1 : .25, duration: .25 });
      });
      let active = true;
      document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
      return () => { active = false; };
    });
    return () => media.revert();
  }, { scope, dependencies: [enabled, motionKey], revertOnUpdate: true });
}

/** Small, local letter displacement around a fine pointer, like the Home reference. */
export function useHeroLetterMotion(scope: MotionScope) {
  useGSAP((_, contextSafe) => {
    const headline = scope.current?.querySelector<HTMLElement>(".hero-title-line");
    if (!headline) return;
    const letters = Array.from(headline.querySelectorAll<HTMLElement>(".hero-letter"));
    const media = gsap.matchMedia();
    media.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;
      const centers = letters.map(() => ({ x: 0, y: 0 }));
      const offsets = letters.map(() => ({ x: 0, y: 0 }));
      const moveX = letters.map((letter) => gsap.quickTo(letter, "x", { duration: .26, ease: "power3.out" }));
      const moveY = letters.map((letter) => gsap.quickTo(letter, "y", { duration: .26, ease: "power3.out" }));
      const measure = () => {
        letters.forEach((letter, index) => {
          const rect = letter.getBoundingClientRect();
          centers[index].x = rect.left + rect.width / 2 - Number(gsap.getProperty(letter, "x"));
          centers[index].y = rect.top + rect.height / 2 - Number(gsap.getProperty(letter, "y"));
        });
      };
      const render = () => {
        frame = 0;
        letters.forEach((_, index) => {
          const dx = centers[index].x - pointerX;
          const dy = centers[index].y - pointerY;
          const distance = Math.hypot(dx, dy);
          const strength = Math.max(0, 1 - distance / 92) ** 2 * 10;
          const x = distance > 0 ? dx / distance * strength : 0;
          const y = distance > 0 ? dy / distance * strength : 0;
          if (Math.abs(x - offsets[index].x) + Math.abs(y - offsets[index].y) < .15) return;
          offsets[index] = { x, y };
          moveX[index](x);
          moveY[index](y);
        });
      };
      const onMove = (event: PointerEvent) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) frame = requestAnimationFrame(render);
      };
      const settleLetters = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        offsets.forEach((offset) => { offset.x = 0; offset.y = 0; });
        gsap.to(letters, { x: 0, y: 0, duration: .55, ease: "elastic.out(1, 0.55)", overwrite: "auto" });
      };
      const onLeave = contextSafe?.(settleLetters) ?? settleLetters;
      const resize = new ResizeObserver(measure);
      resize.observe(headline);
      document.fonts.ready.then(measure);
      measure();
      headline.addEventListener("pointermove", onMove);
      headline.addEventListener("pointerleave", onLeave);
      headline.addEventListener("pointercancel", onLeave);
      return () => {
        if (frame) cancelAnimationFrame(frame);
        resize.disconnect();
        headline.removeEventListener("pointermove", onMove);
        headline.removeEventListener("pointerleave", onLeave);
        headline.removeEventListener("pointercancel", onLeave);
        gsap.killTweensOf(letters);
        gsap.set(letters, { clearProps: "transform,willChange" });
      };
    }, headline);
    return () => media.revert();
  }, { scope });
}
