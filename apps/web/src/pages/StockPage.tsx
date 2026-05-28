import { useMemo, useState } from 'react'
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
import { getMockStockAnalysis } from '../utils/stockAnalysis.ts'

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

export const StockPage = () => {
  const { t } = useTranslation('common')
  const [tickerInput, setTickerInput] = useState('AAPL')
  const [submittedTicker, setSubmittedTicker] = useState('AAPL')
  const stock = useMemo(() => getMockStockAnalysis(submittedTicker), [submittedTicker])

  const handleAnalyze = () => {
    setSubmittedTicker(tickerInput)
  }

  const verdictTone = stock.verdict === 'strong' ? 'text-success' : stock.verdict === 'expensive' ? 'text-danger' : 'text-primary'

  const sidebar = (
    <>
      <TextInput id="stock-ticker" label={t('tools.stock.inputs.ticker')} value={tickerInput} onChange={setTickerInput} />
      <button
        type="button"
        onClick={handleAnalyze}
        className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90"
      >
        {t('buttons.analyze')}
      </button>
    </>
  )

  return (
    <SidebarLayout title={t('tools.stock.title')} description={t('tools.stock.description')} sidebar={sidebar}>
      <div className="grid gap-5">
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
