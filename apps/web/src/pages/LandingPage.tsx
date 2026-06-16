import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppFooter } from '../components/AppFooter.tsx'
import { AppHeader } from '../components/AppHeader.tsx'
import { useAuthStore } from '../store/useAuthStore.ts'

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
    locked: true,
  },
] as const

const proofItems = ['education', 'transparent', 'privacy'] as const
const workflowSteps = [
  { key: 'plan', to: '/tools/invest-calc', highlight: true },
  { key: 'test', to: '/tools/dca', highlight: false },
  { key: 'decide', to: '/tools/stock', highlight: false },
] as const

export const LandingPage = () => {
  const { t } = useTranslation('common')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <main className="min-h-svh bg-background text-text-primary">
      <AppHeader />

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
              to="/tools/invest-calc"
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
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-8 md:grid-cols-3 lg:px-8">
          {workflowSteps.map((step, index) => (
            <Link
              key={step.key}
              to={step.to}
              className={`group rounded-lg border-[0.5px] p-5 transition hover:border-border-hover ${
                step.highlight
                  ? 'border-primary/60 bg-primary-dim'
                  : 'border-border bg-surface'
              }`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                {index + 1}
              </span>
              <p className="mt-4 text-sm font-semibold uppercase text-primary">
                {t(`toolsDirectory.workflow.steps.${step.key}`)}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {t(`toolsDirectory.workflow.${step.key}`)}
              </p>
              <span className="mt-4 inline-flex text-sm font-bold text-primary transition group-hover:translate-x-1">
                {t(`toolsDirectory.workflow.ctas.${step.key}`)}
              </span>
            </Link>
          ))}
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
          {tools.map((tool) => {
            const isLockedForGuest = 'locked' in tool && tool.locked && !isAuthenticated
            const toolPath = isLockedForGuest
              ? `/auth/login?returnTo=${encodeURIComponent(tool.to)}`
              : tool.to

            return (
              <Link
                key={tool.to}
                to={toolPath}
                aria-label={
                  isLockedForGuest
                    ? t('toolsDirectory.lockedOverlay.ariaLabel', { tool: t(tool.titleKey) })
                    : undefined
                }
                className={`group relative overflow-hidden rounded-lg border-[0.5px] bg-surface-alt p-5 transition hover:border-border-hover hover:bg-surface ${
                  isLockedForGuest ? 'border-primary/40' : 'border-border'
                }`}
              >
                <div className={isLockedForGuest ? 'opacity-25 blur-[1px]' : ''}>
                  <div className="mb-6 flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                      {tool.icon}
                    </span>
                    <span className="rounded-full border-[0.5px] border-border px-2.5 py-1 text-xs font-semibold text-primary">
                      {isLockedForGuest
                        ? t('toolsDirectory.registeredOnlyBadge')
                        : 'locked' in tool && tool.locked
                          ? t('toolsDirectory.freeAccountBadge')
                          : t('landing.tools.freeBadge')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{t(tool.titleKey)}</h3>
                  <p className="mt-3 min-h-20 text-sm leading-6 text-text-muted">{t(tool.descriptionKey)}</p>
                  <span className="mt-6 inline-flex text-sm font-bold text-primary transition group-hover:translate-x-1">
                    {isLockedForGuest ? t('toolsDirectory.loginToOpen') : t('landing.tools.arrow')}
                  </span>
                </div>

                {isLockedForGuest ? (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/75 px-5 text-center backdrop-blur-[2px]">
                    <div className="grid justify-items-center gap-2">
                      <span aria-hidden="true" className="relative h-12 w-12 text-primary">
                        <span className="absolute left-1/2 top-1 h-6 w-6 -translate-x-1/2 rounded-full border-[2px] border-primary/70" />
                        <span className="absolute left-1/2 top-7 h-6 w-[2px] -translate-x-1/2 bg-primary/70" />
                        <span className="absolute left-1/2 top-10 h-[2px] w-4 bg-primary/70" />
                        <span className="absolute left-[calc(50%+6px)] top-7 h-[2px] w-3 bg-primary/70" />
                      </span>
                      <p className="text-sm font-bold text-primary">
                        {t('toolsDirectory.lockedOverlay.title')}
                      </p>
                      <p className="text-xs font-semibold leading-5 text-text-primary">
                        {t('toolsDirectory.lockedOverlay.text')}
                      </p>
                    </div>
                  </div>
                ) : null}
              </Link>
            )
          })}
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
