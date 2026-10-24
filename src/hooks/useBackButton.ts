import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'

/**
 * The phone's Back button, inside the Android app (onsite, Phase 2).
 *
 * Notme switches screens with React state, not browser history, so by default
 * Android's Back closed the whole app from any screen. With this hook, Back
 * calls `onBack` first. `onBack` returns true if it handled Back (for example,
 * it went to the home screen). If it returns false (already on the home
 * screen), the app is minimised, like pressing Home: it keeps running and the
 * person stays signed in.
 *
 * In a normal browser this does nothing, and the browser's own Back applies.
 */
export function useBackButton(onBack: () => boolean) {
  // Always call the newest onBack, which knows the current screen, without
  // re-registering the listener on every redraw.
  const latestOnBack = useRef(onBack)
  useEffect(() => {
    latestOnBack.current = onBack
  })

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    // Registering a listener turns off Android's default "close the app" Back.
    const listener = App.addListener('backButton', () => {
      if (!latestOnBack.current()) void App.minimizeApp()
    })
    // Remove it when this screen goes away (e.g. after signing out).
    return () => {
      void listener.then((handle) => handle.remove())
    }
  }, [])
}
