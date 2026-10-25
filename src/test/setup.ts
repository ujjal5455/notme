// Runs before every test file (configured in vite.config.ts).
import '@testing-library/jest-dom/vitest' // adds matchers like toBeInTheDocument()
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom (the fake browser used by tests) has no real scrolling, so give it a no-op.
// Some tests run in plain Node instead (e.g. the Edge Function helpers), where
// there is no window at all.
if (typeof window !== 'undefined') window.scrollTo = () => {}

// Remove whatever the previous test rendered so tests do not affect each other.
afterEach(() => {
  cleanup()
})
