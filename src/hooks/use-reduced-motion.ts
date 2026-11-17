"use client"

import { useSyncExternalStore } from "react"
import { getReducedMotion, subscribeToSitePreferences } from "@/lib/site-preferences"

export function useReducedMotion() {
  return useSyncExternalStore(subscribeToSitePreferences, getReducedMotion, () => true)
}
