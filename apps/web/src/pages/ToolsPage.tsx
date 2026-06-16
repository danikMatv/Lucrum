import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppFooter } from '../components/AppFooter.tsx'
import { useAuthStore } from '../store/useAuthStore.ts'

const tools = [
  {
    to: '/tools/invest-calc',
    icon: 'IC',
    titleKey: 'landing.tools.items.investCalc.title',
    descriptionKey: 'landing.tools.items.investCalc.description',
    detailKey: 'toolsDirectory.items.investCalc.detail',
  },
  {
    to: '/tools/fire',
    icon: 'FR',
    titleKey: 'landing.tools.items.fire.title',
    descriptionKey: 'landing.tools.items.fire.description',
    detailKey: 'toolsDirectory.items.fire.detail',
  },
  {
    to: '/tools/dca',
    icon: 'DC',
    titleKey: 'landing.tools.items.dca.title',
    descriptionKey: 'landing.tools.items.dca.description',
    detailKey: 'toolsDirectory.items.dca.detail',
  },
  {
    to: '/tools/fair-price',
    icon: 'FV',
    titleKey: 'landing.tools.items.fairPrice.title',
    descriptionKey: 'landing.tools.items.fairPrice.description',
    detailKey: 'toolsDirectory.items.fairPrice.detail',
  },
  {
    to: '/tools/reverse-dcf',
    icon: 'RD',
    titleKey: 'landing.tools.items.reverseDcf.title',
    descriptionKey: 'landing.tools.items.reverseDcf.description',
    detailKey: 'toolsDirectory.items.reverseDcf.detail',
    locked: true,
  },
  {
    to: '/tools/stock',
    icon: 'ST',
    titleKey: 'landing.tools.items.stock.title',
    descriptionKey: 'landing.tools.items.stock.description',
    detailKey: 'toolsDirectory.items.stock.detail',
  },
] as const

const workflowSteps = [
  { key: 'plan', textKey: 'toolsDirectory.workflow.plan' },
  { key: 'test', textKey: 'toolsDirectory.workflow.test' },
  { key: 'decide', textKey: 'toolsDirectory.workflow.decide' },
] as const

const trustItems = ['beginner', 'assumptions', 'data'] as const
const glossaryTerms = ['cagr', 'pv', 'nominal', 'swr'] as const

export const ToolsPage = () => {
  const { t } = useTranslation('common')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

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
          <Link
            to="/"
            className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
          >
            {t('buttons.backHome')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">{t('toolsDirectory.kicker')}</p>
            <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
              {t('toolsDirectory.title')}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-text-muted">
              {t('toolsDirectory.description')}
            </p>
          </div>
          <div className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm font-semibold uppercase text-primary">{t('toolsDirectory.workflow.title')}</p>
            <div className="mt-4 grid gap-3">
              {workflowSteps.map((step, index) => (
                <div key={step.key} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">
                      {t(`toolsDirectory.workflow.steps.${step.key}`)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text-muted">{t(step.textKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                className={`group relative flex min-h-72 flex-col overflow-hidden rounded-lg border-[0.5px] bg-surface p-5 transition hover:border-border-hover hover:bg-surface-alt ${
                  isLockedForGuest ? 'border-primary/40' : 'border-border'
                }`}
              >
                <div
                  className={`flex flex-1 flex-col ${
                    isLockedForGuest ? 'opacity-25 blur-[1px]' : ''
                  }`}
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                      {tool.icon}
                    </span>
                    <span className="rounded-full border-[0.5px] border-border px-3 py-1 text-xs font-semibold text-primary">
                      {isLockedForGuest
                        ? t('toolsDirectory.registeredOnlyBadge')
                        : 'locked' in tool && tool.locked
                          ? t('toolsDirectory.freeAccountBadge')
                          : t('landing.tools.freeBadge')}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary">{t(tool.titleKey)}</h2>
                  <p className="mt-3 text-sm leading-6 text-text-muted">{t(tool.descriptionKey)}</p>
                  <p className="mt-4 text-sm leading-6 text-text-subtle">{t(tool.detailKey)}</p>
                  <span className="mt-auto pt-6 text-sm font-bold text-primary transition group-hover:translate-x-1">
                    {isLockedForGuest ? t('toolsDirectory.loginToOpen') : t('toolsDirectory.openTool')}
                  </span>
                </div>

                {isLockedForGuest ? (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/75 px-8 text-center backdrop-blur-[2px]">
                    <div className="grid justify-items-center gap-3">
                      <span aria-hidden="true" className="relative h-16 w-16 text-primary">
                        <span className="absolute left-1/2 top-1 h-8 w-8 -translate-x-1/2 rounded-full border-[3px] border-primary/70" />
                        <span className="absolute left-1/2 top-9 h-7 w-[3px] -translate-x-1/2 bg-primary/70" />
                        <span className="absolute left-1/2 top-12 h-[3px] w-5 bg-primary/70" />
                        <span className="absolute left-[calc(50%+7px)] top-9 h-[3px] w-4 bg-primary/70" />
                      </span>
                      <p className="text-lg font-bold text-primary">
                        {t('toolsDirectory.lockedOverlay.title')}
                      </p>
                      <p className="max-w-xs text-sm font-semibold leading-6 text-text-primary">
                        {t('toolsDirectory.lockedOverlay.text')}
                      </p>
                    </div>
                  </div>
                ) : null}
              </Link>
            )
          })}
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('toolsDirectory.academy.kicker')}
            </p>
            <h2 className="mt-3 font-heading text-4xl font-bold text-text-primary">
              {t('toolsDirectory.academy.title')}
            </h2>
            <p className="mt-4 text-sm leading-6 text-text-muted">
              {t('toolsDirectory.academy.description')}
            </p>
            <Link
              to="/learn"
              className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-background transition hover:opacity-90"
            >
              {t('toolsDirectory.academy.cta')}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {trustItems.map((item) => (
              <section key={item} className="rounded-lg border-[0.5px] border-border bg-surface p-5">
                <h3 className="text-lg font-bold text-text-primary">
                  {t(`toolsDirectory.trust.${item}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {t(`toolsDirectory.trust.${item}.text`)}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                {t('toolsDirectory.glossary.kicker')}
              </p>
              <h2 className="mt-3 font-heading text-4xl font-bold text-text-primary">
                {t('toolsDirectory.glossary.title')}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-text-muted">
              {t('toolsDirectory.glossary.description')}
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {glossaryTerms.map((term) => (
              <div key={term} className="rounded-md border-[0.5px] border-border bg-surface-alt p-4">
                <p className="font-bold text-text-primary">
                  {t(`toolsDirectory.glossary.terms.${term}.term`)}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {t(`toolsDirectory.glossary.terms.${term}.definition`)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
      <AppFooter />
    </main>
  )
}
