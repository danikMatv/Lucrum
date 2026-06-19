import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { learnProgressService } from '../services/learnProgressService.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import { useLessonProgress } from '../hooks/useLessonProgress.ts'
import { stockMiniCourseLessons } from '../data/stockMiniCourse.ts'
import { learnTopics } from '../data/learnTopics.ts'
import { parseApiError } from '../utils/errorHandler.ts'

const overviewTopics = learnTopics.filter((topic) => topic.id !== 'stocks')

export const ProfilePage = () => {
  const { t } = useTranslation('common')
  const user = useAuthStore((state) => state.user)
  const { completedCount, isSyncing } = useLessonProgress('stocks')
  const totalLessons = stockMiniCourseLessons.length

  const badgesQuery = useQuery({
    queryKey: ['learn', 'badges'],
    queryFn: learnProgressService.getBadges,
  })

  const badgeDefinitionsQuery = useQuery({
    queryKey: ['learn', 'badge-definitions'],
    queryFn: learnProgressService.getBadgeDefinitions,
  })

  const earnedBadges = new Set((badgesQuery.data ?? []).map((badge) => badge.badgeId))
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    t('profile.fallbackName')
  const progressPercent = Math.round((completedCount / totalLessons) * 100)
  const errorMessage = badgesQuery.error ?? badgeDefinitionsQuery.error
    ? parseApiError(
        badgesQuery.error ?? badgeDefinitionsQuery.error,
        t('errors.generic'),
        t('errors.validation'),
      )
    : ''
  const badgeIds = badgeDefinitionsQuery.data ?? []

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
            to="/learn/stocks/course"
            className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
          >
            {t('profile.backToCourse')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">{t('profile.kicker')}</p>
          <h1 className="mt-3 font-heading text-5xl font-bold leading-tight text-text-primary">
            {t('profile.title', { name: displayName })}
          </h1>
          <p className="mt-3 text-sm leading-7 text-text-muted">{user?.email}</p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border-[0.5px] border-danger bg-surface p-4 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                {t('profile.courseProgress.kicker')}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary">
                {t('profile.courseProgress.title', {
                  completed: completedCount,
                  total: totalLessons,
                })}
              </h2>
            </div>
            <p className="text-3xl font-bold text-primary">
              {isSyncing ? t('learnAcademy.progress.syncing') : `${progressPercent}%`}
            </p>
          </div>
          <progress
            className="mt-5 h-2 w-full overflow-hidden rounded-full accent-primary"
            value={completedCount}
            max={totalLessons}
            aria-label={t('profile.courseProgress.ariaLabel')}
          />
        </section>

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
          <p className="text-sm font-semibold uppercase text-primary">
            {t('profile.topicProgress.kicker')}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">
            {t('profile.topicProgress.title')}
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {overviewTopics.map((topic) => {
              const badgeId = `topic_complete:${topic.id}`
              const isComplete = earnedBadges.has(badgeId)

              return (
                <article
                  key={topic.id}
                  className={`rounded-lg border-[0.5px] p-4 ${
                    isComplete
                      ? 'border-primary/40 bg-primary-dim'
                      : 'border-border bg-background/40 opacity-70'
                  }`}
                >
                  <p className="text-base font-bold text-text-primary">
                    {t(`learnAcademy.topics.${topic.id}.title`)}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase text-primary">
                    {isComplete
                      ? t('profile.topicProgress.completed')
                      : t('profile.topicProgress.notCompleted')}
                  </p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
          <p className="text-sm font-semibold uppercase text-primary">{t('profile.badges.kicker')}</p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">{t('profile.badges.title')}</h2>

          {badgesQuery.isLoading || badgeDefinitionsQuery.isLoading ? (
            <p className="mt-5 text-sm text-text-muted">{t('common.loading')}</p>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {badgeIds.map((badgeId) => {
                const isEarned = earnedBadges.has(badgeId)

                return (
                  <article
                    key={badgeId}
                    className={`rounded-lg border-[0.5px] p-5 ${
                      isEarned
                        ? 'border-primary/40 bg-primary-dim'
                        : 'border-border bg-background/40 opacity-70'
                    }`}
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-md border-[0.5px] border-border bg-surface text-sm font-black uppercase text-primary">
                      {t(`profile.badges.items.${badgeId}.mark`, { nsSeparator: false })}
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-text-primary">
                      {t(`profile.badges.items.${badgeId}.title`, { nsSeparator: false })}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {t(`profile.badges.items.${badgeId}.description`, { nsSeparator: false })}
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase text-primary">
                      {isEarned ? t('profile.badges.earned') : t('profile.badges.locked')}
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
