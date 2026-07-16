// Must be the first import: enroll-core is a single bundled module, so any
// other import below that transitively touches @vitskyds/enroll-core (e.g.
// CurrencyProvider -> useBusiness -> AuthContext) would otherwise evaluate
// that bundle's side-effecting i18n init first, before this file gets a
// chance to force localStorage to 'he'.
import './i18n/force-he'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { CurrencyProvider } from './contexts/CurrencyContext'
import './index.css'
import i18n from './i18n'
import AppAdmin from './AppAdmin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <CurrencyProvider>
          <AppAdmin />
        </CurrencyProvider>
      </BrowserRouter>
    </I18nextProvider>
  </StrictMode>,
)
