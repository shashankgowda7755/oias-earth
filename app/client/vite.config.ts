import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// The REST + GraphQL layers live on the Express server. In dev we proxy
// everything under /api/v1 (and /graphql) to it so the browser keeps a
// same-origin contract and there are no CORS surprises.
// SERVER_ORIGIN can be overridden when the backend runs on another port.
const SERVER_ORIGIN = process.env.SERVER_ORIGIN ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['leaf.svg'],
      manifest: {
        name: 'OIAS Earth — Field',
        short_name: 'BTTH Field',
        description: 'Offline field capture: GPS, photo and visit logging for planters.',
        theme_color: '#16282e',
        background_color: '#16282e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/field',
        scope: '/',
        icons: [
          { src: '/leaf.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/leaf.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Take control immediately on update so a new deploy's assets win on the
        // next load — no "one reload behind" stale-shell window.
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        // Only the field PWA (/field*) is served the precached offline shell.
        // Every admin route is denied the fallback so it always fetches a fresh
        // index.html from the network — this is what stops admin users running a
        // stale JS bundle (and the resulting crashes) after each deploy.
        navigateFallbackDenylist: [/^\/(?!field)/],
        // App shell precached. Runtime-cache the satellite/map tiles + GET APIs
        // so a planter who loaded a forest online can still see it offline.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: ({ url }) =>
              url.host.includes('arcgisonline.com') || url.host.includes('basemaps.cartocdn.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split big shared deps into long-cached vendor chunks so map pages
        // share one Leaflet bundle instead of duplicating it per route chunk.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          'vendor-leaflet': ['leaflet', 'leaflet.markercluster'],
          'vendor-qrcode': ['qrcode'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: SERVER_ORIGIN,
        changeOrigin: true,
      },
      '/graphql': {
        target: SERVER_ORIGIN,
        changeOrigin: true,
      },
    },
  },
});
