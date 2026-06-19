import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CompanySearchInput,
  type CompanySuggestion,
} from '../components/calculators/CompanySearchInput.tsx'
import { learnTopics } from '../data/learnTopics.ts'
import { stockMiniCourseLessons } from '../data/stockMiniCourse.ts'
import { dashboardService } from '../services/dashboardService.ts'
import { learnProgressService } from '../services/learnProgressService.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import { useLessonProgress } from '../hooks/useLessonProgress.ts'
import { parseApiError } from '../utils/errorHandler.ts'
import { UserRole, type SavedCalculation } from '../types/api.ts'

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))

const previewCalculation = (calculation: SavedCalculation) => {
  try {
    const snapshot = JSON.parse(calculation.resultSnapshot) as Record<string, unknown>
    const firstEntry = Object.entries(snapshot)[0]
    if (!firstEntry) return calculation.resultSnapshot
    return `${firstEntry[0]}: ${String(firstEntry[1])}`
  } catch {
    return calculation.resultSnapshot.slice(0, 96)
  }
}

const overviewTopics = learnTopics.filter((topic) => topic.id !== 'stocks')

const fallbackBadgeIds = [
  'first_lesson',
  'half_course',
  'course_complete',
  'quiz_master',
  ...overviewTopics.map((topic) => `topic_complete:${topic.id}`),
  'explorer',
]

export const DashboardPage = () => {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { completedCount, isSyncing } = useLessonProgress('stocks')
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')

  const calculationsQuery = useQuery({
    queryKey: ['dashboard', 'calculations'],
    queryFn: dashboardService.getCalculations,
  })

  const watchlistQuery = useQuery({
    queryKey: ['dashboard', 'watchlist'],
    queryFn: dashboardService.getWatchlist,
  })

  const badgesQuery = useQuery({
    queryKey: ['learn', 'badges'],
    queryFn: learnProgressService.getBadges,
  })

  const badgeDefinitionsQuery = useQuery({
    queryKey: ['learn', 'badge-definitions'],
    queryFn: learnProgressService.getBadgeDefinitions,
    retry: false,
  })

  const addWatchlistMutation = useMutation({
    mutationFn: () => {
      const normalizedTicker = ticker.trim().toUpperCase()
      return dashboardService.addToWatchlist(
        normalizedTicker,
        companyName.trim() || normalizedTicker,
      )
    },
    onSuccess: async () => {
      setTicker('')
      setCompanyName('')
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'watchlist'] })
    },
  })

  const removeWatchlistMutation = useMutation({
    mutationFn: (itemTicker: string) => dashboardService.removeFromWatchlist(itemTicker),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'watchlist'] })
    },
  })

  const firstName = user?.firstName || t('dashboard.fallbackName')
  const calculations = calculationsQuery.data ?? []
  const watchlist = watchlistQuery.data ?? []
  const earnedBadges = new Set((badgesQuery.data ?? []).map((badge) => badge.badgeId))
  const badgeIds = badgeDefinitionsQuery.data ?? fallbackBadgeIds
  const totalLessons = stockMiniCourseLessons.length
  const progressPercent = Math.round((completedCount / totalLessons) * 100)
  const errorMessage = useMemo(() => {
    const error =
      calculationsQuery.error ??
      watchlistQuery.error ??
      addWatchlistMutation.error ??
      removeWatchlistMutation.error
    return error ? parseApiError(error, t('errors.generic'), t('errors.validation')) : ''
  }, [
    addWatchlistMutation.error,
    calculationsQuery.error,
    removeWatchlistMutation.error,
    t,
    watchlistQuery.error,
  ])

  const handleAddWatchlist = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ticker.trim()) return
    addWatchlistMutation.mutate()
  }

  const handleCompanySelect = (company: CompanySuggestion) => {
    setTicker(company.ticker)
    setCompanyName(company.name)
  }

  const handleLogout = () => {
    void logout()
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
          <div className="flex flex-wrap justify-end gap-3">
            {user?.role === UserRole.ADMIN ? (
              <Link
                to="/admin"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary-hover"
              >
                {t('dashboard.adminPanel')}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
            >
              {t('buttons.logout')}
            </button>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">{t('dashboard.kicker')}</p>
          <h1 className="mt-3 font-heading text-5xl font-bold leading-tight text-text-primary">
            {t('dashboard.title', { firstName })}
          </h1>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border-[0.5px] border-danger bg-surface p-4 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('dashboard.stats.watchlist')}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{watchlist.length}</p>
          </section>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('dashboard.stats.calculations')}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">{calculations.length}</p>
          </section>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('dashboard.stats.learning')}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">{progressPercent}%</p>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-text-primary">{t('dashboard.calculations.title')}</h2>
            {calculationsQuery.isLoading ? (
              <p className="mt-5 text-sm text-text-muted">{t('common.loading')}</p>
            ) : calculations.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {calculations.slice(0, 6).map((calculation) => (
                  <article
                    key={calculation.id}
                    className="rounded-md border-[0.5px] border-border bg-surface-alt p-4"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <p className="text-sm font-bold text-primary">{calculation.toolType}</p>
                      <p className="text-xs text-text-subtle">{formatDate(calculation.createdAt)}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {previewCalculation(calculation)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-text-muted">
                {t('dashboard.calculations.empty')}
              </p>
            )}
          </section>

          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-text-primary">{t('dashboard.watchlist.title')}</h2>
            <form onSubmit={handleAddWatchlist} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <CompanySearchInput
                id="dashboard-watchlist-ticker"
                label={t('dashboard.watchlist.tickerPlaceholder')}
                value={ticker}
                onChange={(value) => {
                  setTicker(value)
                  setCompanyName('')
                }}
                onSelect={handleCompanySelect}
              />
              <button
                type="submit"
                disabled={addWatchlistMutation.isPending || !ticker.trim()}
                className="self-end rounded-md bg-primary px-4 py-2 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addWatchlistMutation.isPending ? t('common.loading') : t('dashboard.watchlist.add')}
              </button>
            </form>

            {watchlistQuery.isLoading ? (
              <p className="mt-5 text-sm text-text-muted">{t('common.loading')}</p>
            ) : watchlist.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {watchlist.map((item) => (
                  <article
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-md border-[0.5px] border-border bg-surface-alt p-4"
                  >
                    <div>
                      <p className="font-bold text-text-primary">{item.ticker}</p>
                      <p className="mt-1 text-sm text-text-muted">
                        {item.companyName || t('dashboard.watchlist.unknownCompany')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWatchlistMutation.mutate(item.ticker)}
                      className="rounded-md border-[0.5px] border-border px-3 py-2 text-sm font-semibold text-danger transition hover:border-border-hover hover:bg-surface"
                    >
                      {t('dashboard.watchlist.remove')}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-text-muted">{t('dashboard.watchlist.empty')}</p>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
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
            <Link
              to="/learn/stocks/course"
              className="mt-5 inline-flex rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-bold text-text-primary transition hover:border-border-hover hover:bg-surface-hover"
            >
              {t('profile.backToCourse')}
            </Link>
          </section>

          <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
            <p className="text-sm font-semibold uppercase text-primary">
              {t('profile.topicProgress.kicker')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-text-primary">
              {t('profile.topicProgress.title')}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overviewTopics.map((topic) => {
                const badgeId = `topic_complete:${topic.id}`
                const isComplete = earnedBadges.has(badgeId)

                return (
                  <Link
                    key={topic.id}
                    to={topic.path}
                    className={`rounded-lg border-[0.5px] p-4 transition hover:border-border-hover ${
                      isComplete
                        ? 'border-primary/40 bg-primary-dim'
                        : 'border-border bg-background/40'
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
                  </Link>
                )
              })}
            </div>
          </section>
        </div>

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                {t('profile.badges.kicker')}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary">
                {t('profile.badges.title')}
              </h2>
            </div>
            {badgeDefinitionsQuery.error ? (
              <p className="text-xs font-semibold text-text-subtle">
                {t('dashboard.learning.offlineBadges')}
              </p>
            ) : null}
          </div>

          {badgesQuery.isLoading ? (
            <p className="mt-5 text-sm text-text-muted">{t('common.loading')}</p>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {badgeIds.map((badgeId) => {
                const isEarned = earnedBadges.has(badgeId)

                return (
                  <article
                    key={badgeId}
                    className={`rounded-lg border-[0.5px] p-4 ${
                      isEarned
                        ? 'border-primary/40 bg-primary-dim'
                        : 'border-border bg-background/40 opacity-70'
                    }`}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-md border-[0.5px] border-border bg-surface text-xs font-black uppercase text-primary">
                      {t(`profile.badges.items.${badgeId}.mark`, { nsSeparator: false })}
                    </div>
                    <h3 className="mt-4 text-base font-bold text-text-primary">
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
