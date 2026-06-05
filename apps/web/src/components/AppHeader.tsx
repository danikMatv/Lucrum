import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../i18n.ts'
import { localizedPath, type Locale } from '../seo/locales.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

const navLinks = [
  { to: '/learn', labelKey: 'nav.learn' },
  { to: '/tools', labelKey: 'nav.tools' },
  { to: '/pricing', labelKey: 'nav.pricing' },
] as const

interface AppHeaderProps {
  compact?: boolean
}

export const AppHeader = ({ compact = false }: AppHeaderProps) => {
  const { t, i18n } = useTranslation('common')
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language

  const getLanguageHref = (language: Locale) =>
    `${localizedPath(location.pathname, language)}${location.search}${location.hash}`

  const handleLogout = () => {
    void logout()
    setIsMenuOpen(false)
  }

  const authLinks = isAuthenticated ? (
    <>
      <span className="hidden text-sm font-semibold text-text-muted lg:inline">
        {user?.firstName}
      </span>
      <Link
        to="/dashboard"
        onClick={() => setIsMenuOpen(false)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
      >
        {t('nav.dashboard')}
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md px-4 py-2 text-sm font-semibold text-text-muted transition hover:text-text-primary"
      >
        {t('buttons.logout')}
      </button>
    </>
  ) : (
    <>
      <Link
        to="/auth/login"
        onClick={() => setIsMenuOpen(false)}
        className="rounded-md px-4 py-2 text-sm font-semibold text-text-muted transition hover:text-text-primary"
      >
        {t('buttons.login')}
      </Link>
      <Link
        to="/auth/register"
        onClick={() => setIsMenuOpen(false)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
      >
        {t('buttons.getStarted')}
      </Link>
    </>
  )

  return (
    <header className="border-b-[0.5px] border-border">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-5 lg:px-8">
        <Link
          to="/"
          className="font-heading text-2xl font-bold tracking-[0.28em] text-primary"
          onClick={() => setIsMenuOpen(false)}
        >
          {t('brand.name')}
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-text-muted transition hover:text-text-primary"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex rounded-md border-[0.5px] border-border bg-surface-alt p-1">
            {supportedLanguages.map((language) => (
              <a
                key={language}
                href={getLanguageHref(language)}
                className={`rounded px-2.5 py-1 text-xs font-semibold uppercase transition ${
                  activeLanguage.startsWith(language)
                    ? 'bg-primary text-background'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-pressed={activeLanguage.startsWith(language)}
              >
                {language}
              </a>
            ))}
          </div>
          {!compact ? authLinks : null}
        </div>
        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface md:hidden"
          aria-expanded={isMenuOpen}
        >
          {t('buttons.menu')}
        </button>
      </nav>
      {isMenuOpen ? (
        <div className="border-t-[0.5px] border-border px-6 py-5 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md border-[0.5px] border-border px-4 py-3 text-sm font-semibold text-text-primary"
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <div className="flex rounded-md border-[0.5px] border-border bg-surface-alt p-1">
              {supportedLanguages.map((language) => (
                <a
                  key={language}
                  href={getLanguageHref(language)}
                  className={`flex-1 rounded px-2.5 py-2 text-xs font-semibold uppercase transition ${
                    activeLanguage.startsWith(language)
                      ? 'bg-primary text-background'
                      : 'text-text-muted'
                  }`}
                  aria-pressed={activeLanguage.startsWith(language)}
                >
                  {language}
                </a>
              ))}
            </div>
            <div className="grid gap-2">{authLinks}</div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
