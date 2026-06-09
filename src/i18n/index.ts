import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import he from './he.json'

export const LANG_STORAGE_KEY = 'enroll-lang'
export type Lang = 'en' | 'he'

const stored = localStorage.getItem(LANG_STORAGE_KEY)
const initialLang: Lang = stored === 'he' ? 'he' : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: initialLang,
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
})

function applyDirection(lng: string) {
  const isRtl = lng === 'he'
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
  document.documentElement.lang = isRtl ? 'he' : 'en'
}

applyDirection(initialLang)
i18n.on('languageChanged', applyDirection)

export default i18n
