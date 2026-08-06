import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.js'
import App from './App.jsx'
import { startBlackHoleBackground } from './background/performanceBridge.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Three.js background replaced by video.mov background
// const stopBlackHoleBackground = startBlackHoleBackground()

// if (import.meta.hot) {
//   import.meta.hot.dispose(stopBlackHoleBackground)
// }
