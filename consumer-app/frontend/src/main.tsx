import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/zenith.css'
import './index.css'

registerSW({
  onNeedRefresh() {
    console.log('Solar Hub update available')
  },
  onRegistered(swRegistration) {
    void swRegistration?.update()
  },
  onRegisterError(error) {
    console.error('Solar Hub service worker registration failed:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
