"use client";

import { useEffect } from "react";

/** Presentation navigation never abandons a staff/member command in flight. */
export function useAdminNavigationGuard(dirty: boolean, pending: boolean) {
  useEffect(() => {
    if (!dirty && !pending) return;
    const before = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || link.href === window.location.href) return;
      if (pending || !window.confirm("Leave and discard your unfinished administration changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", before); document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", before); document.removeEventListener("click", leave, true); };
  }, [dirty, pending]);
}
