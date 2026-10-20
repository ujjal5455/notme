/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom gives tests a fake browser (document, window) so React can render.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
