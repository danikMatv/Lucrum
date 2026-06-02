import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CompanySearchInput,
  type CompanySuggestion,
} from '../components/calculators/CompanySearchInput.tsx'
import { dashboardService } from '../services/dashboardService.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import { parseApiError } from '../utils/errorHandler.ts'
import { UserRole, type SavedCalculation } from '../types/api.ts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

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

export const DashboardPage = () => {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
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
            <p className="text-sm text-text-muted">{t('dashboard.stats.portfolio')}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{currency.format(0)}</p>
          </section>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('dashboard.stats.calculations')}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">{calculations.length}</p>
          </section>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('dashboard.stats.watchlist')}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">{watchlist.length}</p>
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
      </section>
    </main>
  )
}
