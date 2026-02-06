import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Connect } from 'vite'

// Custom plugin to serve legacy folder correctly
function legacyFolderPlugin() {
  return {
    name: 'legacy-folder-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: Connect.IncomingMessage, _res: any, next: () => void) => {
        // Redirect /legacy/ to /legacy/index.html
        if (req.url === '/legacy' || req.url === '/legacy/') {
          req.url = '/legacy/index.html'
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5175, // Use a different port to avoid conflicts
  },
  plugins: [
    legacyFolderPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'Pulsar Songbook',
        short_name: 'Songbook',
        description: 'Offline-first ChordPro songbook with auto-scroll',
        theme_color: '#dc3545',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB (Firebase bundle is ~2.2 MB)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
