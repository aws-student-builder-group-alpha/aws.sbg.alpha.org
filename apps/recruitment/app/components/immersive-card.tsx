"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

/** Decorative depth only. Links and content remain ordinary document elements. */
export function ImmersiveCard({
  as: Tag = "article", children, className = "", id, labelledBy,
}: {
  as?: "article" | "aside";
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  const card = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const enabled = useRef(false);

  function reset() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const node = card.current;
    if (!node) return;
    for (const property of ["--card-rx", "--card-ry", "--glare-x", "--glare-y"]) node.style.removeProperty(property);
  }

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      enabled.current = media.matches;
      if (!media.matches) reset();
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  function move(event: PointerEvent<HTMLElement>) {
    if (!enabled.current || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = card.current;
      if (!node) return;
      node.style.setProperty("--card-rx", `${(0.5 - y) * 7}deg`);
      node.style.setProperty("--card-ry", `${(x - 0.5) * 9}deg`);
      node.style.setProperty("--glare-x", `${x * 100}%`);
      node.style.setProperty("--glare-y", `${y * 100}%`);
    });
  }

  return <Tag ref={card} id={id} aria-labelledby={labelledBy} className={`immersive-card ${className}`} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>{children}</Tag>;
}
