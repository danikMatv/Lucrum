import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CompanySearchInput } from '../components/calculators/CompanySearchInput.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { companiesService } from '../services/companiesService.ts'
import type { CompanySnapshot } from '../types/api.ts'
import { normalizeCompanyQuery } from '../utils/companySearch.ts'
import { parseApiError } from '../utils/errorHandler.ts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const number = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

interface StockFinancialRow {
  year: string
  revenue: number | null
  netIncome: number | null
}

const formatCurrency = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? currency.format(value) : '—'

const formatCompactCurrency = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? compactCurrency.format(value) : '—'

const formatNumber = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'

const formatPercent = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '—'

const getVerdict = (snapshot: CompanySnapshot) => {
  const peRatio = snapshot.fundamentals?.peRatio
  const debtToEquity = snapshot.fundamentals?.debtToEquity

  if (typeof peRatio !== 'number' || typeof debtToEquity !== 'number') {
    return 'unknown' as const
  }

  if (peRatio < 22 && debtToEquity < 1) {
    return 'strong' as const
  }

  if (peRatio > 35 || debtToEquity > 2) {
    return 'expensive' as const
  }

  return 'balanced' as const
}

const getFinancialRows = (snapshot: CompanySnapshot): StockFinancialRow[] => {
  const fundamentals = snapshot.fundamentals
  if (!fundamentals?.revenue && !fundamentals?.netIncome) {
    return []
  }

  return [
    {
      year: fundamentals.recordedDate?.slice(0, 4) ?? new Date().getFullYear().toString(),
      revenue: fundamentals.revenue,
      netIncome: fundamentals.netIncome,
    },
  ]
}

export const StockPage = () => {
  const { t } = useTranslation('common')
  const [tickerInput, setTickerInput] = useState('AAPL')
  const [snapshot, setSnapshot] = useState<CompanySnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const stockMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const normalizedTicker = normalizeCompanyQuery(ticker) || 'AAPL'
      return companiesService.getSnapshot(normalizedTicker)
    },
    onSuccess: (nextSnapshot) => {
      setSnapshot(nextSnapshot)
      setTickerInput(nextSnapshot.ticker)
      setErrorMessage(null)
    },
    onError: (error) => {
      setSnapshot(null)
      setErrorMessage(parseApiError(error, t('tools.stock.notice.notFound')))
    },
  })

  const handleAnalyze = () => {
    stockMutation.mutate(tickerInput)
  }

  const verdict = snapshot ? getVerdict(snapshot) : 'unknown'
  const verdictTone =
    verdict === 'strong'
      ? 'text-success'
      : verdict === 'expensive'
        ? 'text-danger'
        : 'text-primary'
  const financialRows = snapshot ? getFinancialRows(snapshot) : []

  const sidebar = (
    <>
      <CompanySearchInput
        id="stock-ticker"
        label={t('tools.stock.inputs.ticker')}
        value={tickerInput}
        onChange={setTickerInput}
      />
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={stockMutation.isPending}
        className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {stockMutation.isPending ? t('common.loading') : t('buttons.analyze')}
      </button>
    </>
  )

  return (
    <SidebarLayout
      title={t('tools.stock.title')}
      description={t('tools.stock.description')}
      sidebar={sidebar}
    >
      <div className="grid gap-5">
        {errorMessage ? (
          <Panel>
            <p className="text-sm font-semibold uppercase text-danger">
              {t('tools.stock.notice.error')}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-muted">{errorMessage}</p>
          </Panel>
        ) : null}

        {!snapshot ? (
          <Panel>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('tools.stock.notice.readyTitle')}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {t('tools.stock.notice.readyText')}
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <p className="text-sm font-semibold uppercase text-primary">
                {snapshot.company?.exchange ?? t('tools.stock.unavailable')} ·{' '}
                {snapshot.company?.sector ?? t('tools.stock.unavailable')}
              </p>
              <h2 className="mt-2 font-heading text-4xl font-bold text-text-primary">
                {snapshot.company?.name ?? snapshot.ticker}
              </h2>
              <p className="mt-1 text-lg font-semibold text-text-muted">{snapshot.ticker}</p>
              {snapshot.missing.length > 0 ? (
                <p className="mt-4 text-sm leading-6 text-text-muted">
                  {t('tools.stock.notice.partial')}
                </p>
              ) : null}
            </Panel>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <HeroMetric
                label={t('tools.stock.price.current')}
                value={formatCurrency(snapshot.quote?.price)}
                helper={snapshot.fetchedAt.quote ?? t('tools.stock.unavailable')}
              />
              <Panel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-text-muted">{t('tools.stock.price.high')}</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">—</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">{t('tools.stock.price.low')}</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">—</p>
                  </div>
                </div>
              </Panel>
            </div>

            <StatGrid>
              <StatCard
                label={t('tools.stock.metrics.pe')}
                value={formatNumber(snapshot.fundamentals?.peRatio)}
              />
              <StatCard
                label={t('tools.stock.metrics.eps')}
                value={formatCurrency(snapshot.fundamentals?.epsTtm)}
              />
              <StatCard
                label={t('tools.stock.metrics.marketCap')}
                value={formatCompactCurrency(snapshot.fundamentals?.marketCap)}
              />
              <StatCard
                label={t('tools.stock.metrics.revenue')}
                value={formatCompactCurrency(snapshot.fundamentals?.revenue)}
              />
              <StatCard
                label={t('tools.stock.metrics.netIncome')}
                value={formatCompactCurrency(snapshot.fundamentals?.netIncome)}
              />
              <StatCard
                label={t('tools.stock.metrics.fcf')}
                value={formatCompactCurrency(snapshot.fundamentals?.freeCashFlow)}
              />
              <StatCard
                label={t('tools.stock.metrics.debt')}
                value={formatNumber(snapshot.fundamentals?.debtToEquity, 2)}
              />
              <StatCard
                label={t('tools.stock.metrics.dividend')}
                value={formatPercent(snapshot.fundamentals?.dividendYield)}
              />
            </StatGrid>

            <Panel>
              <h2 className="mb-4 text-lg font-bold text-text-primary">
                {t('tools.stock.chart.title')}
              </h2>
              {financialRows.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialRows}>
                      <CartesianGrid stroke="#1E1E1E" />
                      <XAxis dataKey="year" stroke="#666666" />
                      <YAxis stroke="#666666" tickFormatter={(value) => number.format(Number(value))} />
                      <Tooltip formatter={(value) => compactCurrency.format(Number(value))} />
                      <Bar dataKey="revenue" name={t('tools.stock.chart.revenue')} fill="#C9A84C" />
                      <Bar dataKey="netIncome" name={t('tools.stock.chart.netIncome')} fill="#4CAF50" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm leading-6 text-text-muted">
                  {t('tools.stock.notice.noFinancials')}
                </p>
              )}
            </Panel>

            <Panel>
              <p className={`text-sm font-semibold uppercase ${verdictTone}`}>
                {t(`tools.stock.verdict.${verdict}.title`)}
              </p>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                {t(`tools.stock.verdict.${verdict}.text`)}
              </p>
            </Panel>
          </>
        )}
      </div>
    </SidebarLayout>
  )
}
