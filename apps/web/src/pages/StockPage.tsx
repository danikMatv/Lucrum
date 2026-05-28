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
import { TextInput } from '../components/calculators/CalculatorControls.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { companiesService } from '../services/companiesService.ts'
import { parseApiError } from '../utils/errorHandler.ts'
import {
  getMockStockAnalysis,
  type StockAnalysisResult,
  type StockMetricSnapshot,
} from '../utils/stockAnalysis.ts'
import type { Company, CompanyFundamentals } from '../types/api.ts'

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

interface StockApiPayload {
  ticker: string
  company: Company | null
  fundamentals: CompanyFundamentals | null
  warning: string
}

const verdictFromMetrics = (metrics: StockMetricSnapshot): StockAnalysisResult['verdict'] =>
  metrics.peRatio < 22 && metrics.debtToEquity < 1
    ? 'strong'
    : metrics.peRatio > 35 || metrics.debtToEquity > 2
      ? 'expensive'
      : 'balanced'

const mergeStockData = (
  ticker: string,
  company: Company | null,
  fundamentals: CompanyFundamentals | null,
) => {
  const mock = getMockStockAnalysis(ticker)
  const metrics: StockMetricSnapshot = {
    peRatio: fundamentals?.peRatio ?? mock.metrics.peRatio,
    eps: fundamentals?.epsTtm ?? mock.metrics.eps,
    marketCap: fundamentals?.marketCap ?? mock.metrics.marketCap,
    revenue: fundamentals?.revenue ?? mock.metrics.revenue,
    netIncome: fundamentals?.netIncome ?? mock.metrics.netIncome,
    freeCashFlow: fundamentals?.freeCashFlow ?? mock.metrics.freeCashFlow,
    debtToEquity: fundamentals?.debtToEquity ?? mock.metrics.debtToEquity,
    dividendYield: fundamentals?.dividendYield ?? mock.metrics.dividendYield,
  }

  const latestYear = mock.financials.at(-1)?.year ?? new Date().getFullYear()
  const financials = fundamentals
    ? mock.financials.map((year) =>
        year.year === latestYear
          ? {
              ...year,
              revenue: fundamentals.revenue ?? year.revenue,
              netIncome: fundamentals.netIncome ?? year.netIncome,
            }
          : year,
      )
    : mock.financials

  return {
    ...mock,
    ticker: company?.ticker ?? mock.ticker,
    name: company?.name ?? mock.name,
    exchange: company?.exchange ?? mock.exchange,
    sector: company?.sector ?? mock.sector,
    metrics,
    financials,
    verdict: verdictFromMetrics(metrics),
  }
}

export const StockPage = () => {
  const { t } = useTranslation('common')
  const [tickerInput, setTickerInput] = useState('AAPL')
  const [stock, setStock] = useState<StockAnalysisResult>(() => getMockStockAnalysis('AAPL'))
  const [errorMessage, setErrorMessage] = useState('')
  const [fallbackNotice, setFallbackNotice] = useState('')

  const stockMutation = useMutation({
    mutationFn: async (ticker: string): Promise<StockApiPayload> => {
      const normalizedTicker = ticker.trim().toUpperCase() || 'AAPL'
      const [companyResult, fundamentalsResult] = await Promise.allSettled([
        companiesService.getByTicker(normalizedTicker),
        companiesService.getFundamentals(normalizedTicker),
      ])

      const company = companyResult.status === 'fulfilled' ? companyResult.value : null
      const fundamentals =
        fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null

      if (!company && !fundamentals) {
        throw companyResult.status === 'rejected'
          ? companyResult.reason
          : new Error(t('tools.stock.notice.notFound'))
      }

      const warning =
        companyResult.status === 'rejected'
          ? parseApiError(companyResult.reason, t('errors.generic'))
          : fundamentalsResult.status === 'rejected'
            ? parseApiError(fundamentalsResult.reason, t('errors.generic'))
            : ''

      return {
        ticker: normalizedTicker,
        company,
        fundamentals,
        warning,
      }
    },
    onSuccess: ({ ticker, company, fundamentals, warning }) => {
      setStock(mergeStockData(ticker, company, fundamentals))
      setErrorMessage('')
      setFallbackNotice(warning)
    },
    onError: (error) => {
      const normalizedTicker = tickerInput.trim().toUpperCase() || 'AAPL'
      const message = parseApiError(error, t('errors.generic'))
      setStock(getMockStockAnalysis(normalizedTicker))
      setErrorMessage(message)
      setFallbackNotice(message)
    },
  })

  const handleAnalyze = () => {
    stockMutation.mutate(tickerInput)
  }

  const verdictTone = stock.verdict === 'strong' ? 'text-success' : stock.verdict === 'expensive' ? 'text-danger' : 'text-primary'

  const sidebar = (
    <>
      <TextInput id="stock-ticker" label={t('tools.stock.inputs.ticker')} value={tickerInput} onChange={setTickerInput} />
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
    <SidebarLayout title={t('tools.stock.title')} description={t('tools.stock.description')} sidebar={sidebar}>
      <div className="grid gap-5">
        {errorMessage ? (
          <Panel>
            <p className="text-sm font-semibold uppercase text-danger">{t('tools.stock.notice.error')}</p>
            <p className="mt-3 text-sm leading-6 text-text-muted">{errorMessage}</p>
          </Panel>
        ) : null}

        {fallbackNotice ? (
          <Panel>
            <p className="text-sm font-semibold uppercase text-primary">{t('tools.stock.notice.title')}</p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {t('tools.stock.notice.fallback', { message: fallbackNotice })}
            </p>
          </Panel>
        ) : null}

        <Panel>
          <p className="text-sm font-semibold uppercase text-primary">{stock.exchange} · {stock.sector}</p>
          <h2 className="mt-2 font-heading text-4xl font-bold text-text-primary">{stock.name}</h2>
          <p className="mt-1 text-lg font-semibold text-text-muted">{stock.ticker}</p>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <HeroMetric label={t('tools.stock.price.current')} value={currency.format(stock.currentPrice)} helper={`${stock.changePercent > 0 ? '+' : ''}${stock.changePercent}%`} />
          <Panel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-text-muted">{t('tools.stock.price.high')}</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">{currency.format(stock.weekHigh52)}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">{t('tools.stock.price.low')}</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">{currency.format(stock.weekLow52)}</p>
              </div>
            </div>
          </Panel>
        </div>

        <StatGrid>
          <StatCard label={t('tools.stock.metrics.pe')} value={stock.metrics.peRatio.toFixed(1)} />
          <StatCard label={t('tools.stock.metrics.eps')} value={currency.format(stock.metrics.eps)} />
          <StatCard label={t('tools.stock.metrics.marketCap')} value={compactCurrency.format(stock.metrics.marketCap)} />
          <StatCard label={t('tools.stock.metrics.revenue')} value={compactCurrency.format(stock.metrics.revenue)} />
          <StatCard label={t('tools.stock.metrics.netIncome')} value={compactCurrency.format(stock.metrics.netIncome)} />
          <StatCard label={t('tools.stock.metrics.fcf')} value={compactCurrency.format(stock.metrics.freeCashFlow)} />
          <StatCard label={t('tools.stock.metrics.debt')} value={stock.metrics.debtToEquity.toFixed(2)} />
          <StatCard label={t('tools.stock.metrics.dividend')} value={`${stock.metrics.dividendYield.toFixed(2)}%`} />
        </StatGrid>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.stock.chart.title')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stock.financials}>
                <CartesianGrid stroke="#1E1E1E" />
                <XAxis dataKey="year" stroke="#666666" />
                <YAxis stroke="#666666" tickFormatter={(value) => number.format(Number(value))} />
                <Tooltip formatter={(value) => compactCurrency.format(Number(value))} />
                <Bar dataKey="revenue" name={t('tools.stock.chart.revenue')} fill="#C9A84C" />
                <Bar dataKey="netIncome" name={t('tools.stock.chart.netIncome')} fill="#4CAF50" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <p className={`text-sm font-semibold uppercase ${verdictTone}`}>
            {t(`tools.stock.verdict.${stock.verdict}.title`)}
          </p>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {t(`tools.stock.verdict.${stock.verdict}.text`)}
          </p>
        </Panel>
      </div>
    </SidebarLayout>
  )
}
