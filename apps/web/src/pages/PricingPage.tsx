import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const stubItems = [
  'tools',
  'account',
  'notice',
] as const

export const PricingPage = () => {
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
            to="/tools"
            className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
          >
            {t('tools.common.allTools')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-primary">{t('pricing.kicker')}</p>
          <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
            {t('pricing.stub.title')}
          </h1>
          <p className="mt-5 text-lg leading-8 text-text-muted">{t('pricing.stub.description')}</p>
        </div>

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
          <p className="text-sm font-semibold uppercase text-primary">{t('pricing.stub.cardKicker')}</p>
          <h2 className="mt-3 text-2xl font-bold text-text-primary">{t('pricing.stub.cardTitle')}</h2>
          <p className="mt-4 text-sm leading-6 text-text-muted">{t('pricing.stub.cardText')}</p>

          <div className="mt-6 grid gap-3">
            {stubItems.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-text-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{t(`pricing.stub.items.${item}`)}</span>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              to="/tools"
              className="inline-flex justify-center rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90"
            >
              {t('pricing.stub.toolsCta')}
            </Link>
            <Link
              to="/learn"
              className="inline-flex justify-center rounded-md border-[0.5px] border-border px-4 py-3 text-sm font-bold text-text-primary transition hover:border-border-hover hover:bg-surface-alt"
            >
              {t('pricing.stub.learnCta')}
            </Link>
          </div>
        </section>
      </section>
    </main>
  )
}
