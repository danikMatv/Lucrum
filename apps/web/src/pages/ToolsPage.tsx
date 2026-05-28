import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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
    to: '/tools/stock',
    icon: 'ST',
    titleKey: 'landing.tools.items.stock.title',
    descriptionKey: 'landing.tools.items.stock.description',
    detailKey: 'toolsDirectory.items.stock.detail',
  },
] as const

const workflowSteps = [
  'toolsDirectory.workflow.plan',
  'toolsDirectory.workflow.test',
  'toolsDirectory.workflow.decide',
] as const

export const ToolsPage = () => {
  const { t } = useTranslation('common')

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
              {workflowSteps.map((stepKey, index) => (
                <div key={stepKey} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-text-muted">{t(stepKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group flex min-h-72 flex-col rounded-lg border-[0.5px] border-border bg-surface p-5 transition hover:border-border-hover hover:bg-surface-alt"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                  {tool.icon}
                </span>
                <span className="rounded-full border-[0.5px] border-border px-3 py-1 text-xs font-semibold text-primary">
                  {t('landing.tools.freeBadge')}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">{t(tool.titleKey)}</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">{t(tool.descriptionKey)}</p>
              <p className="mt-4 text-sm leading-6 text-text-subtle">{t(tool.detailKey)}</p>
              <span className="mt-auto pt-6 text-sm font-bold text-primary transition group-hover:translate-x-1">
                {t('toolsDirectory.openTool')}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
