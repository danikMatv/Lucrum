import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MonthYearInput, NumberInput } from '../components/calculators/CalculatorControls.tsx'
import {
  CompanySearchInput,
} from '../components/calculators/CompanySearchInput.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { calculateDcaSimulation, type DcaInput } from '../utils/dca.ts'
import { toolsService } from '../services/toolsService.ts'
import { normalizeCompanyQuery } from '../utils/companySearch.ts'
import type { DcaResult as ApiDcaResult } from '../types/api.ts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const priceCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const percent = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const monthYearsAgo = (yearsAgo: number) => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - yearsAgo)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const mapApiDcaResult = (result: ApiDcaResult, inflationPercent: number) => {
  const rows = result.rows.map((row, index) => ({
    label: row.date.slice(0, 7),
    price: row.price,
    shares: row.shares,
    invested: row.invested,
    portfolioValue: row.portfolioValue,
    realPortfolioValue: row.portfolioValue / Math.pow(1 + inflationPercent / 100, index / 12),
  }))
  const finalRow = rows.at(-1)

  return {
    ticker: result.ticker.toUpperCase(),
    rows,
    invested: result.invested,
    portfolioValue: result.portfolioValue,
    profit: result.profit,
    returnPercent: result.returnPercent,
    averagePrice: result.averagePrice,
    shares: result.shares,
    finalPrice: finalRow?.price ?? 0,
    source: result.source ?? 'live',
  }
}

export const DcaPage = () => {
  const { t } = useTranslation('common')
  const [ticker, setTicker] = useState('SPY')
  const [monthlyInvestment, setMonthlyInvestment] = useState(500)
  const [startDate, setStartDate] = useState(monthYearsAgo(10))
  const [inflation, setInflation] = useState(2.5)
  const [submittedInput, setSubmittedInput] = useState<DcaInput>({
    ticker: 'SPY',
    monthlyInvestment: 500,
    startDate: monthYearsAgo(10),
    inflationPercent: 2.5,
  })
  const [apiResult, setApiResult] = useState<ReturnType<typeof mapApiDcaResult> | null>(null)

  const fallbackResult = useMemo(() => calculateDcaSimulation(submittedInput), [submittedInput])
  const result = apiResult ?? fallbackResult

  const dcaMutation = useMutation({
    mutationFn: (input: DcaInput) =>
      toolsService.getDCA(input.ticker, input.startDate, input.monthlyInvestment),
    onSuccess: (data, input) => {
      setApiResult(mapApiDcaResult(data, input.inflationPercent))
    },
    onError: () => {
      setApiResult(null)
    },
  })

  const handleCalculate = () => {
    const normalizedTicker = normalizeCompanyQuery(ticker)
    const nextInput = {
      ticker: normalizedTicker,
      monthlyInvestment,
      startDate,
      inflationPercent: inflation,
    }
    setTicker(normalizedTicker)
    setSubmittedInput(nextInput)
    dcaMutation.mutate(nextInput)
  }

  const sidebar = (
    <>
      <CompanySearchInput id="dca-ticker" label={t('tools.dca.inputs.ticker')} value={ticker} onChange={setTicker} />
      <NumberInput id="dca-monthly" label={t('tools.dca.inputs.monthly')} value={monthlyInvestment} min={0} step={50} onChange={setMonthlyInvestment} />
      <MonthYearInput id="dca-start" label={t('tools.dca.inputs.startDate')} value={startDate} minYear={1980} onChange={setStartDate} />
      <NumberInput id="dca-inflation" label={t('tools.dca.inputs.inflation')} value={inflation} min={0} max={15} step={0.1} suffix="%" onChange={setInflation} />
      <button
        type="button"
        onClick={handleCalculate}
        disabled={dcaMutation.isPending}
        className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {dcaMutation.isPending ? t('common.loading') : t('buttons.calculate')}
      </button>
    </>
  )

  return (
    <SidebarLayout title={t('tools.dca.title')} description={t('tools.dca.description')} sidebar={sidebar}>
      <div className="grid gap-5">
        <HeroMetric
          label={t('tools.dca.hero.value', { ticker: result.ticker })}
          value={currency.format(result.portfolioValue)}
          helper={t('tools.dca.hero.helper')}
        />

        <StatGrid>
          <StatCard label={t('tools.dca.stats.invested')} value={currency.format(result.invested)} />
          <StatCard label={t('tools.dca.stats.profit')} value={currency.format(result.profit)} tone="success" />
          <StatCard label={t('tools.dca.stats.return')} value={`${percent.format(result.returnPercent)}%`} tone="primary" />
          <StatCard label={t('tools.dca.stats.averagePrice')} value={priceCurrency.format(result.averagePrice)} />
        </StatGrid>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.dca.chart.title')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.rows}>
                <CartesianGrid stroke="#1E1E1E" />
                <XAxis dataKey="label" stroke="#666666" minTickGap={32} />
                <YAxis stroke="#666666" tickFormatter={(value) => currency.format(Number(value))} />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <Area type="monotone" dataKey="invested" name={t('tools.dca.chart.invested')} stroke="#666666" fill="#666666" fillOpacity={0.12} />
                <Area type="monotone" dataKey="portfolioValue" name={t('tools.dca.chart.value')} stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="overflow-x-auto">
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.dca.table.title')}</h2>
          <table className="w-full min-w-[620px] text-left text-sm">
            <tbody>
              <tr className="border-b-[0.5px] border-border">
                <th className="py-3 text-text-subtle">{t('tools.dca.table.shares')}</th>
                <td className="text-text-primary">{result.shares.toFixed(3)}</td>
              </tr>
              <tr className="border-b-[0.5px] border-border">
                <th className="py-3 text-text-subtle">{t('tools.dca.table.finalPrice')}</th>
                <td className="text-text-primary">{priceCurrency.format(result.finalPrice)}</td>
              </tr>
              <tr className="border-b-[0.5px] border-border">
                <th className="py-3 text-text-subtle">{t('tools.dca.table.months')}</th>
                <td className="text-text-primary">{result.rows.length}</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>
    </SidebarLayout>
  )
}
