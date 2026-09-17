import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/planillas-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // App is a HashRouter SPA served from GitHub Pages under /planillas-app/,
      // so all routes resolve to the same index.html and the service worker
      // must never intercept navigation with anything else.
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'EduPlan Pro',
        short_name: 'EduPlan Pro',
        description: 'Gestor de planificaciones docentes de TecnoKids',
        start_url: '/planillas-app/',
        scope: '/planillas-app/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#39B0C4',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Hash routing means every "route" is the same document (index.html)
        // with a different #/fragment, so the SW must always fall back to it
        // instead of trying to match a real path on the server.
        navigateFallback: '/planillas-app/index.html',
        navigateFallbackDenylist: [/^\/planillas-app\/(?:api|assets)\//],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
