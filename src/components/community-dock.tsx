"use client"

import { useSyncExternalStore } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { ArrowUpRight, Cookie, Film, Pause, X } from "lucide-react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { DEFAULT_SITE_PREFERENCES, getSitePreferences, getSystemReducedMotion, subscribeToSitePreferences, updateSitePreferences } from "@/lib/site-preferences"
import { RECRUITMENT_URL } from "@/lib/recruitment"
import "./community-dock.css"

export default function CommunityDock() {
  const preferences = useSyncExternalStore(subscribeToSitePreferences, getSitePreferences, () => DEFAULT_SITE_PREFERENCES)
  const systemReducedMotion = useSyncExternalStore(subscribeToSitePreferences, getSystemReducedMotion, () => false)
  const reducedMotion = useReducedMotion()

  return <div className="alpha-community-dock" role="group" aria-label="Community and preferences">
    <a href={RECRUITMENT_URL + "/opportunities"} className="alpha-community-invitation">
      <span>Explore open roles</span>
      <span className="alpha-community-arrow" aria-hidden="true"><ArrowUpRight size={20} /></span>
    </a>
    <div className="alpha-dock-preferences">
      <button type="button" className="alpha-dock-control" role="switch" aria-label="Reduced motion" aria-checked={reducedMotion} disabled={systemReducedMotion} title={systemReducedMotion ? "Reduced motion is enabled by your device" : reducedMotion ? "Reduced motion on" : "Turn on reduced motion"} onClick={() => updateSitePreferences({ reducedMotion: !reducedMotion })}>
        {reducedMotion ? <Pause size={16} aria-hidden="true" /> : <Film size={16} aria-hidden="true" />}<span aria-hidden="true">Motion</span>
      </button>
      <Dialog.Root>
        <Dialog.Trigger asChild><button type="button" className="alpha-dock-control" aria-label="Cookie preferences" title="Cookie preferences"><Cookie size={16} aria-hidden="true" /><span aria-hidden="true">Cookies</span></button></Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="alpha-cookie-overlay" />
          <Dialog.Content className="alpha-cookie-popover" data-lenis-prevent>
            <div className="alpha-cookie-top"><Cookie size={24} aria-hidden="true" /><Dialog.Close className="alpha-cookie-close" aria-label="Close cookie preferences"><X size={18} aria-hidden="true" /></Dialog.Close></div>
            <Dialog.Title className="alpha-cookie-title">Cookie preferences</Dialog.Title>
            <Dialog.Description className="alpha-cookie-description">Essential cookies support sign-in. No analytics or advertising cookies are used.</Dialog.Description>
            <div className="alpha-cookie-option"><div><h3>Essential cookies</h3><p>Keep sign-in secure and remember your consent choice.</p></div><span className="alpha-cookie-required">Always on</span></div>
            <div className="alpha-cookie-option"><div><h3>Remember my settings</h3><p>Save your motion choice on this browser using local storage.</p></div><button type="button" className="alpha-cookie-switch" role="switch" aria-checked={preferences.rememberPreferences} aria-label="Remember my settings" onClick={() => updateSitePreferences({ rememberPreferences: !preferences.rememberPreferences })}><span /></button></div>
            <p className="alpha-cookie-note" role="status">{preferences.rememberPreferences ? "You can change these choices here at any time." : "Your motion choice applies to this visit only."}</p>
            <Dialog.Close className="alpha-cookie-done">Done</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  </div>
}
