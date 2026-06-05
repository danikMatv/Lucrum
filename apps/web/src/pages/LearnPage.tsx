import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { learnTopics } from '../data/learnTopics.ts'
import { AppFooter } from '../components/AppFooter.tsx'

const learningPrinciples = ['goal', 'risk', 'time'] as const

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
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('learnAcademy.kicker')}
            </p>
            <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
              {t('learnAcademy.title')}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-text-muted">
              {t('learnAcademy.description')}
            </p>
          </div>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm font-semibold uppercase text-primary">
              {t('learnAcademy.note.title')}
            </p>
            <p className="mt-4 text-sm leading-6 text-text-muted">
              {t('learnAcademy.note.text')}
            </p>
          </section>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {learningPrinciples.map((principle, index) => (
            <div
              key={principle}
              className="rounded-lg border-[0.5px] border-border bg-surface p-5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                {index + 1}
              </span>
              <h2 className="mt-5 text-xl font-bold text-text-primary">
                {t(`learnAcademy.principles.${principle}.title`)}
              </h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                {t(`learnAcademy.principles.${principle}.text`)}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('learnAcademy.catalog.kicker')}
            </p>
            <h2 className="mt-3 font-heading text-4xl font-bold text-text-primary">
              {t('learnAcademy.catalog.title')}
            </h2>
            <p className="mt-4 text-sm leading-6 text-text-muted">
              {t('learnAcademy.catalog.description')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {learnTopics.map((topic) => (
              <Link
                key={topic.id}
                to={topic.path}
                className="group flex min-h-72 flex-col rounded-lg border-[0.5px] border-border bg-surface p-5 transition hover:border-border-hover hover:bg-surface-hover"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-md bg-primary-dim text-sm font-bold text-primary">
                    {topic.accent}
                  </span>
                  <span className="rounded-full border-[0.5px] border-border px-3 py-1 text-xs font-semibold text-primary">
                    {t(`learnAcademy.topics.${topic.id}.level`)}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-text-primary">
                  {t(`learnAcademy.topics.${topic.id}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {t(`learnAcademy.topics.${topic.id}.summary`)}
                </p>
                <p className="mt-4 text-sm leading-6 text-text-subtle">
                  {t(`learnAcademy.topics.${topic.id}.why`)}
                </p>
                <span className="mt-auto pt-6 text-sm font-bold text-primary transition group-hover:translate-x-1">
                  {t('learnAcademy.catalog.open')}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
      <AppFooter />
    </main>
  )
}
