import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LearnResources } from '../components/learn/LearnResources.tsx'
import { getLearnTopic, learnTopics } from '../data/learnTopics.ts'

const sectionKeys = ['what', 'earn', 'risks', 'mistakes', 'fit'] as const

const getToolLabelKey = (path: string) => {
  if (path === '/tools/invest-calc') return 'landing.tools.items.investCalc.title'
  if (path === '/tools/fire') return 'landing.tools.items.fire.title'
  if (path === '/tools/dca') return 'landing.tools.items.dca.title'
  if (path === '/tools/fair-price') return 'landing.tools.items.fairPrice.title'
  return 'landing.tools.items.stock.title'
}

export const LearnTopicPage = () => {
  const { topicId } = useParams()
  const { t } = useTranslation('common')
  const topic = getLearnTopic(topicId)

  if (!topic) {
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
              to="/learn"
              className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
            >
              {t('learnAcademy.topic.back')}
            </Link>
          </nav>
        </header>

        <section className="mx-auto grid max-w-3xl gap-6 px-6 py-16 lg:px-8">
          <p className="text-sm font-semibold uppercase text-primary">
            {t('learnAcademy.notFound.kicker')}
          </p>
          <h1 className="font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
            {t('learnAcademy.notFound.title')}
          </h1>
          <p className="text-lg leading-8 text-text-muted">
            {t('learnAcademy.notFound.description')}
          </p>
          <Link
            to="/learn"
            className="inline-flex w-fit rounded-md bg-primary px-5 py-3 text-sm font-bold text-background transition hover:bg-primary-hover"
          >
            {t('learnAcademy.notFound.cta')}
          </Link>
        </section>
      </main>
    )
  }

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
            to="/learn"
            className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
          >
            {t('learnAcademy.topic.back')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="h-fit rounded-lg border-[0.5px] border-border bg-surface p-5 lg:sticky lg:top-6">
          <p className="text-sm font-semibold uppercase text-primary">
            {t('learnAcademy.topic.contents')}
          </p>
          <nav className="mt-5 grid gap-2">
            {learnTopics.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  item.id === topic.id
                    ? 'bg-primary text-background'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                {t(`learnAcademy.topics.${item.id}.title`)}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="grid min-w-0 gap-8">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
            <p className="text-sm font-semibold uppercase text-primary">
              {t('learnAcademy.topic.kicker')}
            </p>
            <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
              {t(`learnAcademy.topics.${topic.id}.title`)}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-text-muted">
              {t(`learnAcademy.topics.${topic.id}.intro`)}
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {sectionKeys.map((section) => (
              <div
                key={section}
                className="rounded-lg border-[0.5px] border-border bg-surface p-5"
              >
                <h2 className="text-xl font-bold text-text-primary">
                  {t(`learnAcademy.sections.${section}`)}
                </h2>
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {t(`learnAcademy.topics.${topic.id}.sections.${section}`)}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-lg border-[0.5px] border-border bg-surface p-5">
              <h2 className="text-xl font-bold text-text-primary">
                {t('learnAcademy.topic.risks')}
              </h2>
              <ul className="mt-4 grid gap-3">
                {topic.risks.map((risk) => (
                  <li key={risk} className="text-sm leading-6 text-text-muted">
                    {t(`learnAcademy.topics.${topic.id}.risks.${risk}`)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border-[0.5px] border-border bg-surface p-5">
              <h2 className="text-xl font-bold text-text-primary">
                {t('learnAcademy.topic.mistakes')}
              </h2>
              <ul className="mt-4 grid gap-3">
                {topic.mistakes.map((mistake) => (
                  <li key={mistake} className="text-sm leading-6 text-text-muted">
                    {t(`learnAcademy.topics.${topic.id}.mistakes.${mistake}`)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border-[0.5px] border-border bg-surface p-5">
              <h2 className="text-xl font-bold text-text-primary">
                {t('learnAcademy.topic.fit')}
              </h2>
              <ul className="mt-4 grid gap-3">
                {topic.fit.map((fit) => (
                  <li key={fit} className="text-sm leading-6 text-text-muted">
                    {t(`learnAcademy.topics.${topic.id}.fit.${fit}`)}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
            <h2 className="text-xl font-bold text-text-primary">
              {t('learnAcademy.topic.terms')}
            </h2>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              {topic.terms.map((term) => (
                <div key={term} className="border-b-[0.5px] border-border pb-4">
                  <dt className="text-base font-bold text-text-primary">
                    {t(`learnAcademy.topics.${topic.id}.terms.${term}.term`)}
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-text-muted">
                    {t(`learnAcademy.topics.${topic.id}.terms.${term}.definition`)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border-[0.5px] border-border bg-surface p-5">
              <h2 className="text-xl font-bold text-text-primary">
                {t('learnAcademy.topic.tools')}
              </h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {topic.toolLinks.map((toolPath) => (
                  <Link
                    key={toolPath}
                    to={toolPath}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-background transition hover:bg-primary-hover"
                  >
                    {t(getToolLabelKey(toolPath))}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-lg border-[0.5px] border-border bg-surface p-5">
              <h2 className="text-xl font-bold text-text-primary">
                {t('learnAcademy.topic.resources')}
              </h2>
              <div className="mt-5 grid gap-3">
                {topic.resources.map((resource) => (
                  <a
                    key={resource.key}
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border-[0.5px] border-border px-4 py-3 text-sm font-semibold text-text-muted transition hover:border-border-hover hover:text-text-primary"
                  >
                    {t(`learnAcademy.resources.${resource.key}`)}
                  </a>
                ))}
              </div>
            </div>
          </section>

          <LearnResources topic={topic.id} />
        </article>
      </section>
    </main>
  )
}
