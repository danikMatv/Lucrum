import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const guideCards = [
  {
    key: 'compound',
    toolPath: '/tools/invest-calc',
  },
  {
    key: 'dca',
    toolPath: '/tools/dca',
  },
  {
    key: 'valuation',
    toolPath: '/tools/fair-price',
  },
] as const

const faqItems = [
  'start',
  'dca',
  'fire',
  'fairPrice',
  'risk',
  'data',
] as const

export const LearnPage = () => {
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
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">{t('learn.kicker')}</p>
            <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
              {t('learn.title')}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-text-muted">
              {t('learn.description')}
            </p>
          </div>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm font-semibold uppercase text-primary">{t('learn.rule.title')}</p>
            <p className="mt-4 text-sm leading-6 text-text-muted">{t('learn.rule.text')}</p>
          </section>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {guideCards.map((card, index) => (
            <section key={card.key} className="rounded-lg border-[0.5px] border-border bg-surface p-5">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                {index + 1}
              </span>
              <h2 className="mt-5 text-xl font-bold text-text-primary">
                {t(`learn.cards.${card.key}.title`)}
              </h2>
              <p className="mt-3 min-h-24 text-sm leading-6 text-text-muted">
                {t(`learn.cards.${card.key}.text`)}
              </p>
              <Link
                to={card.toolPath}
                className="mt-5 inline-flex text-sm font-bold text-primary transition hover:translate-x-1"
              >
                {t(`learn.cards.${card.key}.cta`)}
              </Link>
            </section>
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">{t('learn.faq.kicker')}</p>
            <h2 className="mt-3 font-heading text-4xl font-bold text-text-primary">
              {t('learn.faq.title')}
            </h2>
            <p className="mt-4 text-sm leading-6 text-text-muted">{t('learn.faq.description')}</p>
          </div>

          <div className="grid gap-3">
            {faqItems.map((item) => (
              <details
                key={item}
                className="group rounded-lg border-[0.5px] border-border bg-surface p-5"
              >
                <summary className="cursor-pointer list-none text-base font-bold text-text-primary">
                  <span className="inline-flex w-full items-center justify-between gap-4">
                    {t(`learn.faq.items.${item}.question`)}
                    <span className="text-primary transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-6 text-text-muted">
                  {t(`learn.faq.items.${item}.answer`)}
                </p>
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
