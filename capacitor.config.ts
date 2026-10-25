// Capacitor settings: how the web app in dist/ is packaged as the Notme Android app.
// Read by the Capacitor CLI (npx cap sync / add / open), not by the app at run time.
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Android "application id": the app's unique name on a phone. Reverse-domain
  // style. Firebase (Phase 3) is registered with exactly this value.
  appId: 'org.notme.demo',
  // The name under the icon on the home screen.
  appName: 'Notme',
  // Where `npm run build` (Vite) puts the finished web files. `npx cap sync`
  // copies this folder into the Android project.
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      // While Notme is open on screen, don't also post a system notification:
      // the red alarm overlay (src/components/IncomingAlertOverlay.tsx) takes
      // over instead, so the phone doesn't play two alarms at once (onsite E2).
      // In the background or closed, Android shows the alert and rings as usual.
      presentationOptions: [],
    },
  },
}

export default config
