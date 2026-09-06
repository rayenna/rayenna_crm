import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/zenith.css'
import './index.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true)
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    void registration.update()
    window.setInterval(() => void registration.update(), 60 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void registration.update()
    }
    document.addEventListener('visibilitychange', onVisible)
  },
  onRegisterError(error) {
    console.error('Solar Hub service worker registration failed:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
