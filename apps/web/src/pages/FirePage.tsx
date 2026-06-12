import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SegmentedControl, SelectInput, SliderInput } from '../components/calculators/CalculatorControls.tsx'
import { CalculatorActions } from '../components/calculators/CalculatorActions.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { calculateFireProjection } from '../utils/fire.ts'
import { getNumberParam, getSearchParams, getUnionParam } from '../utils/urlParams.ts'

const withdrawalOptions = [3, 4, 5] as const
const currencyOptions = ['UAH', 'USD', 'EUR'] as const

type CurrencyCode = (typeof currencyOptions)[number]

const defaultFireInput = {
  monthlyExpenses: 40000,
  currentPortfolio: 500000,
  monthlyContribution: 15000,
  annualReturn: 5,
  withdrawalRate: 4 as 3 | 4 | 5,
  currency: 'UAH' as CurrencyCode,
}

export const FirePage = () => {
  const { t, i18n } = useTranslation('common')
  const params = getSearchParams()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(
    getUnionParam(params, 'currency', defaultFireInput.currency, currencyOptions),
  )
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode, locale],
  )
  const compactCurrency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    [currencyCode, locale],
  )
  const [monthlyExpenses, setMonthlyExpenses] = useState(
    getNumberParam(params, 'expenses', defaultFireInput.monthlyExpenses, { min: 5000, max: 200000 }),
  )
  const [currentPortfolio, setCurrentPortfolio] = useState(
    getNumberParam(params, 'portfolio', defaultFireInput.currentPortfolio, { min: 0, max: 20000000 }),
  )
  const [monthlyContribution, setMonthlyContribution] = useState(
    getNumberParam(params, 'contribution', defaultFireInput.monthlyContribution, { min: 0, max: 300000 }),
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
      <SelectInput
        id="fire-currency"
        label={t('tools.fire.inputs.currency')}
        value={currencyCode}
        onChange={setCurrencyCode}
        helper={t('tools.fire.helpers.currency')}
        options={[
          { value: 'UAH', label: t('tools.fire.currency.uah') },
          { value: 'USD', label: t('tools.fire.currency.usd') },
          { value: 'EUR', label: t('tools.fire.currency.eur') },
        ]}
      />
      <SliderInput id="fire-expenses" label={t('tools.fire.inputs.expenses')} value={monthlyExpenses} min={5000} max={200000} step={1000} suffix={currencyCode} onChange={setMonthlyExpenses} />
      <SliderInput id="fire-portfolio" label={t('tools.fire.inputs.portfolio')} value={currentPortfolio} min={0} max={20000000} step={50000} suffix={currencyCode} onChange={setCurrentPortfolio} />
      <SliderInput id="fire-contribution" label={t('tools.fire.inputs.contribution')} value={monthlyContribution} min={0} max={300000} step={1000} suffix={currencyCode} onChange={setMonthlyContribution} />
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
    setCurrencyCode(defaultFireInput.currency)
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
            currency: currencyCode,
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
              <LineChart data={result.rows} margin={{ left: 24, right: 16 }}>
                <CartesianGrid stroke="#1E1E1E" />
                <XAxis dataKey="year" stroke="#666666" />
                <YAxis
                  stroke="#666666"
                  width={96}
                  tickMargin={8}
                  tickFormatter={(value) => compactCurrency.format(Number(value))}
                />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <Legend />
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
