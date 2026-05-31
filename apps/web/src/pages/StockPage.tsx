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
import type {
  CompanyEpsHistoryRow,
  CompanySnapshot,
} from '../types/api.ts'
import { normalizeCompanyQuery } from '../utils/companySearch.ts'
import { parseApiError } from '../utils/errorHandler.ts'
import {
  calculateRevenueGrowth,
  generateStockInsights,
  type RevenueGrowthRow,
  type StockInsight,
} from '../utils/stockVerdict.ts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const number = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const exactNumber = new Intl.NumberFormat('en-US')

interface StockFinancialRow {
  year: string
  revenue: number | null
  netIncome: number | null
}

type ChartTab = 'financials' | 'eps'

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

const formatNumber = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'

const formatPercentValue = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)}%` : '—'

const formatDividendPercent = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${(value * 100).toFixed(2)}%`
    : '—'

const formatEmployees = (value: number | null | undefined, label: string) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${formatLargeValue(value)} ${label}`
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

const formatAnalystTarget = (
  target: number | null | undefined,
  price: number | null | undefined,
  upsideLabel: string,
  downsideLabel: string,
) => {
  if (typeof target !== 'number' || !Number.isFinite(target)) {
    return '—'
  }

  if (typeof price !== 'number' || !Number.isFinite(price) || price === 0) {
    return formatCurrency(target)
  }

  const change = ((target - price) / price) * 100
  const label = change >= 0 ? upsideLabel : downsideLabel
  return `${formatCurrency(target)} (${Math.abs(change).toFixed(1)}% ${label})`
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
  const incomeHistory = snapshot.incomeHistory ?? []
  if (incomeHistory.length > 0) {
    return [...incomeHistory]
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

const getEpsRows = (rows: CompanyEpsHistoryRow[]) =>
  [...rows]
    .sort((left, right) => left.year.localeCompare(right.year))
    .filter((row) => typeof row.eps === 'number' && Number.isFinite(row.eps))

const getRevenueGrowthTone = (row: RevenueGrowthRow) => {
  if (typeof row.yoyGrowth !== 'number') {
    return 'text-text-muted'
  }

  return row.yoyGrowth >= 0 ? 'text-success' : 'text-danger'
}

const getGrossMargin = (snapshot: CompanySnapshot) => {
  const grossProfit = snapshot.fundamentals?.grossProfit
  const revenue = snapshot.fundamentals?.revenue

  if (
    typeof grossProfit !== 'number' ||
    !Number.isFinite(grossProfit) ||
    typeof revenue !== 'number' ||
    !Number.isFinite(revenue) ||
    revenue === 0
  ) {
    return null
  }

  return (grossProfit / revenue) * 100
}

export const StockPage = () => {
  const { t, i18n } = useTranslation('common')
  const [tickerInput, setTickerInput] = useState('AAPL')
  const [snapshot, setSnapshot] = useState<CompanySnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [activeChart, setActiveChart] = useState<ChartTab>('financials')

  const stockMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const normalizedTicker = normalizeCompanyQuery(ticker) || 'AAPL'
      return companiesService.getSnapshot(normalizedTicker)
    },
    onSuccess: (nextSnapshot) => {
      setSnapshot(nextSnapshot)
      setTickerInput(nextSnapshot.ticker)
      setErrorMessage(null)
      setIsDescriptionExpanded(false)
      setActiveChart('financials')
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
  const epsRows = snapshot ? getEpsRows(snapshot.epsHistory ?? []) : []
  const revenueGrowth = snapshot ? calculateRevenueGrowth(snapshot.incomeHistory ?? []) : null
  const insights = snapshot
    ? generateStockInsights(snapshot.fundamentals, snapshot.incomeHistory ?? [], snapshot.quote)
    : null
  const locale = i18n.resolvedLanguage ?? i18n.language
  const description = snapshot?.company?.description
  const shortDescription =
    description && description.length > 260 && !isDescriptionExpanded
      ? `${description.slice(0, 260).trim()}...`
      : description
  const analystTarget = formatAnalystTarget(
    snapshot?.fundamentals?.analystTargetPrice,
    snapshot?.quote?.price,
    t('tools.stock.verdict.upside'),
    t('tools.stock.verdict.downside'),
  )
  const grossMargin = snapshot ? getGrossMargin(snapshot) : null

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

  const renderInsightList = (
    items: StockInsight[],
    tone: 'success' | 'danger' | 'neutral',
  ) => {
    const toneClasses = {
      success: 'border-success/30 bg-success/10 text-success',
      danger: 'border-danger/30 bg-danger/10 text-danger',
      neutral: 'border-border bg-surface-alt text-text-muted',
    } as const
    const symbol = tone === 'success' ? '✓' : tone === 'danger' ? '×' : '•'

    return (
      <div className="grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={`${item.key}-${JSON.stringify(item.values ?? {})}`} className="flex gap-3">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${toneClasses[tone]}`}
              >
                {symbol}
              </span>
              <p className="text-sm leading-6 text-text-muted">{t(item.key, item.values)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-text-muted">
            {t('tools.stock.insights.none')}
          </p>
        )}
      </div>
    )
  }

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
              <p className="mt-1 text-lg font-semibold text-text-muted">
                {snapshot.ticker}
                {snapshot.company?.industry ? ` · ${snapshot.company.industry}` : ''}
              </p>
              {description ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-text-muted">{shortDescription}</p>
                  {description.length > 260 ? (
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded((value) => !value)}
                      className="mt-3 text-sm font-semibold text-primary transition hover:text-text-primary"
                    >
                      {isDescriptionExpanded
                        ? t('tools.stock.about.showLess')
                        : t('tools.stock.about.showMore')}
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-5 grid gap-3 text-sm text-text-muted md:grid-cols-3">
                <p>
                  <span className="font-semibold text-text-primary">
                    {t('tools.stock.metrics.country')}:{' '}
                  </span>
                  {snapshot.fundamentals?.country ?? t('tools.stock.unavailable')}
                </p>
                <p>
                  <span className="font-semibold text-text-primary">
                    {t('tools.stock.metrics.employees')}:{' '}
                  </span>
                  {formatEmployees(
                    snapshot.fundamentals?.employees,
                    t('tools.stock.metrics.employeeUnit'),
                  )}
                </p>
                <p>
                  <span className="font-semibold text-text-primary">
                    {t('tools.stock.metrics.fiscalYearEnd')}:{' '}
                  </span>
                  {snapshot.fundamentals?.fiscalYearEnd ?? '—'}
                </p>
              </div>
              {(snapshot.missing?.length ?? 0) > 0 ? (
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
                label={t('tools.stock.metrics.forwardPE')}
                value={formatNumber(snapshot.fundamentals?.forwardPE)}
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
                label={t('tools.stock.metrics.dividend')}
                value={formatDividendPercent(snapshot.fundamentals?.dividendYield)}
              />
            </StatGrid>

            <section className="grid gap-4">
              <h2 className="text-lg font-bold text-text-primary">
                {t('tools.stock.sections.valuationRatios')}
              </h2>
              <StatGrid>
                <StatCard
                  label={t('tools.stock.metrics.priceToSales')}
                  value={formatNumber(snapshot.fundamentals?.priceToSales, 2)}
                />
                <StatCard
                  label={t('tools.stock.metrics.priceToBook')}
                  value={formatNumber(snapshot.fundamentals?.priceToBook, 2)}
                />
                <StatCard
                  label={t('tools.stock.metrics.pegRatio')}
                  value={formatNumber(snapshot.fundamentals?.pegRatio, 2)}
                />
                <StatCard
                  label={t('tools.stock.metrics.beta')}
                  value={formatNumber(snapshot.fundamentals?.beta, 2)}
                />
              </StatGrid>
            </section>

            <section className="grid gap-4">
              <h2 className="text-lg font-bold text-text-primary">
                {t('tools.stock.sections.profitability')}
              </h2>
              <StatGrid>
                <StatCard
                  label={t('tools.stock.metrics.grossMargin')}
                  value={formatPercentValue(grossMargin)}
                />
                <StatCard
                  label={t('tools.stock.metrics.operatingMargin')}
                  value={formatPercentValue(snapshot.fundamentals?.operatingMargin)}
                />
                <StatCard
                  label={t('tools.stock.metrics.netMargin')}
                  value={formatPercentValue(snapshot.fundamentals?.netMargin)}
                />
                <StatCard
                  label={t('tools.stock.metrics.roe')}
                  value={formatPercentValue(snapshot.fundamentals?.returnOnEquity)}
                />
              </StatGrid>
            </section>

            <section className="grid gap-4">
              <h2 className="text-lg font-bold text-text-primary">
                {t('tools.stock.sections.financialHealth')}
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label={t('tools.stock.metrics.currentRatio')}
                  value={formatNumber(snapshot.fundamentals?.currentRatio, 2)}
                />
                <StatCard
                  label={t('tools.stock.metrics.quickRatio')}
                  value={formatNumber(snapshot.fundamentals?.quickRatio, 2)}
                />
                <StatCard
                  label={t('tools.stock.metrics.debt')}
                  value={formatNumber(snapshot.fundamentals?.debtToEquity, 2)}
                />
              </div>
            </section>

            <Panel>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-text-primary">
                  {t('tools.stock.sections.charts')}
                </h2>
                <div className="grid grid-cols-2 rounded-md border-[0.5px] border-border bg-surface-alt p-1">
                  {(['financials', 'eps'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveChart(tab)}
                      className={`rounded px-3 py-2 text-sm font-semibold transition ${
                        activeChart === tab
                          ? 'bg-primary text-background'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {tab === 'financials'
                        ? t('tools.stock.charts.financials')
                        : t('tools.stock.charts.epsHistory')}
                    </button>
                  ))}
                </div>
              </div>

              {activeChart === 'financials' ? (
                financialRows.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialRows}>
                        <CartesianGrid stroke="#1E1E1E" />
                        <XAxis dataKey="year" stroke="#666666" />
                        <YAxis
                          stroke="#666666"
                          tickFormatter={(value) => number.format(Number(value))}
                        />
                        <Tooltip formatter={(value) => formatLargeCurrency(Number(value))} />
                        <Bar
                          dataKey="revenue"
                          name={t('tools.stock.chart.revenue')}
                          fill="#C9A84C"
                        />
                        <Bar
                          dataKey="netIncome"
                          name={t('tools.stock.chart.netIncome')}
                          fill="#4CAF50"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-text-muted">
                    {t('tools.stock.notice.noFinancials')}
                  </p>
                )
              ) : epsRows.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={epsRows}>
                      <CartesianGrid stroke="#1E1E1E" />
                      <XAxis dataKey="year" stroke="#666666" />
                      <YAxis stroke="#666666" />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="eps" name={t('tools.stock.metrics.eps')} fill="#C9A84C" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm leading-6 text-text-muted">
                  {t('tools.stock.notice.noEpsHistory')}
                </p>
              )}

              {revenueGrowth && revenueGrowth.rows.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-lg border-[0.5px] border-border">
                  <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border bg-surface-alt px-4 py-3">
                    <h3 className="text-sm font-bold text-text-primary">
                      {t('tools.stock.charts.revenueGrowth')}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {t('tools.stock.charts.cagr')}: {formatPercentValue(revenueGrowth.cagr)}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="text-text-muted">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            {t('tools.stock.table.year')}
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            {t('tools.stock.table.revenue')}
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            {t('tools.stock.table.yoyGrowth')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueGrowth.rows.map((row) => (
                          <tr key={row.year} className="border-t-[0.5px] border-border">
                            <td className="px-4 py-3 text-text-primary">{row.year}</td>
                            <td className="px-4 py-3 text-text-primary">
                              {formatLargeCurrency(row.revenue)}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${getRevenueGrowthTone(row)}`}>
                              {formatPercentValue(row.yoyGrowth)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </Panel>

            {insights ? (
              <Panel>
                <h2 className="mb-4 text-lg font-bold text-text-primary">
                  {t('tools.stock.sections.insights')}
                </h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase text-success">
                      {t('tools.stock.insights.strengths')}
                    </h3>
                    {renderInsightList(insights.strengths, 'success')}
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase text-danger">
                      {t('tools.stock.insights.weaknesses')}
                    </h3>
                    {renderInsightList(insights.weaknesses, 'danger')}
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-bold uppercase text-text-muted">
                    {t('tools.stock.insights.neutral')}
                  </h3>
                  {renderInsightList(insights.neutral, 'neutral')}
                </div>
              </Panel>
            ) : null}

            <Panel>
              <p className={`text-sm font-semibold uppercase ${verdictTone}`}>
                {t(`tools.stock.verdict.${verdict}.title`)}
              </p>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                {t(`tools.stock.verdict.${verdict}.text`)}
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  [t('tools.stock.metrics.analystTarget'), analystTarget],
                  [
                    t('tools.stock.metrics.roe'),
                    formatPercentValue(snapshot.fundamentals?.returnOnEquity),
                  ],
                  [t('tools.stock.charts.cagr'), formatPercentValue(revenueGrowth?.cagr)],
                ].map(([label, value]) => (
                  <div key={label} className="border-l-[0.5px] border-border pl-4">
                    <p className="text-sm text-text-muted">{label}</p>
                    <p className="mt-2 text-xl font-bold text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="mb-4 text-lg font-bold text-text-primary">
                {t('tools.stock.sections.about')}
              </h2>
              <div className="grid gap-4 text-sm leading-6 text-text-muted">
                <p>
                  <span className="font-semibold text-text-primary">
                    {t('tools.stock.about.description')}:{' '}
                  </span>
                  {snapshot.company?.description ?? '—'}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.industry')}:{' '}
                    </span>
                    {snapshot.company?.industry ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.sector')}:{' '}
                    </span>
                    {snapshot.company?.sector ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.country')}:{' '}
                    </span>
                    {snapshot.fundamentals?.country ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.employees')}:{' '}
                    </span>
                    {formatEmployees(
                      snapshot.fundamentals?.employees,
                      t('tools.stock.metrics.employeeUnit'),
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.fiscalYearEnd')}:{' '}
                    </span>
                    {snapshot.fundamentals?.fiscalYearEnd ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.latestQuarter')}:{' '}
                    </span>
                    {formatMarketDate(snapshot.fundamentals?.latestQuarter, locale) ?? '—'}
                  </p>
                  <p className="md:col-span-2">
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.address')}:{' '}
                    </span>
                    {snapshot.fundamentals?.address ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.grossProfit')}:{' '}
                    </span>
                    {formatLargeCurrency(snapshot.fundamentals?.grossProfit)}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.returnOnAssets')}:{' '}
                    </span>
                    {formatPercentValue(snapshot.fundamentals?.returnOnAssets)}
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">
                      {t('tools.stock.metrics.shares')}:{' '}
                    </span>
                    {snapshot.fundamentals?.sharesOutstanding
                      ? exactNumber.format(snapshot.fundamentals.sharesOutstanding)
                      : '—'}
                  </p>
                </div>
              </div>
            </Panel>
          </>
        )}
      </div>
    </SidebarLayout>
  )
}
