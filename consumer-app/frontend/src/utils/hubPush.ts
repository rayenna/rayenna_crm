import axios from '@/utils/axios'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export async function getHubPushConfig(): Promise<{ enabled: boolean; publicKey: string | null }> {
  const { data } = await axios.get<{ enabled: boolean; publicKey: string | null }>(
    '/api/consumer/push/config',
  )
  return data
}

export async function subscribeHubPush(): Promise<'subscribed' | 'denied' | 'unavailable'> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unavailable'
  }
  if (!window.isSecureContext) return 'unavailable'

  const config = await getHubPushConfig()
  if (!config.enabled || !config.publicKey) return 'unavailable'

  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'unavailable'
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey) as BufferSource,
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'unavailable'

  await axios.post('/api/consumer/push/subscriptions', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  })
  return 'subscribed'
}

export async function unsubscribeHubPush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await axios.delete('/api/consumer/push/subscriptions', {
      data: { endpoint: subscription.endpoint },
    })
    await subscription.unsubscribe()
  } catch {
    /* ignore */
  }
}
