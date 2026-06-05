import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../i18n.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import { AppFooter } from '../components/AppFooter.tsx'

const navLinks = [
  { to: '/learn', labelKey: 'nav.learn' },
  { to: '/tools', labelKey: 'nav.tools' },
  { to: '/pricing', labelKey: 'nav.pricing' },
] as const

const statCards = [
  { labelKey: 'landing.hero.stats.fairValue.label', valueKey: 'landing.hero.stats.fairValue.value' },
  { labelKey: 'landing.hero.stats.dca.label', valueKey: 'landing.hero.stats.dca.value' },
  { labelKey: 'landing.hero.stats.fire.label', valueKey: 'landing.hero.stats.fire.value' },
  { labelKey: 'landing.hero.stats.invest.label', valueKey: 'landing.hero.stats.invest.value' },
] as const

const trustedLogos = [
  'landing.trusted.logos.yahoo',
  'landing.trusted.logos.bloomberg',
  'landing.trusted.logos.seekingAlpha',
  'landing.trusted.logos.marketWatch',
  'landing.trusted.logos.investopedia',
] as const

const tools = [
  {
    to: '/tools/invest-calc',
    icon: 'IC',
    titleKey: 'landing.tools.items.investCalc.title',
    descriptionKey: 'landing.tools.items.investCalc.description',
  },
  {
    to: '/tools/fire',
    icon: 'FR',
    titleKey: 'landing.tools.items.fire.title',
    descriptionKey: 'landing.tools.items.fire.description',
  },
  {
    to: '/tools/dca',
    icon: 'DC',
    titleKey: 'landing.tools.items.dca.title',
    descriptionKey: 'landing.tools.items.dca.description',
  },
  {
    to: '/tools/fair-price',
    icon: 'FV',
    titleKey: 'landing.tools.items.fairPrice.title',
    descriptionKey: 'landing.tools.items.fairPrice.description',
  },
  {
    to: '/tools/stock',
    icon: 'ST',
    titleKey: 'landing.tools.items.stock.title',
    descriptionKey: 'landing.tools.items.stock.description',
  },
] as const

const proofItems = ['education', 'transparent', 'privacy'] as const

export const LandingPage = () => {
  const { t, i18n } = useTranslation('common')
  const { user, isAuthenticated, logout } = useAuthStore()
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language

  const handleLanguageChange = (language: string) => {
    void i18n.changeLanguage(language)
  }

  const handleLogout = () => {
    void logout()
  }

  return (
    <main className="min-h-svh bg-background text-text-primary">
      <header className="border-b-[0.5px] border-border">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-5 lg:px-8">
          <Link
            to="/"
            className="font-heading text-2xl font-bold tracking-[0.28em] text-primary"
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
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border-[0.5px] border-border bg-surface-alt p-1">
              {supportedLanguages.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => handleLanguageChange(language)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold uppercase transition ${
                    activeLanguage.startsWith(language)
                      ? 'bg-primary text-background'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  aria-pressed={activeLanguage.startsWith(language)}
                >
                  {language}
                </button>
              ))}
            </div>
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm font-semibold text-text-muted lg:inline">
                  {user?.firstName}
                </span>
                <Link
                  to="/dashboard"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  {t('nav.dashboard')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden rounded-md px-4 py-2 text-sm font-semibold text-text-muted transition hover:text-text-primary sm:inline-flex"
                >
                  {t('buttons.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="hidden rounded-md px-4 py-2 text-sm font-semibold text-text-muted transition hover:text-text-primary sm:inline-flex"
                >
                  {t('buttons.login')}
                </Link>
                <Link
                  to="/auth/register"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  {t('buttons.getStarted')}
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-sm font-semibold uppercase text-primary">{t('landing.hero.kicker')}</p>
          <h1 className="font-heading text-6xl font-bold leading-none text-text-primary md:text-7xl lg:text-8xl">
            <span className="block">{t('landing.hero.headlineLineOne')}</span>
            <span className="block text-primary">{t('landing.hero.headlineLineTwo')}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-text-muted md:text-xl">
            {t('landing.hero.subtext')}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/tools"
              className="inline-flex justify-center rounded-md bg-primary px-6 py-3 text-sm font-bold text-background transition hover:opacity-90"
            >
              {t('landing.hero.primaryCta')}
            </Link>
            <Link
              to="/learn"
              className="inline-flex justify-center rounded-md border-[0.5px] border-border px-6 py-3 text-sm font-bold text-text-primary transition hover:border-border-hover hover:bg-surface"
            >
              {t('landing.hero.secondaryCta')}
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border-[0.5px] border-border bg-surface p-6 shadow-2xl shadow-black/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-text-muted">{t('landing.hero.portfolio.label')}</p>
                <p className="mt-2 text-4xl font-bold text-text-primary">{t('landing.hero.portfolio.value')}</p>
              </div>
              <span className="rounded-full bg-primary-dim px-3 py-1 text-sm font-semibold text-success">
                {t('landing.hero.portfolio.change')}
              </span>
            </div>
            <svg
              className="mt-8 h-28 w-full text-primary"
              viewBox="0 0 420 120"
              role="img"
              aria-label={t('landing.hero.chartLabel')}
            >
              <path
                d="M0 96 C40 70 68 78 98 60 C135 38 162 54 196 42 C235 28 262 38 296 24 C338 7 372 20 420 10"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="4"
              />
              <path
                d="M0 96 C40 70 68 78 98 60 C135 38 162 54 196 42 C235 28 262 38 296 24 C338 7 372 20 420 10 L420 120 L0 120 Z"
                fill="currentColor"
                opacity="0.08"
              />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {statCards.map((card) => (
              <div
                key={card.labelKey}
                className="rounded-lg border-[0.5px] border-border bg-surface-alt p-5"
              >
                <p className="text-sm text-text-muted">{t(card.labelKey)}</p>
                <p className="mt-2 text-2xl font-bold text-primary">{t(card.valueKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y-[0.5px] border-border bg-surface-alt">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-7 lg:flex-row lg:items-center lg:px-8">
          <p className="text-sm font-semibold uppercase text-text-subtle">{t('landing.trusted.label')}</p>
          <div className="grid flex-1 grid-cols-2 gap-4 text-sm font-semibold text-text-muted sm:grid-cols-3 lg:grid-cols-5">
            {trustedLogos.map((logoKey) => (
              <span key={logoKey}>{t(logoKey)}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">{t('landing.tools.kicker')}</p>
            <h2 className="mt-3 font-heading text-4xl font-bold text-text-primary md:text-5xl">
              {t('landing.tools.title')}
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-text-muted">{t('landing.tools.description')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {tools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group rounded-lg border-[0.5px] border-border bg-surface-alt p-5 transition hover:border-border-hover hover:bg-surface"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                  {tool.icon}
                </span>
                <span className="rounded-full border-[0.5px] border-border px-2.5 py-1 text-xs font-semibold text-primary">
                  {t('landing.tools.freeBadge')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary">{t(tool.titleKey)}</h3>
              <p className="mt-3 min-h-20 text-sm leading-6 text-text-muted">{t(tool.descriptionKey)}</p>
              <span className="mt-6 inline-flex text-sm font-bold text-primary transition group-hover:translate-x-1">
                {t('landing.tools.arrow')}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y-[0.5px] border-border bg-surface-alt">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('landing.afterTools.kicker')}
            </p>
            <h2 className="mt-3 font-heading text-4xl font-bold text-text-primary">
              {t('landing.afterTools.title')}
            </h2>
            <p className="mt-4 text-sm leading-6 text-text-muted">
              {t('landing.afterTools.description')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {proofItems.map((item) => (
              <div key={item} className="rounded-lg border-[0.5px] border-border bg-surface p-5">
                <h3 className="text-lg font-bold text-text-primary">
                  {t(`landing.afterTools.items.${item}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {t(`landing.afterTools.items.${item}.text`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  )
}
