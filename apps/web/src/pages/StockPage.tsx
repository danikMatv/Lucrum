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

const formatLargeValue = (value: number, prefix = '') => {
  const absValue = Math.abs(value)
  if (absValue >= 1e12) {
    return `${prefix}${(value / 1e12).toFixed(1)}T`
  }

  if (absValue >= 1e9) {
    return `${prefix}${(value / 1e9).toFixed(1)}B`
  }

  if (absValue >= 1e6) {
    return `${prefix}${(value / 1e6).toFixed(1)}M`
  }

  return `${prefix}${number.format(value)}`
}

const formatLargeCurrency = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? formatLargeValue(value, '$') : '—'

const formatCompactNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? formatLargeValue(value) : '—'

const formatNumber = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'

const formatPercent = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${(value * 100).toFixed(2)}%`
    : '—'

const formatMarketDate = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return undefined
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

const getVerdict = (snapshot: CompanySnapshot) => {
  const peRatio = snapshot.fundamentals?.peRatio

  if (typeof peRatio !== 'number') {
    return 'unknown' as const
  }

  if (peRatio < 15) {
    return 'undervalued' as const
  }

  if (peRatio <= 25) {
    return 'fair' as const
  }

  if (peRatio <= 50) {
    return 'premium' as const
  }

  return 'highGrowth' as const
}

const getVerdictTone = (verdict: ReturnType<typeof getVerdict>) => {
  if (verdict === 'undervalued') {
    return 'text-success'
  }

  if (verdict === 'fair') {
    return 'text-primary'
  }

  if (verdict === 'premium') {
    return 'text-orange-400'
  }

  if (verdict === 'highGrowth') {
    return 'text-danger'
  }

  return 'text-text-muted'
}

const getFinancialRows = (snapshot: CompanySnapshot): StockFinancialRow[] => {
  if (snapshot.incomeHistory.length > 0) {
    return [...snapshot.incomeHistory]
      .sort((left, right) => left.year.localeCompare(right.year))
      .map((row) => ({
        year: row.year,
        revenue: row.revenue,
        netIncome: row.netIncome,
      }))
  }

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
  const { t, i18n } = useTranslation('common')
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
  const verdictTone = getVerdictTone(verdict)
  const financialRows = snapshot ? getFinancialRows(snapshot) : []
  const locale = i18n.resolvedLanguage ?? i18n.language

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
                helper={formatMarketDate(snapshot.fetchedAt.quote, locale)}
              />
              <Panel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-text-muted">{t('tools.stock.price.high')}</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">
                      {formatCurrency(snapshot.fundamentals?.fiftyTwoWeekHigh)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">{t('tools.stock.price.low')}</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">
                      {formatCurrency(snapshot.fundamentals?.fiftyTwoWeekLow)}
                    </p>
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
                value={formatLargeCurrency(snapshot.fundamentals?.marketCap)}
              />
              <StatCard
                label={t('tools.stock.metrics.revenue')}
                value={formatLargeCurrency(snapshot.fundamentals?.revenue)}
              />
              <StatCard
                label={t('tools.stock.metrics.netIncome')}
                value={formatLargeCurrency(snapshot.fundamentals?.netIncome)}
              />
              <StatCard
                label={t('tools.stock.metrics.fcf')}
                value={formatLargeCurrency(snapshot.fundamentals?.freeCashFlow)}
              />
              <StatCard
                label={t('tools.stock.metrics.debt')}
                value={formatNumber(snapshot.fundamentals?.debtToEquity, 2)}
              />
              <StatCard
                label={t('tools.stock.metrics.dividend')}
                value={formatPercent(snapshot.fundamentals?.dividendYield)}
              />
              <StatCard
                label={t('tools.stock.metrics.shares')}
                value={formatCompactNumber(snapshot.fundamentals?.sharesOutstanding)}
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
                      <Tooltip formatter={(value) => formatLargeCurrency(Number(value))} />
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
