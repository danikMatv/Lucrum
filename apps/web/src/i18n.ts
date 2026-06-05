import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'
import frCommon from './locales/fr/common.json'
import ukCommon from './locales/uk/common.json'
import { defaultLocale, supportedLocales } from './seo/locales.ts'

export const supportedLanguages = supportedLocales

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
      },
      fr: {
        common: frCommon,
      },
      uk: {
        common: ukCommon,
      },
    },
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    defaultNS: 'common',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
