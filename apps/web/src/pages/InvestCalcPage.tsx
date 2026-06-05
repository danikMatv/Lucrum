import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  NumberInput,
  SegmentedControl,
  SelectInput,
} from '../components/calculators/CalculatorControls.tsx'
import { CalculatorActions } from '../components/calculators/CalculatorActions.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import {
  calculateInvestProjection,
  type ContributionFrequency,
} from '../utils/investCalc.ts'
import { getNumberParam, getSearchParams, getUnionParam } from '../utils/urlParams.ts'

type ValueMode = 'real' | 'nominal'
const frequencyOptions = ['monthly', 'quarterly', 'yearly'] as const
const valueModeOptions = ['real', 'nominal'] as const

const defaultInvestInput = {
  years: 30,
  startingCapital: 10000,
  monthlyContribution: 500,
  frequency: 'monthly' as ContributionFrequency,
  annualReturn: 7,
  inflation: 2.5,
  contributionGrowth: 2,
  valueMode: 'real' as ValueMode,
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const InvestCalcPage = () => {
  const { t } = useTranslation('common')
  const params = getSearchParams()
  const [years, setYears] = useState(
    getNumberParam(params, 'years', defaultInvestInput.years, { min: 1, max: 60 }),
  )
  const [startingCapital, setStartingCapital] = useState(
    getNumberParam(params, 'start', defaultInvestInput.startingCapital, { min: 0 }),
  )
  const [monthlyContribution, setMonthlyContribution] = useState(
    getNumberParam(params, 'contribution', defaultInvestInput.monthlyContribution, { min: 0 }),
  )
  const [frequency, setFrequency] = useState<ContributionFrequency>(
    getUnionParam(params, 'frequency', defaultInvestInput.frequency, frequencyOptions),
  )
  const [annualReturn, setAnnualReturn] = useState(
    getNumberParam(params, 'return', defaultInvestInput.annualReturn, { min: 0, max: 20 }),
  )
  const [inflation, setInflation] = useState(
    getNumberParam(params, 'inflation', defaultInvestInput.inflation, { min: 0, max: 15 }),
  )
  const [contributionGrowth, setContributionGrowth] = useState(
    getNumberParam(params, 'growth', defaultInvestInput.contributionGrowth, { min: 0, max: 15 }),
  )
  const [valueMode, setValueMode] = useState<ValueMode>(
    getUnionParam(params, 'mode', defaultInvestInput.valueMode, valueModeOptions),
  )

  const result = useMemo(
    () =>
      calculateInvestProjection({
        years,
        startingCapital,
        contributionAmount: monthlyContribution,
        contributionFrequency: frequency,
        annualReturnPercent: annualReturn,
        inflationPercent: inflation,
        contributionGrowthPercent: contributionGrowth,
      }),
    [annualReturn, contributionGrowth, frequency, inflation, monthlyContribution, startingCapital, years],
  )

  const sidebar = (
    <>
      <NumberInput id="years" label={t('tools.invest.inputs.years')} value={years} min={1} max={60} onChange={setYears} />
      <NumberInput id="starting-capital" label={t('tools.invest.inputs.startingCapital')} value={startingCapital} min={0} step={500} onChange={setStartingCapital} />
      <NumberInput id="monthly-contribution" label={t('tools.invest.inputs.contribution')} value={monthlyContribution} min={0} step={50} onChange={setMonthlyContribution} />
      <SelectInput
        id="frequency"
        label={t('tools.invest.inputs.frequency')}
        value={frequency}
        onChange={setFrequency}
        options={[
          { value: 'monthly', label: t('tools.invest.frequency.monthly') },
          { value: 'quarterly', label: t('tools.invest.frequency.quarterly') },
          { value: 'yearly', label: t('tools.invest.frequency.yearly') },
        ]}
      />
      <NumberInput id="return" label={t('tools.invest.inputs.return')} value={annualReturn} min={0} max={20} step={0.1} suffix="%" onChange={setAnnualReturn} />
      <NumberInput id="inflation" label={t('tools.invest.inputs.inflation')} value={inflation} min={0} max={15} step={0.1} suffix="%" onChange={setInflation} />
      <NumberInput id="growth" label={t('tools.invest.inputs.contributionGrowth')} value={contributionGrowth} min={0} max={15} step={0.1} suffix="%" onChange={setContributionGrowth} />
    </>
  )

  const handleReset = () => {
    setYears(defaultInvestInput.years)
    setStartingCapital(defaultInvestInput.startingCapital)
    setMonthlyContribution(defaultInvestInput.monthlyContribution)
    setFrequency(defaultInvestInput.frequency)
    setAnnualReturn(defaultInvestInput.annualReturn)
    setInflation(defaultInvestInput.inflation)
    setContributionGrowth(defaultInvestInput.contributionGrowth)
    setValueMode(defaultInvestInput.valueMode)
  }

  return (
    <SidebarLayout
      title={t('tools.invest.title')}
      description={t('tools.invest.description')}
      sidebar={sidebar}
    >
      <div className="grid gap-5">
        <CalculatorActions
          onReset={handleReset}
          params={{
            years,
            start: startingCapital,
            contribution: monthlyContribution,
            frequency,
            return: annualReturn,
            inflation,
            growth: contributionGrowth,
            mode: valueMode,
          }}
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <HeroMetric
            label={valueMode === 'real' ? t('tools.invest.hero.real') : t('tools.invest.hero.nominal')}
            value={currency.format(valueMode === 'real' ? result.realValue : result.nominalValue)}
            helper={t('tools.invest.hero.helper', { years })}
          />
          <Panel>
            <SegmentedControl
              label={t('tools.invest.toggle.label')}
              value={valueMode}
              onChange={setValueMode}
              options={[
                { value: 'real', label: t('tools.invest.toggle.real') },
                { value: 'nominal', label: t('tools.invest.toggle.nominal') },
              ]}
            />
          </Panel>
        </div>

        <StatGrid>
          <StatCard label={t('tools.invest.stats.totalContributions')} value={currency.format(result.totalContributions)} helper={t('tools.invest.explain.totalContributions')} />
          <StatCard label={t('tools.invest.stats.netProfit')} value={currency.format(result.netProfit)} tone="success" helper={t('tools.invest.explain.netProfit')} />
          <StatCard label={t('tools.invest.stats.nominalValue')} value={currency.format(result.nominalValue)} tone="primary" helper={t('tools.invest.explain.nominalValue')} />
          <StatCard label={t('tools.invest.stats.inflationLoss')} value={currency.format(result.inflationLoss)} tone="danger" helper={t('tools.invest.explain.inflationLoss')} />
        </StatGrid>

        <Panel>
          <h2 className="text-lg font-bold text-text-primary">{t('tools.invest.guide.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">{t('tools.invest.guide.text')}</p>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.invest.chart.title')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.rows}>
                <CartesianGrid stroke="#1E1E1E" />
                <XAxis dataKey="year" stroke="#666666" />
                <YAxis stroke="#666666" tickFormatter={(value) => compactCurrency.format(Number(value))} />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="nominalValue" name={t('tools.invest.chart.nominal')} stroke="#C9A84C" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="realValue" name={t('tools.invest.chart.real')} stroke="#4CAF50" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="overflow-x-auto">
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.invest.table.title')}</h2>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-text-subtle">
              <tr className="border-b-[0.5px] border-border">
                <th className="py-3">{t('tools.common.year')}</th>
                <th>{t('tools.invest.table.contributionYear')}</th>
                <th>{t('tools.invest.table.totalContributed')}</th>
                <th>{t('tools.invest.table.nominal')}</th>
                <th>{t('tools.invest.table.real')}</th>
                <th>{t('tools.invest.table.profit')}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.year} className="border-b-[0.5px] border-border text-text-muted">
                  <td className="py-3 text-text-primary">{row.year}</td>
                  <td>{currency.format(row.contributionYear)}</td>
                  <td>{currency.format(row.totalContributed)}</td>
                  <td>{currency.format(row.nominalValue)}</td>
                  <td>{currency.format(row.realValue)}</td>
                  <td className="text-success">{currency.format(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </SidebarLayout>
  )
}
