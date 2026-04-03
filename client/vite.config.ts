import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
// base: '/' required so CSS/JS chunk paths work on hard reload (Fix Help reload losing formatting)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '.'), '')
  let apiOrigin = ''
  try {
    if (env.VITE_API_BASE_URL) {
      apiOrigin = new URL(env.VITE_API_BASE_URL).origin
    }
  } catch {
    /* ignore invalid URL */
  }

  const apiNetworkFirst = {
    handler: 'NetworkFirst' as const,
    options: {
      cacheName: 'backend-api',
      networkTimeoutSeconds: 15,
      expiration: {
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24,
      },
      cacheableResponse: {
        statuses: [0, 200] as number[],
      },
    },
  }

  const runtimeCaching = [
    {
      urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
      ...apiNetworkFirst,
    },
    ...(apiOrigin
      ? [
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.origin === apiOrigin && url.pathname.startsWith('/api/'),
            ...apiNetworkFirst,
          },
        ]
      : []),
    {
      urlPattern: ({ url }: { url: URL }) =>
        url.hostname.includes('render.com') || url.hostname.includes('onrender.com'),
      ...apiNetworkFirst,
    },
    {
      urlPattern: ({ url }: { url: URL }) =>
        url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
      handler: 'CacheFirst' as const,
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst' as const,
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
  ]

  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.ico', 'robots.txt', 'offline.html', 'manifest.json', 'icons/*.png', 'rayenna_logo.jpg'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}'],
          runtimeCaching,
          navigateFallback: '/offline.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    optimizeDeps: {
      include: ['react-markdown'],
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
