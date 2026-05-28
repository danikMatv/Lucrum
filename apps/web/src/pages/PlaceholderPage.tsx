import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface PlaceholderPageProps {
  titleKey: string
  descriptionKey: string
}

export const PlaceholderPage = ({ titleKey, descriptionKey }: PlaceholderPageProps) => {
  const { t } = useTranslation('common')

  return (
    <main className="flex min-h-svh flex-col bg-background px-6 py-8 text-text-primary">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link
          to="/"
          className="font-heading text-2xl font-bold tracking-[0.28em] text-primary"
        >
          {t('brand.name')}
        </Link>
        <Link
          to="/"
          className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border-hover hover:bg-surface"
        >
          {t('buttons.backHome')}
        </Link>
      </nav>
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-24">
        <p className="mb-4 text-sm font-semibold uppercase text-primary">{t('pages.placeholder.kicker')}</p>
        <h1 className="font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
          {t(titleKey)}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted">{t(descriptionKey)}</p>
      </section>
    </main>
  )
}
