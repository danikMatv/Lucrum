import { useMemo, useState } from 'react'
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
import { MonthInput, NumberInput, TextInput } from '../components/calculators/CalculatorControls.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { calculateDcaSimulation, type DcaInput } from '../utils/dca.ts'

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

  const result = useMemo(() => calculateDcaSimulation(submittedInput), [submittedInput])

  const handleCalculate = () => {
    setSubmittedInput({
      ticker,
      monthlyInvestment,
      startDate,
      inflationPercent: inflation,
    })
  }

  const sidebar = (
    <>
      <TextInput id="dca-ticker" label={t('tools.dca.inputs.ticker')} value={ticker} onChange={setTicker} />
      <NumberInput id="dca-monthly" label={t('tools.dca.inputs.monthly')} value={monthlyInvestment} min={0} step={50} onChange={setMonthlyInvestment} />
      <MonthInput id="dca-start" label={t('tools.dca.inputs.startDate')} value={startDate} onChange={setStartDate} />
      <NumberInput id="dca-inflation" label={t('tools.dca.inputs.inflation')} value={inflation} min={0} max={15} step={0.1} suffix="%" onChange={setInflation} />
      <button
        type="button"
        onClick={handleCalculate}
        className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90"
      >
        {t('buttons.calculate')}
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
