export const COOKIE_PREFERENCES_KEY = "alpha-cookie-preferences"
export const MOTION_PREFERENCE_KEY = "alpha-reduced-motion"
const CHANGE_EVENT = "alpha-preferences-change"
const SYSTEM_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export interface SitePreferences {
  reducedMotion: boolean
  rememberPreferences: boolean
}

export const DEFAULT_SITE_PREFERENCES: SitePreferences = {
  reducedMotion: false,
  rememberPreferences: false,
}

let preferences: SitePreferences | undefined

export function getSitePreferences(): SitePreferences {
  if (typeof window === "undefined") return DEFAULT_SITE_PREFERENCES
  if (!preferences) {
    preferences = { ...DEFAULT_SITE_PREFERENCES }
    try {
      const rememberPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY) === "true"
      preferences = { rememberPreferences, reducedMotion: rememberPreferences && localStorage.getItem(MOTION_PREFERENCE_KEY) === "true" }
    } catch { /* Preferences still work for this visit when storage is unavailable. */ }
  }
  return preferences
}

export function getSystemReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(SYSTEM_MOTION_QUERY).matches
}

export function getReducedMotion() {
  return getSitePreferences().reducedMotion || getSystemReducedMotion()
}

function syncMotionAttribute() {
  document.documentElement.dataset.reducedMotion = String(getReducedMotion())
}

export function subscribeToSitePreferences(onChange: () => void) {
  const media = window.matchMedia(SYSTEM_MOTION_QUERY)
  const change = () => { syncMotionAttribute(); onChange() }
  const storage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== COOKIE_PREFERENCES_KEY && event.key !== MOTION_PREFERENCE_KEY) return
    preferences = undefined
    change()
  }
  syncMotionAttribute()
  media.addEventListener("change", change)
  window.addEventListener(CHANGE_EVENT, change)
  window.addEventListener("storage", storage)
  return () => {
    media.removeEventListener("change", change)
    window.removeEventListener(CHANGE_EVENT, change)
    window.removeEventListener("storage", storage)
  }
}

export function updateSitePreferences(update: Partial<SitePreferences>) {
  preferences = { ...getSitePreferences(), ...update }
  try {
    // The consent choice is essential; the optional motion preference is saved only with permission.
    localStorage.setItem(COOKIE_PREFERENCES_KEY, String(preferences.rememberPreferences))
    if (preferences.rememberPreferences) localStorage.setItem(MOTION_PREFERENCE_KEY, String(preferences.reducedMotion))
    else localStorage.removeItem(MOTION_PREFERENCE_KEY)
  } catch { /* A storage restriction must not disable either control. */ }
  syncMotionAttribute()
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Apply the device/saved preference before the first animated frame. */
export const SITE_PREFERENCES_BOOTSTRAP = `(() => {
  let reduced = window.matchMedia('${SYSTEM_MOTION_QUERY}').matches;
  try {
    reduced = reduced || (localStorage.getItem('${COOKIE_PREFERENCES_KEY}') === 'true' && localStorage.getItem('${MOTION_PREFERENCE_KEY}') === 'true');
  } catch {}
  document.documentElement.dataset.reducedMotion = String(reduced);
})();`
