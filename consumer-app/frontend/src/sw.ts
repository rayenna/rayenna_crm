/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown }

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST as Parameters<typeof precacheAndRoute>[0])

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/],
  }),
)

self.addEventListener('push', (event) => {
  let title = 'Rayenna Solar Hub'
  let body = ''
  let url = '/'
  try {
    const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined
    if (data?.title) title = data.title
    if (data?.body) body = data.body
    if (data?.url) url = data.url
  } catch {
    body = event.data?.text() || ''
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/Rayenna_Hub.png',
      badge: '/Rayenna_Hub.png',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data as { url?: string } | undefined)?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.focus()
          if ('navigate' in client && target) void (client as WindowClient).navigate(target)
          return
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
