import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAmplify } from './lib/amplifyClient'

// Resolves before render so isAmplifyLive() is settled by the time
// AuthProvider/CircleProvider read it during their initial render.
await initAmplify()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
