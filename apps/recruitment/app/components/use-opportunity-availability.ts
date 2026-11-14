"use client";
import { useEffect, useState } from "react";
import { isAvailability, type Availability } from "@/lib/opportunity-availability";
import { recruitmentPath } from "@/lib/site-paths";

export function useOpportunityAvailability() {
  const [data, setData] = useState<Availability | null>(null);
  useEffect(() => {
    let current: AbortController | undefined;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      current?.abort();
      const controller = new AbortController(); current = controller;
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(recruitmentPath("/api/opportunities"), { cache: "no-store", signal: controller.signal });
        const value: unknown = response.ok ? await response.json() : null;
        if (active && current === controller) setData(isAvailability(value) ? value : null);
      } catch { if (active && current === controller) setData(null); }
      finally { clearTimeout(timer); }
    };
    void refresh();
    const listener = () => { void refresh(); };
    window.addEventListener("focus", listener); document.addEventListener("visibilitychange", listener);
    return () => { active = false; current?.abort(); window.removeEventListener("focus", listener); document.removeEventListener("visibilitychange", listener); };
  }, []);
  return data;
}
