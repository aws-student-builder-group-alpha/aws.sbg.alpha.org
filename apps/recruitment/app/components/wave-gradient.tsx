"use client";

import { useEffect, useRef } from "react";

const waves = [
  { frequency: .003, speed: .4, inner: [40, 30, 160], outer: [255, 100, 0], phase: 0, mouseInfluence: .3 },
  { frequency: .004, speed: .3, inner: [50, 40, 190], outer: [255, 60, 10], phase: 2, mouseInfluence: .5 },
  { frequency: .005, speed: .5, inner: [60, 50, 200], outer: [255, 140, 0], phase: 4, mouseInfluence: .7 },
  { frequency: .006, speed: .35, inner: [80, 30, 180], outer: [200, 60, 40], phase: 1.5, mouseInfluence: .4 },
] as const;

export function WaveGradient({ hostSelector = ".brand-hero", className = "hero-gradient", pointerResponse = true, light = false, backgroundColor, speed = 1.2 }: { hostSelector?: string; className?: string; pointerResponse?: boolean; light?: boolean; backgroundColor?: string; speed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.closest<HTMLElement>(hostSelector);
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !hero || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const pointer = { x: .5, y: .8, active: false };
    let width = 0;
    let height = 0;
    let time = 0;
    let lastFrame = 0;
    let frame = 0;
    let visible = true;

    const draw = () => {
      context.globalCompositeOperation = "source-over";
      context.fillStyle = backgroundColor ?? (light ? "#fbfaf8" : "#000");
      context.fillRect(0, 0, width, height);

      waves.forEach((wave, index) => {
        const baseY = height * (.7 + .06 * index);
        const amplitude = height * (.08 + .015 * index);
        const mousePhase = pointer.active ? (pointer.x - .5) * 200 * wave.mouseInfluence : 0;
        const mouseLift = pointer.active ? -((pointer.y - .5) * 40) * wave.mouseInfluence : 0;
        context.beginPath();
        context.moveTo(0, height);
        for (let x = 0; x <= width + 4; x += 4) {
          const a = Math.sin(x * wave.frequency + time * wave.speed + wave.phase + .003 * mousePhase);
          const b = .5 * Math.sin(x * wave.frequency * 2.3 + time * wave.speed * .7 + 1.5 * wave.phase);
          const c = .35 * Math.sin(x * wave.frequency * .6 + time * wave.speed * 1.3 + .8 * wave.phase);
          const distance = Math.abs(x / width - pointer.x);
          const lift = pointer.active ? Math.exp(-distance * distance * 12) * mouseLift : 0;
          context.lineTo(x, baseY + (a + b + c) * amplitude + lift);
        }
        context.lineTo(width, height);
        context.closePath();

        const [ir, ig, ib] = wave.inner;
        const [or, og, ob] = wave.outer;
        const gradient = context.createLinearGradient(0, baseY - 2 * amplitude, 0, height);
        gradient.addColorStop(0, `rgba(${or},${og},${ob},0)`);
        gradient.addColorStop(.15, `rgba(${or},${og},${ob},.7)`);
        gradient.addColorStop(.35, `rgb(${or},${og},${ob})`);
        gradient.addColorStop(.55, `rgb(${Math.round((ir + or) / 2)},${Math.round((ig + og) / 2)},${Math.round((ib + ob) / 2)})`);
        gradient.addColorStop(.8, `rgb(${ir},${ig},${ib})`);
        gradient.addColorStop(1, `rgb(${ir},${ig},${ib})`);
        context.globalCompositeOperation = light ? "multiply" : "screen";
        context.fillStyle = gradient;
        context.fill();
      });
    };

    const tick = (now: number) => {
      frame = 0;
      const interval = 1000 / (coarsePointer.matches ? 30 : 60);
      if (!lastFrame || now - lastFrame >= interval - 1) {
        if (lastFrame) time += Math.min((now - lastFrame) / 1000, .1) * speed;
        lastFrame = now;
        draw();
      }
      if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      if (!width || !height) return;
      if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
      else draw();
    };
    const resize = () => {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1.25 : 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    };
    const move = (event: PointerEvent) => {
      if (motion.matches) return;
      const rect = hero.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
      pointer.active = true;
    };
    const leave = () => { pointer.active = false; };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    resizeObserver.observe(hero);
    visibilityObserver.observe(hero);
    if (pointerResponse) { hero.addEventListener("pointermove", move); hero.addEventListener("pointerleave", leave); }
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    coarsePointer.addEventListener("change", resize);
    resize();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      coarsePointer.removeEventListener("change", resize);
    };
  }, [hostSelector, pointerResponse, light, backgroundColor, speed]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
