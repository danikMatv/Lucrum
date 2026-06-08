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
type CurrencyCode = 'UAH' | 'USD' | 'EUR'
type PresetKey = 'starter' | 'balanced' | 'growth'

const frequencyOptions = ['monthly', 'quarterly', 'yearly'] as const
const valueModeOptions = ['real', 'nominal'] as const
const currencyOptions = ['UAH', 'USD', 'EUR'] as const

const defaultInvestInput = {
  years: 30,
  startingCapital: 10000,
  monthlyContribution: 3000,
  frequency: 'monthly' as ContributionFrequency,
  annualReturn: 8,
  inflation: 6,
  contributionGrowth: 0,
  currency: 'UAH' as CurrencyCode,
  valueMode: 'real' as ValueMode,
}

const presets: Record<
  PresetKey,
  Pick<
    typeof defaultInvestInput,
    'years' | 'startingCapital' | 'monthlyContribution' | 'annualReturn' | 'inflation' | 'contributionGrowth'
  >
> = {
  starter: {
    years: 10,
    startingCapital: 5000,
    monthlyContribution: 2000,
    annualReturn: 6,
    inflation: 5,
    contributionGrowth: 0,
  },
  balanced: {
    years: 20,
    startingCapital: 10000,
    monthlyContribution: 3000,
    annualReturn: 8,
    inflation: 6,
    contributionGrowth: 2,
  },
  growth: {
    years: 30,
    startingCapital: 25000,
    monthlyContribution: 6000,
    annualReturn: 10,
    inflation: 6,
    contributionGrowth: 3,
  },
}

export const InvestCalcPage = () => {
  const { t, i18n } = useTranslation('common')
  const params = getSearchParams()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(
    getUnionParam(params, 'currency', defaultInvestInput.currency, currencyOptions),
  )
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

  const locale = i18n.resolvedLanguage ?? i18n.language
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

  const applyPreset = (presetKey: PresetKey) => {
    const preset = presets[presetKey]
    setYears(preset.years)
    setStartingCapital(preset.startingCapital)
    setMonthlyContribution(preset.monthlyContribution)
    setAnnualReturn(preset.annualReturn)
    setInflation(preset.inflation)
    setContributionGrowth(preset.contributionGrowth)
  }

  const sidebar = (
    <>
      <SelectInput
        id="currency"
        label={t('tools.invest.inputs.currency')}
        value={currencyCode}
        onChange={setCurrencyCode}
        helper={t('tools.invest.helpers.currency')}
        options={[
          { value: 'UAH', label: t('tools.invest.currency.uah') },
          { value: 'USD', label: t('tools.invest.currency.usd') },
          { value: 'EUR', label: t('tools.invest.currency.eur') },
        ]}
      />
      <section className="grid gap-3 rounded-md border-[0.5px] border-border bg-surface-alt p-3">
        <p className="text-sm font-semibold text-text-primary">{t('tools.invest.presets.title')}</p>
        <div className="grid gap-2">
          {(Object.keys(presets) as PresetKey[]).map((presetKey) => (
            <button
              key={presetKey}
              type="button"
              onClick={() => applyPreset(presetKey)}
              className="rounded-md border-[0.5px] border-border bg-surface px-3 py-2 text-left text-sm font-semibold text-text-muted transition hover:border-border-hover hover:text-text-primary"
            >
              {t(`tools.invest.presets.${presetKey}`)}
            </button>
          ))}
        </div>
      </section>
      <NumberInput
        id="years"
        label={t('tools.invest.inputs.years')}
        value={years}
        min={1}
        max={60}
        helper={t('tools.invest.helpers.years')}
        onChange={setYears}
      />
      <NumberInput
        id="starting-capital"
        label={t('tools.invest.inputs.startingCapital')}
        value={startingCapital}
        min={0}
        step={500}
        suffix={currencyCode}
        helper={t('tools.invest.helpers.startingCapital')}
        onChange={setStartingCapital}
      />
      <NumberInput
        id="monthly-contribution"
        label={t('tools.invest.inputs.contribution')}
        value={monthlyContribution}
        min={0}
        step={100}
        suffix={currencyCode}
        helper={t('tools.invest.helpers.contribution')}
        onChange={setMonthlyContribution}
      />
      <SelectInput
        id="frequency"
        label={t('tools.invest.inputs.frequency')}
        value={frequency}
        onChange={setFrequency}
        helper={t('tools.invest.helpers.frequency')}
        options={[
          { value: 'monthly', label: t('tools.invest.frequency.monthly') },
          { value: 'quarterly', label: t('tools.invest.frequency.quarterly') },
          { value: 'yearly', label: t('tools.invest.frequency.yearly') },
        ]}
      />
      <NumberInput
        id="return"
        label={t('tools.invest.inputs.return')}
        value={annualReturn}
        min={0}
        max={20}
        step={0.1}
        suffix="%"
        helper={t('tools.invest.helpers.return')}
        onChange={setAnnualReturn}
      />
      <section className="grid gap-3 border-t-[0.5px] border-border pt-4">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen((current) => !current)}
          className="flex items-center justify-between rounded-md border-[0.5px] border-border px-3 py-2 text-left text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface-alt"
          aria-expanded={isAdvancedOpen}
        >
          <span>{t('tools.invest.advanced.title')}</span>
          <span className="text-primary">{isAdvancedOpen ? '-' : '+'}</span>
        </button>
        {isAdvancedOpen ? (
          <div className="grid gap-5">
            <NumberInput
              id="inflation"
              label={t('tools.invest.inputs.inflation')}
              value={inflation}
              min={0}
              max={20}
              step={0.1}
              suffix="%"
              helper={t('tools.invest.helpers.inflation')}
              onChange={setInflation}
            />
            <NumberInput
              id="growth"
              label={t('tools.invest.inputs.contributionGrowth')}
              value={contributionGrowth}
              min={0}
              max={20}
              step={0.1}
              suffix="%"
              helper={t('tools.invest.helpers.contributionGrowth')}
              onChange={setContributionGrowth}
            />
          </div>
        ) : (
          <p className="text-xs leading-5 text-text-subtle">
            {t('tools.invest.advanced.summary', {
              inflation,
              contributionGrowth,
            })}
          </p>
        )}
      </section>
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
    setCurrencyCode(defaultInvestInput.currency)
    setValueMode(defaultInvestInput.valueMode)
    setIsAdvancedOpen(false)
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
            currency: currencyCode,
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
                <Line type="monotone" dataKey="nominalValue" name={t('tools.invest.chart.nominal')} stroke="#C9A84C" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="realValue" name={t('tools.invest.chart.real')} stroke="#4CAF50" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.invest.table.title')}</h2>
          <div className="grid gap-3 md:hidden">
            {result.rows.map((row) => (
              <article
                key={row.year}
                className="rounded-md border-[0.5px] border-border bg-surface-alt p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-text-primary">
                    {t('tools.common.year')} {row.year}
                  </h3>
                  <p className="font-semibold text-success">{currency.format(row.profit)}</p>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-text-subtle">{t('tools.invest.table.contributionYear')}</dt>
                    <dd className="mt-1 text-text-muted">{currency.format(row.contributionYear)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-subtle">{t('tools.invest.table.totalContributed')}</dt>
                    <dd className="mt-1 text-text-muted">{currency.format(row.totalContributed)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-subtle">{t('tools.invest.table.nominal')}</dt>
                    <dd className="mt-1 text-text-muted">{currency.format(row.nominalValue)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-subtle">{t('tools.invest.table.real')}</dt>
                    <dd className="mt-1 text-text-muted">{currency.format(row.realValue)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
          </div>
        </Panel>
      </div>
    </SidebarLayout>
  )
}
