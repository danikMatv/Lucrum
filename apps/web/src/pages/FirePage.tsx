import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SegmentedControl, SliderInput } from '../components/calculators/CalculatorControls.tsx'
import { CalculatorActions } from '../components/calculators/CalculatorActions.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { calculateFireProjection } from '../utils/fire.ts'
import { getNumberParam, getSearchParams, getUnionParam } from '../utils/urlParams.ts'

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

const withdrawalOptions = [3, 4, 5] as const

const defaultFireInput = {
  monthlyExpenses: 4000,
  currentPortfolio: 50000,
  monthlyContribution: 1500,
  annualReturn: 5,
  withdrawalRate: 4 as 3 | 4 | 5,
}

export const FirePage = () => {
  const { t } = useTranslation('common')
  const params = getSearchParams()
  const [monthlyExpenses, setMonthlyExpenses] = useState(
    getNumberParam(params, 'expenses', defaultFireInput.monthlyExpenses, { min: 1000, max: 12000 }),
  )
  const [currentPortfolio, setCurrentPortfolio] = useState(
    getNumberParam(params, 'portfolio', defaultFireInput.currentPortfolio, { min: 0, max: 1000000 }),
  )
  const [monthlyContribution, setMonthlyContribution] = useState(
    getNumberParam(params, 'contribution', defaultFireInput.monthlyContribution, { min: 0, max: 10000 }),
  )
  const [annualReturn, setAnnualReturn] = useState(
    getNumberParam(params, 'return', defaultFireInput.annualReturn, { min: 0, max: 12 }),
  )
  const [withdrawalRate, setWithdrawalRate] = useState<3 | 4 | 5>(
    getUnionParam(params, 'swr', defaultFireInput.withdrawalRate, withdrawalOptions),
  )

  const result = useMemo(
    () =>
      calculateFireProjection({
        monthlyExpenses,
        currentPortfolio,
        monthlyContribution,
        annualReturnPercent: annualReturn,
        withdrawalRatePercent: withdrawalRate,
      }),
    [annualReturn, currentPortfolio, monthlyContribution, monthlyExpenses, withdrawalRate],
  )

  const sidebar = (
    <>
      <SliderInput id="fire-expenses" label={t('tools.fire.inputs.expenses')} value={monthlyExpenses} min={1000} max={12000} step={100} suffix="$" onChange={setMonthlyExpenses} />
      <SliderInput id="fire-portfolio" label={t('tools.fire.inputs.portfolio')} value={currentPortfolio} min={0} max={1000000} step={5000} suffix="$" onChange={setCurrentPortfolio} />
      <SliderInput id="fire-contribution" label={t('tools.fire.inputs.contribution')} value={monthlyContribution} min={0} max={10000} step={100} suffix="$" onChange={setMonthlyContribution} />
      <SliderInput id="fire-return" label={t('tools.fire.inputs.return')} value={annualReturn} min={0} max={12} step={0.5} suffix="%" onChange={setAnnualReturn} />
      <SegmentedControl
        label={t('tools.fire.inputs.swr')}
        value={withdrawalRate}
        onChange={(value) => setWithdrawalRate(value as 3 | 4 | 5)}
        options={[
          { value: 3, label: t('tools.fire.swr.conservative') },
          { value: 4, label: t('tools.fire.swr.classic') },
          { value: 5, label: t('tools.fire.swr.aggressive') },
        ]}
      />
    </>
  )

  const handleReset = () => {
    setMonthlyExpenses(defaultFireInput.monthlyExpenses)
    setCurrentPortfolio(defaultFireInput.currentPortfolio)
    setMonthlyContribution(defaultFireInput.monthlyContribution)
    setAnnualReturn(defaultFireInput.annualReturn)
    setWithdrawalRate(defaultFireInput.withdrawalRate)
  }

  return (
    <SidebarLayout title={t('tools.fire.title')} description={t('tools.fire.description')} sidebar={sidebar}>
      <div className="grid gap-5">
        <CalculatorActions
          onReset={handleReset}
          params={{
            expenses: monthlyExpenses,
            portfolio: currentPortfolio,
            contribution: monthlyContribution,
            return: annualReturn,
            swr: withdrawalRate,
          }}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <HeroMetric label={t('tools.fire.hero.fireNumber')} value={currency.format(result.fireNumber)} helper={t('tools.fire.hero.fireNumberHelper')} />
          <HeroMetric label={t('tools.fire.hero.years')} value={t('tools.fire.hero.yearsValue', { years: result.yearsToFire })} tone="success" />
        </div>

        <Panel>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-text-muted">{t('tools.fire.progress.label')}</span>
            <span className="font-semibold text-primary">{result.progressPercent.toFixed(1)}%</span>
          </div>
          <progress
            className="h-3 w-full overflow-hidden rounded-full accent-primary"
            value={result.progressPercent}
            max={100}
            aria-label={t('tools.fire.progress.label')}
          />
        </Panel>

        <StatGrid>
          <StatCard label={t('tools.fire.stats.currentPortfolio')} value={currency.format(currentPortfolio)} helper={t('tools.fire.explain.currentPortfolio')} />
          <StatCard label={t('tools.fire.stats.totalContributions')} value={currency.format(result.totalContributions)} helper={t('tools.fire.explain.totalContributions')} />
          <StatCard label={t('tools.fire.stats.growthProfit')} value={currency.format(result.growthProfit)} tone="success" helper={t('tools.fire.explain.growthProfit')} />
          <StatCard label={t('tools.fire.stats.passiveIncome')} value={currency.format(result.monthlyPassiveIncome)} tone="primary" helper={t('tools.fire.explain.passiveIncome')} />
        </StatGrid>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.fire.chart.title')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.rows}>
                <CartesianGrid stroke="#1E1E1E" />
                <XAxis dataKey="year" stroke="#666666" />
                <YAxis stroke="#666666" tickFormatter={(value) => compactCurrency.format(Number(value))} />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <ReferenceLine y={result.fireNumber} stroke="#C9A84C" strokeDasharray="6 6" />
                <Line type="monotone" dataKey="portfolioValue" name={t('tools.fire.chart.portfolio')} stroke="#4CAF50" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="bg-primary-dim">
          <h2 className="text-lg font-bold text-primary">{t('tools.fire.rule.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">{t('tools.fire.rule.description')}</p>
        </Panel>
      </div>
    </SidebarLayout>
  )
}
