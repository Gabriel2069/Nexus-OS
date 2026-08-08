import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthGate } from './components/AuthGate'
import './styles.css'
if ('serviceWorker' in navigator && import.meta.env.PROD) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker registration failed', error)) }) }
createRoot(document.getElementById('root')!).render(<StrictMode><AuthGate><App /></AuthGate></StrictMode>)
