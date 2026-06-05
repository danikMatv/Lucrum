import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppFooter } from '../components/AppFooter.tsx'

export const NotFoundPage = () => {
  const { t } = useTranslation('common')

  return (
    <main className="flex min-h-svh flex-col bg-background text-text-primary">
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
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-20 lg:px-8">
        <p className="text-sm font-semibold uppercase text-primary">{t('notFound.kicker')}</p>
        <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
          {t('notFound.title')}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-text-muted">
          {t('notFound.description')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/tools"
            className="inline-flex justify-center rounded-md bg-primary px-5 py-3 text-sm font-bold text-background transition hover:opacity-90"
          >
            {t('notFound.toolsCta')}
          </Link>
          <Link
            to="/learn"
            className="inline-flex justify-center rounded-md border-[0.5px] border-border px-5 py-3 text-sm font-bold text-text-primary transition hover:border-border-hover hover:bg-surface"
          >
            {t('notFound.learnCta')}
          </Link>
        </div>
      </section>
      <AppFooter />
    </main>
  )
}
