import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './state/AppContext'
import { ThemeProvider } from './state/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { QuranAudioProvider } from './state/QuranAudioContext'
import { QuranLibraryProvider } from './state/QuranLibraryContext'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <QuranLibraryProvider>
            <QuranAudioProvider>
              <AppProvider>
                <App />
              </AppProvider>
            </QuranAudioProvider>
          </QuranLibraryProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
