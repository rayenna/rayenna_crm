export type HubHandoverPhone = 'android' | 'iphone'

export function getSolarHubPublicUrl(): string {
  const fromEnv = String(import.meta.env.VITE_SOLAR_HUB_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return 'http://localhost:5175'
  return ''
}

export function hubUrlForCopy(hubUrl: string): string {
  return hubUrl || '(Solar Hub URL — set VITE_SOLAR_HUB_URL on the CRM frontend)'
}

export function buildHubHandoverChecklist(opts: {
  hubUrl: string
  username?: string | null
  phone: HubHandoverPhone
}): string {
  const url = hubUrlForCopy(opts.hubUrl)
  const username = opts.username?.trim() || '(username on this project card)'
  const install =
    opts.phone === 'iphone'
      ? [
          '7. Stay in Safari (not Chrome, not WhatsApp). Tap Share, then Add to Home Screen, then Add.',
          '8. Close Safari. Open the Rayenna Solar Hub icon from the home screen.',
        ]
      : [
          '7. In Chrome, tap the gold Add to Home Screen banner, or the menu (⋮) → Install app / Add to Home screen.',
          '8. Close Chrome. Open the Rayenna Solar Hub icon from the home screen.',
        ]

  const browser =
    opts.phone === 'iphone'
      ? '3. On their phone, open Safari — not WhatsApp, Instagram, or Chrome.'
      : '3. On their phone, open Chrome — not WhatsApp or Instagram in-app browser.'

  return [
    'Rayenna Solar Hub — install on the customer phone',
    '',
    'Before you start',
    '1. Open this project in CRM. Confirm a Hub username exists. If not, Ops/Admin: Create Hub account.',
    '2. If Last login is Never, Admin resets a one-time password. Do not send the password in a group chat.',
    '',
    'On their phone (you talk, they tap)',
    browser,
    `4. Go to ${url}`,
    `5. Sign in with username ${username} (not email). Leave Stay signed in on.`,
    '6. If Hub asks them to change password, they choose one they will remember. You do not need to keep it.',
    ...install,
    '9. Show Home (their plant) and Support (help / chat). Done when the icon is on the home screen and opens without typing the URL.',
    '',
    'Do not',
    '- Log them into Rayenna CRM (this is Solar Hub, a different app).',
    '- Promise it is in the Play Store or App Store.',
    '- Leave only a paper PDF without adding the home-screen icon.',
  ].join('\n')
}

export function buildHubCustomerWhatsApp(opts: {
  hubUrl: string
  username?: string | null
}): string {
  const url = hubUrlForCopy(opts.hubUrl)
  const usernameLine = opts.username?.trim()
    ? `Username: ${opts.username.trim()}`
    : 'Username: our team will show you on site'
  return [
    'Rayenna Solar Hub is your home solar app (not in the Play Store / App Store).',
    `Open: ${url}`,
    usernameLine,
    'We will sign you in on your phone and add it to the home screen so you can open it like any other app.',
  ].join('\n')
}

export function buildHubStaffCredentialsCopy(opts: {
  hubUrl: string
  username: string
  password: string
}): string {
  const url = hubUrlForCopy(opts.hubUrl)
  return [
    'Rayenna Solar Hub login (one-time — customer should change password after sign-in)',
    `Open: ${url}`,
    `Username: ${opts.username}`,
    `Password: ${opts.password}`,
  ].join('\n')
}
