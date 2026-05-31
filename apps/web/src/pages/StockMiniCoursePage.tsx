import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { stockMiniCourseLessons } from '../data/stockMiniCourse.ts'

export const StockMiniCoursePage = () => {
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
            to="/learn/stocks"
            className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
          >
            {t('learnAcademy.miniCourse.backToStocks')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="h-fit rounded-lg border-[0.5px] border-border bg-surface p-5 lg:sticky lg:top-6">
          <p className="text-sm font-semibold uppercase text-primary">
            {t('learnAcademy.miniCourse.contents')}
          </p>
          <nav className="mt-5 grid gap-2">
            {stockMiniCourseLessons.map((lesson, index) => (
              <a
                key={lesson}
                href={`#lesson-${lesson}`}
                className="rounded-md px-3 py-2 text-sm font-semibold text-text-muted transition hover:bg-surface-hover hover:text-text-primary"
              >
                <span className="mr-2 text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.title`)}
              </a>
            ))}
          </nav>
        </aside>

        <article className="grid min-w-0 gap-8">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
            <p className="text-sm font-semibold uppercase text-primary">
              {t('learnAcademy.miniCourse.kicker')}
            </p>
            <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
              {t('learnAcademy.miniCourse.title')}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-text-muted">
              {t('learnAcademy.miniCourse.description')}
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-4">
                <p className="text-sm font-semibold uppercase text-primary">
                  {t('learnAcademy.miniCourse.statOneLabel')}
                </p>
                <p className="mt-2 text-2xl font-bold text-text-primary">
                  {t('learnAcademy.miniCourse.statOneValue')}
                </p>
              </div>
              <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-4">
                <p className="text-sm font-semibold uppercase text-primary">
                  {t('learnAcademy.miniCourse.statTwoLabel')}
                </p>
                <p className="mt-2 text-2xl font-bold text-text-primary">
                  {t('learnAcademy.miniCourse.statTwoValue')}
                </p>
              </div>
              <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-4">
                <p className="text-sm font-semibold uppercase text-primary">
                  {t('learnAcademy.miniCourse.statThreeLabel')}
                </p>
                <p className="mt-2 text-2xl font-bold text-text-primary">
                  {t('learnAcademy.miniCourse.statThreeValue')}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            {stockMiniCourseLessons.map((lesson, index) => (
              <details
                key={lesson}
                id={`lesson-${lesson}`}
                className="group scroll-mt-6 rounded-lg border-[0.5px] border-border bg-surface"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 p-5 marker:hidden">
                  <span className="grid gap-2">
                    <span className="text-sm font-semibold uppercase text-primary">
                      {t('learnAcademy.miniCourse.lessonLabel', {
                        number: String(index + 1).padStart(2, '0'),
                      })}
                    </span>
                    <span className="text-2xl font-bold text-text-primary">
                      {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.title`)}
                    </span>
                    <span className="max-w-3xl text-sm leading-6 text-text-muted">
                      {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.text`)}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-[0.5px] border-border text-xl font-bold text-primary transition group-open:rotate-45 group-hover:border-border-hover"
                  >
                    +
                  </span>
                </summary>

                <div className="grid gap-5 border-t-[0.5px] border-border px-5 pb-5 pt-5">
                  <div>
                    <h2 className="text-sm font-semibold uppercase text-primary">
                      {t('learnAcademy.miniCourse.concept')}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-text-muted">
                      {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.details`)}
                    </p>
                  </div>

                  <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-4">
                    <h2 className="text-sm font-semibold uppercase text-primary">
                      {t('learnAcademy.miniCourse.example')}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-text-muted">
                      {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.example`)}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border-[0.5px] border-primary/40 bg-primary-dim p-4">
                      <h2 className="text-sm font-semibold uppercase text-primary">
                        {t('learnAcademy.miniCourse.practice')}
                      </h2>
                      <p className="mt-3 text-sm font-semibold leading-7 text-text-primary">
                        {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.action`)}
                      </p>
                    </div>

                    <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-4">
                      <h2 className="text-sm font-semibold uppercase text-primary">
                        {t('learnAcademy.miniCourse.watchOut')}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-text-muted">
                        {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.warning`)}
                      </p>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </section>

          <section className="rounded-lg border-[0.5px] border-primary/40 bg-primary-dim p-6">
            <h2 className="font-heading text-4xl font-bold text-text-primary">
              {t('learnAcademy.miniCourse.finalTitle')}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
              {t('learnAcademy.miniCourse.finalText')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/tools/stock"
                className="rounded-md bg-primary px-5 py-3 text-sm font-bold text-background transition hover:bg-primary-hover"
              >
                {t('learnAcademy.miniCourse.analyzeTool')}
              </Link>
              <Link
                to="/learn/stocks"
                className="rounded-md border-[0.5px] border-border px-5 py-3 text-sm font-bold text-text-primary transition hover:border-border-hover hover:bg-surface"
              >
                {t('learnAcademy.miniCourse.backToStocks')}
              </Link>
            </div>
          </section>
        </article>
      </section>
    </main>
  )
}
