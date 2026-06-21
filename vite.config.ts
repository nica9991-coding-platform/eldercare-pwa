import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // esnext: main.tsx top-level-awaits initAmplify() before first render.
  build: { target: 'esnext' },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Kindred — Eldercare Coordination',
        short_name: 'Kindred',
        description: 'Care Circle medication coordination for families and caregivers.',
        theme_color: '#2C7A7B',
        background_color: '#FAF8F5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
