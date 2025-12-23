import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { AuditProvider } from './ui/contexts/AuditContext'
import { ThemeProvider } from './ui/contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ModelStatusProvider } from './ui/contexts/ModelStatusContext'

// Load React Grab in development only
if (import.meta.env.DEV) {
  import("react-grab");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AuditProvider>
              <ModelStatusProvider>
                <App />
              </ModelStatusProvider>
            </AuditProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
