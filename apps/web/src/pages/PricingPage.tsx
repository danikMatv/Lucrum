import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const plans = [
  {
    key: 'free',
    highlighted: false,
    features: [
      'pricing.plans.free.features.calculators',
      'pricing.plans.free.features.mock',
      'pricing.plans.free.features.education',
    ],
  },
  {
    key: 'pro',
    highlighted: true,
    features: [
      'pricing.plans.pro.features.realtime',
      'pricing.plans.pro.features.saved',
      'pricing.plans.pro.features.watchlist',
      'pricing.plans.pro.features.exports',
    ],
  },
  {
    key: 'founder',
    highlighted: false,
    features: [
      'pricing.plans.founder.features.lifetime',
      'pricing.plans.founder.features.future',
      'pricing.plans.founder.features.priority',
    ],
  },
] as const

const comparisonRows = [
  'pricing.compare.rows.calculators',
  'pricing.compare.rows.marketData',
  'pricing.compare.rows.savedCalculations',
  'pricing.compare.rows.watchlist',
  'pricing.compare.rows.exports',
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

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-primary">{t('pricing.kicker')}</p>
          <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
            {t('pricing.title')}
          </h1>
          <p className="mt-5 text-lg leading-8 text-text-muted">{t('pricing.description')}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <section
              key={plan.key}
              className={`flex min-h-[430px] flex-col rounded-lg border-[0.5px] p-5 ${
                plan.highlighted
                  ? 'border-primary bg-primary-dim'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-primary">
                    {t(`pricing.plans.${plan.key}.eyebrow`)}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-text-primary">
                    {t(`pricing.plans.${plan.key}.name`)}
                  </h2>
                </div>
                {plan.highlighted ? (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-background">
                    {t('pricing.popular')}
                  </span>
                ) : null}
              </div>

              <div className="mt-7">
                <p className="font-heading text-5xl font-bold text-primary">
                  {t(`pricing.plans.${plan.key}.price`)}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {t(`pricing.plans.${plan.key}.period`)}
                </p>
              </div>

              <p className="mt-5 text-sm leading-6 text-text-muted">
                {t(`pricing.plans.${plan.key}.description`)}
              </p>

              <ul className="mt-6 grid gap-3">
                {plan.features.map((featureKey) => (
                  <li key={featureKey} className="flex gap-3 text-sm leading-6 text-text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{t(featureKey)}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.key === 'free' ? '/tools' : '/auth/register'}
                className={`mt-auto inline-flex justify-center rounded-md px-4 py-3 text-sm font-bold transition ${
                  plan.highlighted
                    ? 'bg-primary text-background hover:opacity-90'
                    : 'border-[0.5px] border-border text-text-primary hover:border-border-hover hover:bg-surface-alt'
                }`}
              >
                {t(`pricing.plans.${plan.key}.cta`)}
              </Link>
            </section>
          ))}
        </div>

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">{t('pricing.compare.kicker')}</p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary">{t('pricing.compare.title')}</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-text-muted">{t('pricing.compare.description')}</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-text-subtle">
                <tr className="border-b-[0.5px] border-border">
                  <th className="py-3">{t('pricing.compare.feature')}</th>
                  <th>{t('pricing.plans.free.name')}</th>
                  <th>{t('pricing.plans.pro.name')}</th>
                  <th>{t('pricing.plans.founder.name')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((rowKey) => (
                  <tr key={rowKey} className="border-b-[0.5px] border-border last:border-b-0">
                    <td className="py-4 text-text-primary">{t(`${rowKey}.label`)}</td>
                    <td className="text-text-muted">{t(`${rowKey}.free`)}</td>
                    <td className="font-semibold text-primary">{t(`${rowKey}.pro`)}</td>
                    <td className="text-text-muted">{t(`${rowKey}.founder`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}
