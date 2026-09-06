/** Public Solar Hub origin for staff documents. Prefer CONSUMER_HUB_FRONTEND_URL. */
export function getHubPublicUrlForDocuments(): string {
  const fromEnv = (process.env.CONSUMER_HUB_FRONTEND_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return 'https://rayenna-solar-hub.onrender.com'
}
