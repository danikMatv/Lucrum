import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MonthYearInput, NumberInput } from '../components/calculators/CalculatorControls.tsx'
import { CalculatorActions } from '../components/calculators/CalculatorActions.tsx'
import {
  CompanySearchInput,
} from '../components/calculators/CompanySearchInput.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import type { DcaInput } from '../utils/dca.ts'
import { toolsService } from '../services/toolsService.ts'
import { normalizeCompanyQuery } from '../utils/companySearch.ts'
import { getNumberParam, getSearchParams, getStringParam } from '../utils/urlParams.ts'
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

const defaultDcaInput = {
  ticker: 'SPY',
  monthlyInvestment: 500,
  inflation: 2.5,
}

const getDcaInputKey = (input: DcaInput) =>
  `${input.ticker}:${input.monthlyInvestment}:${input.startDate}:${input.inflationPercent}`

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
  const defaultStartDate = monthYearsAgo(10)
  const params = getSearchParams()
  const [ticker, setTicker] = useState(
    getStringParam(params, 'ticker', defaultDcaInput.ticker).toUpperCase(),
  )
  const [monthlyInvestment, setMonthlyInvestment] = useState(
    getNumberParam(params, 'monthly', defaultDcaInput.monthlyInvestment, { min: 0 }),
  )
  const [startDate, setStartDate] = useState(
    getStringParam(params, 'from', defaultStartDate, /^\d{4}-\d{2}$/),
  )
  const [inflation, setInflation] = useState(
    getNumberParam(params, 'inflation', defaultDcaInput.inflation, { min: 0, max: 15 }),
  )
  const [apiResult, setApiResult] = useState<{
    key: string
    result: ReturnType<typeof mapApiDcaResult>
  } | null>(null)
  const [dcaError, setDcaError] = useState<{ key: string; message: string } | null>(null)

  const currentInput = useMemo<DcaInput>(
    () => ({
      ticker: normalizeCompanyQuery(ticker) || defaultDcaInput.ticker,
      monthlyInvestment,
      startDate,
      inflationPercent: inflation,
    }),
    [inflation, monthlyInvestment, startDate, ticker],
  )
  const currentInputKey = getDcaInputKey(currentInput)
  const activeApiResult = apiResult?.key === currentInputKey ? apiResult.result : null
  const activeDcaError = dcaError?.key === currentInputKey ? dcaError.message : ''
  const result = activeApiResult ?? apiResult?.result ?? null

  const { mutate: fetchDca, isPending: isDcaPending } = useMutation({
    mutationFn: (input: DcaInput) =>
      toolsService.getDCA(input.ticker, input.startDate, input.monthlyInvestment),
    onSuccess: (data, input) => {
      const key = getDcaInputKey(input)
      if (data.source === 'mock' || data.rows.length === 0) {
        setApiResult(null)
        setDcaError({
          key,
          message: t('tools.dca.notice.unavailable', { ticker: input.ticker }),
        })
        return
      }

      setDcaError(null)
      setApiResult({
        key,
        result: mapApiDcaResult(data, input.inflationPercent),
      })
    },
    onError: (_error, input) => {
      const key = getDcaInputKey(input)
      setApiResult(null)
      setDcaError({
        key,
        message: t('tools.dca.notice.unavailable', { ticker: input.ticker }),
      })
    },
  })

  useEffect(() => {
    if (currentInput.monthlyInvestment <= 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      fetchDca(currentInput)
    }, 450)

    return () => window.clearTimeout(timeoutId)
  }, [currentInput, fetchDca])

  const sidebar = (
    <>
      <CompanySearchInput
        id="dca-ticker"
        label={t('tools.dca.inputs.ticker')}
        value={ticker}
        onChange={setTicker}
        helper={t('tools.dca.helpers.ticker')}
      />
      <NumberInput id="dca-monthly" label={t('tools.dca.inputs.monthly')} value={monthlyInvestment} min={0} step={50} onChange={setMonthlyInvestment} />
      <MonthYearInput id="dca-start" label={t('tools.dca.inputs.startDate')} value={startDate} minYear={1980} onChange={setStartDate} />
      <NumberInput id="dca-inflation" label={t('tools.dca.inputs.inflation')} value={inflation} min={0} max={15} step={0.1} suffix="%" onChange={setInflation} />
      {isDcaPending ? (
        <p className="text-xs leading-5 text-text-subtle">{t('tools.dca.liveLoading')}</p>
      ) : null}
    </>
  )

  const handleReset = () => {
    const nextInput = {
      ticker: defaultDcaInput.ticker,
      monthlyInvestment: defaultDcaInput.monthlyInvestment,
      startDate: defaultStartDate,
      inflationPercent: defaultDcaInput.inflation,
    }
    setTicker(nextInput.ticker)
    setMonthlyInvestment(nextInput.monthlyInvestment)
    setStartDate(nextInput.startDate)
    setInflation(nextInput.inflationPercent)
    setApiResult(null)
    setDcaError(null)
  }

  return (
    <SidebarLayout title={t('tools.dca.title')} description={t('tools.dca.description')} sidebar={sidebar}>
      <div className="grid gap-5">
        <CalculatorActions
          onReset={handleReset}
          params={{
            ticker,
            monthly: monthlyInvestment,
            from: startDate,
            inflation,
          }}
        />

        {activeDcaError ? (
          <Panel className="border-danger bg-surface">
            <h2 className="text-lg font-bold text-danger">{t('tools.dca.notice.errorTitle')}</h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">{activeDcaError}</p>
          </Panel>
        ) : null}

        {result ? (
          <>
            <HeroMetric
              label={t('tools.dca.hero.value', { ticker: result.ticker })}
              value={currency.format(result.portfolioValue)}
              helper={t('tools.dca.hero.helper')}
            />

            <StatGrid>
              <StatCard label={t('tools.dca.stats.invested')} value={currency.format(result.invested)} helper={t('tools.dca.explain.invested')} />
              <StatCard label={t('tools.dca.stats.profit')} value={currency.format(result.profit)} tone="success" helper={t('tools.dca.explain.profit')} />
              <StatCard label={t('tools.dca.stats.return')} value={`${percent.format(result.returnPercent)}%`} tone="primary" helper={t('tools.dca.explain.return')} />
              <StatCard label={t('tools.dca.stats.averagePrice')} value={priceCurrency.format(result.averagePrice)} helper={t('tools.dca.explain.averagePrice')} />
            </StatGrid>
          </>
        ) : null}

        <Panel>
          <h2 className="text-lg font-bold text-text-primary">{t('tools.dca.guide.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">{t('tools.dca.guide.text')}</p>
        </Panel>

        {result ? (
          <>
            <Panel>
              <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.dca.chart.title')}</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.rows} margin={{ left: 24, right: 16 }}>
                    <CartesianGrid stroke="#1E1E1E" />
                    <XAxis dataKey="label" stroke="#666666" minTickGap={32} />
                    <YAxis
                      stroke="#666666"
                      width={96}
                      tickMargin={8}
                      tickFormatter={(value) => currency.format(Number(value))}
                    />
                    <Tooltip formatter={(value) => currency.format(Number(value))} />
                    <Legend />
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
          </>
        ) : null}
      </div>
    </SidebarLayout>
  )
}
