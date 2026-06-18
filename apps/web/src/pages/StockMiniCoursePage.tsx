import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { LessonQuiz, type LessonQuizQuestion } from '../components/learn/LessonQuiz.tsx'
import {
  AssetAllocationDonut,
  CompoundGrowthChart,
  RiskProfileScale,
  ValuationGauge,
} from '../components/learn/illustrations'
import { stockMiniCourseLessons } from '../data/stockMiniCourse.ts'
import { useLessonProgress } from '../hooks/useLessonProgress.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

const isQuizQuestion = (value: unknown): value is LessonQuizQuestion => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as {
    question?: unknown
    options?: unknown
    correctIndex?: unknown
    explanation?: unknown
  }

  return (
    typeof candidate.question === 'string' &&
    Array.isArray(candidate.options) &&
    candidate.options.every((option) => typeof option === 'string') &&
    typeof candidate.correctIndex === 'number' &&
    typeof candidate.explanation === 'string'
  )
}

const getQuizQuestions = (value: unknown) =>
  Array.isArray(value) ? value.filter(isQuizQuestion) : []

const lessonIllustrations: Partial<Record<(typeof stockMiniCourseLessons)[number], ReactNode>> = {
  riskProfile: <RiskProfileScale />,
  assetMap: <AssetAllocationDonut />,
  compound: <CompoundGrowthChart />,
  valuation: <ValuationGauge />,
}

export const StockMiniCoursePage = () => {
  const { t } = useTranslation('common')
  const { isAuthenticated, isLoading } = useAuthStore()
  const { progress, completedCount, isSyncing, markLessonComplete } = useLessonProgress('stocks')
  const totalLessons = stockMiniCourseLessons.length
  const progressPercent = Math.round((completedCount / totalLessons) * 100)

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

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-lg border-[0.5px] border-border bg-surface p-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase text-primary">
              {t('learnAcademy.miniCourse.contents')}
            </p>
            <p className="text-xs font-semibold text-text-muted">
              {t('learnAcademy.progress.short', { completed: completedCount, total: totalLessons })}
            </p>
          </div>
          <nav className="mt-5 grid gap-2">
            {stockMiniCourseLessons.map((lesson, index) => {
              const isComplete = progress[lesson]?.completed

              return (
                <a
                  key={lesson}
                  href={`#lesson-${lesson}`}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-surface-hover hover:text-text-primary ${
                    isComplete ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  <span className="mr-2 text-primary">
                    {isComplete ? t('learnAcademy.progress.doneMark') : String(index + 1).padStart(2, '0')}
                  </span>
                  {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.title`)}
                </a>
              )
            })}
          </nav>
        </aside>

        <article className="grid min-w-0 gap-8">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-7 md:p-8">
            <p className="text-sm font-semibold uppercase text-primary">
              {t('learnAcademy.miniCourse.kicker')}
            </p>
            <h1 className="mt-4 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
              {t('learnAcademy.miniCourse.title')}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-text-muted">
              {t('learnAcademy.miniCourse.description')}
            </p>

            <div className="mt-8 rounded-lg border-[0.5px] border-border bg-background/40 p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <p className="text-sm font-semibold text-text-primary">
                  {t('learnAcademy.progress.title', {
                    completed: completedCount,
                    total: totalLessons,
                  })}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {isSyncing ? t('learnAcademy.progress.syncing') : `${progressPercent}%`}
                </p>
              </div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full accent-primary"
                value={completedCount}
                max={totalLessons}
                aria-label={t('learnAcademy.progress.ariaLabel')}
              />
            </div>

            {!isAuthenticated && !isLoading ? (
              <div className="mt-5 rounded-lg border-[0.5px] border-primary/40 bg-primary-dim p-4">
                <p className="text-sm font-semibold leading-6 text-text-primary">
                  {t('learnAcademy.progress.guestBanner')}
                </p>
              </div>
            ) : null}

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

          <section className="grid gap-5">
            {stockMiniCourseLessons.map((lesson, index) => {
              const lessonProgress = progress[lesson]
              const isComplete = lessonProgress?.completed
              const quizQuestions = getQuizQuestions(
                t(`learnAcademy.topics.stocks.miniCourse.${lesson}.quiz`, {
                  returnObjects: true,
                }),
              )
              const illustration = lessonIllustrations[lesson]

              return (
                <details
                  key={lesson}
                  id={`lesson-${lesson}`}
                  className="group scroll-mt-6 rounded-lg border-[0.5px] border-border bg-surface"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 p-6 marker:hidden md:p-7">
                    <span className="grid gap-2">
                      <span className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase text-primary">
                        {t('learnAcademy.miniCourse.lessonLabel', {
                          number: String(index + 1).padStart(2, '0'),
                        })}
                        {isComplete ? (
                          <span className="rounded-md border-[0.5px] border-primary/40 bg-primary-dim px-2 py-1 text-xs text-primary">
                            {t('learnAcademy.progress.completed')}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-2xl font-bold text-text-primary">
                        {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.title`)}
                      </span>
                      <span className="max-w-4xl text-base leading-7 text-text-muted">
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

                  <div className="grid gap-6 border-t-[0.5px] border-border p-6 md:p-7 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="grid gap-6">
                      <div className={illustration ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]' : ''}>
                        <div>
                          <h2 className="text-sm font-semibold uppercase text-primary">
                            {t('learnAcademy.miniCourse.concept')}
                          </h2>
                          <p className="mt-3 text-base leading-8 text-text-muted">
                            {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.details`)}
                          </p>
                        </div>
                        {illustration ? <div className="min-w-0">{illustration}</div> : null}
                      </div>

                      <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-5">
                        <h2 className="text-sm font-semibold uppercase text-primary">
                          {t('learnAcademy.miniCourse.example')}
                        </h2>
                        <p className="mt-3 text-base leading-8 text-text-muted">
                          {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.example`)}
                        </p>
                      </div>

                      <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-5">
                        <h2 className="text-sm font-semibold uppercase text-primary">
                          {t('learnAcademy.miniCourse.miniCase')}
                        </h2>
                        <p className="mt-3 text-base leading-8 text-text-muted">
                          {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.caseStudy`)}
                        </p>
                      </div>

                      <LessonQuiz
                        questions={quizQuestions}
                        previousScore={lessonProgress?.quizScore}
                        previousTotal={lessonProgress?.quizTotal}
                        onComplete={(score, total) => markLessonComplete(lesson, score, total)}
                      />
                    </div>

                    <aside className="grid h-fit gap-4">
                      <div className="rounded-lg border-[0.5px] border-primary/40 bg-primary-dim p-5">
                        <h2 className="text-sm font-semibold uppercase text-primary">
                          {t('learnAcademy.miniCourse.practice')}
                        </h2>
                        <p className="mt-3 text-sm font-semibold leading-7 text-text-primary">
                          {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.action`)}
                        </p>
                      </div>

                      <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-5">
                        <h2 className="text-sm font-semibold uppercase text-primary">
                          {t('learnAcademy.miniCourse.checklist')}
                        </h2>
                        <ul className="mt-4 grid gap-3">
                          {(['checkOne', 'checkTwo', 'checkThree'] as const).map((item) => (
                            <li key={item} className="text-sm leading-6 text-text-muted">
                              {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.${item}`)}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border-[0.5px] border-border bg-background/40 p-5">
                        <h2 className="text-sm font-semibold uppercase text-primary">
                          {t('learnAcademy.miniCourse.watchOut')}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-text-muted">
                          {t(`learnAcademy.topics.stocks.miniCourse.${lesson}.warning`)}
                        </p>
                      </div>
                    </aside>
                  </div>
                </details>
              )
            })}
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
