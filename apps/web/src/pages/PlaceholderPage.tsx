import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader.tsx'
import { AppFooter } from '../components/AppFooter.tsx'

interface PlaceholderPageProps {
  titleKey: string
  descriptionKey: string
  bannerTitleKey?: string
  bannerDescriptionKey?: string
  bannerEmail?: string
}

export const PlaceholderPage = ({
  titleKey,
  descriptionKey,
  bannerTitleKey,
  bannerDescriptionKey,
  bannerEmail,
}: PlaceholderPageProps) => {
  const { t } = useTranslation('common')
  const showBanner = bannerTitleKey && bannerDescriptionKey && bannerEmail

  return (
    <main className="flex min-h-svh flex-col bg-background text-text-primary">
      <AppHeader />
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-16 pt-10 lg:pt-12">
        <p className="mb-4 text-sm font-semibold uppercase text-primary">{t('pages.placeholder.kicker')}</p>
        <h1 className="font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
          {t(titleKey)}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted">{t(descriptionKey)}</p>
        {showBanner ? (
          <aside className="mt-10 rounded-lg border-[0.5px] border-primary/50 bg-primary-dim p-5">
            <p className="text-sm font-semibold uppercase text-primary">
              {t(bannerTitleKey)}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {t(bannerDescriptionKey)}
            </p>
            <a
              href={`mailto:${bannerEmail}`}
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-bold text-background transition hover:bg-primary-hover"
            >
              {bannerEmail}
            </a>
          </aside>
        ) : null}
      </section>
      <AppFooter />
    </main>
  )
}
