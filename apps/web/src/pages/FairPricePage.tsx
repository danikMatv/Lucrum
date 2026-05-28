import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NumberInput, SegmentedControl, SliderInput, TextInput } from '../components/calculators/CalculatorControls.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { calculateFairPrice, type MarginOfSafety } from '../utils/fairPrice.ts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const percent = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

export const FairPricePage = () => {
  const { t } = useTranslation('common')
  const [ticker, setTicker] = useState('AAPL')
  const [eps, setEps] = useState(6.5)
  const [marketPrice, setMarketPrice] = useState(190)
  const [growthRate, setGrowthRate] = useState(12)
  const [terminalGrowth, setTerminalGrowth] = useState(3)
  const [discountRate, setDiscountRate] = useState(10)
  const [marginOfSafety, setMarginOfSafety] = useState<MarginOfSafety>(30)

  const result = useMemo(
    () =>
      calculateFairPrice({
        epsTtm: eps,
        marketPrice,
        growthRatePercent: growthRate,
        terminalGrowthPercent: terminalGrowth,
        discountRatePercent: discountRate,
        marginOfSafetyPercent: marginOfSafety,
      }),
    [discountRate, eps, growthRate, marginOfSafety, marketPrice, terminalGrowth],
  )

  const isUndervalued = result.verdict === 'undervalued'

  const sidebar = (
    <>
      <TextInput id="fair-ticker" label={t('tools.fairPrice.inputs.ticker')} value={ticker} onChange={setTicker} />
      <NumberInput id="fair-eps" label={t('tools.fairPrice.inputs.eps')} value={eps} min={0} step={0.1} onChange={setEps} />
      <NumberInput id="fair-market-price" label={t('tools.fairPrice.inputs.marketPrice')} value={marketPrice} min={0} step={1} onChange={setMarketPrice} />
      <SliderInput id="fair-growth" label={t('tools.fairPrice.inputs.growth')} value={growthRate} min={0} max={40} step={0.5} suffix="%" onChange={setGrowthRate} />
      <SliderInput id="fair-terminal" label={t('tools.fairPrice.inputs.terminalGrowth')} value={terminalGrowth} min={0} max={6} step={0.25} suffix="%" onChange={setTerminalGrowth} />
      <SliderInput id="fair-discount" label={t('tools.fairPrice.inputs.discount')} value={discountRate} min={5} max={20} step={0.5} suffix="%" onChange={setDiscountRate} />
      <SegmentedControl
        label={t('tools.fairPrice.inputs.margin')}
        value={marginOfSafety}
        onChange={(value) => setMarginOfSafety(value as MarginOfSafety)}
        options={[
          { value: 20, label: t('tools.fairPrice.margin.conservative') },
          { value: 30, label: t('tools.fairPrice.margin.moderate') },
          { value: 40, label: t('tools.fairPrice.margin.aggressive') },
        ]}
      />
    </>
  )

  return (
    <SidebarLayout title={t('tools.fairPrice.title')} description={t('tools.fairPrice.description')} sidebar={sidebar}>
      <div className="grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <HeroMetric label={t('tools.fairPrice.hero.fairPrice', { ticker: ticker.toUpperCase() })} value={currency.format(result.fairPrice)} />
          <HeroMetric label={t('tools.fairPrice.hero.safeBuy')} value={currency.format(result.safeBuyPrice)} tone="success" />
        </div>

        <StatGrid>
          <StatCard label={t('tools.fairPrice.stats.marketPrice')} value={currency.format(marketPrice)} />
          <StatCard label={t('tools.fairPrice.stats.upside')} value={`${percent.format(result.upsidePercent)}%`} tone={isUndervalued ? 'success' : 'danger'} />
          <StatCard label={t('tools.fairPrice.stats.forecastPv')} value={currency.format(result.forecastPresentValue)} />
          <StatCard label={t('tools.fairPrice.stats.terminalPv')} value={currency.format(result.terminalPresentValue)} tone="primary" />
        </StatGrid>

        <Panel className={isUndervalued ? 'bg-primary-dim' : ''}>
          <p className={`text-sm font-semibold uppercase ${isUndervalued ? 'text-success' : 'text-danger'}`}>
            {isUndervalued ? t('tools.fairPrice.verdict.undervalued') : t('tools.fairPrice.verdict.overvalued')}
          </p>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {isUndervalued ? t('tools.fairPrice.verdict.undervaluedText') : t('tools.fairPrice.verdict.overvaluedText')}
          </p>
        </Panel>

        <Panel className="overflow-x-auto">
          <h2 className="mb-4 text-lg font-bold text-text-primary">{t('tools.fairPrice.table.title')}</h2>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-text-subtle">
              <tr className="border-b-[0.5px] border-border">
                <th className="py-3">{t('tools.common.year')}</th>
                <th>{t('tools.fairPrice.table.eps')}</th>
                <th>{t('tools.fairPrice.table.discountFactor')}</th>
                <th>{t('tools.fairPrice.table.presentValue')}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.year} className="border-b-[0.5px] border-border text-text-muted">
                  <td className="py-3 text-text-primary">{row.year}</td>
                  <td>{currency.format(row.epsForecast)}</td>
                  <td>{row.discountFactor.toFixed(3)}</td>
                  <td>{currency.format(row.presentValue)}</td>
                </tr>
              ))}
              <tr className="text-text-muted">
                <td className="py-3 text-text-primary">{t('tools.fairPrice.table.terminal')}</td>
                <td>{currency.format(result.terminalValue)}</td>
                <td>{t('tools.fairPrice.table.yearFive')}</td>
                <td className="text-primary">{currency.format(result.terminalPresentValue)}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-text-primary">{t('tools.fairPrice.formula.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">{t('tools.fairPrice.formula.text')}</p>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-text-primary">{t('tools.fairPrice.how.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">{t('tools.fairPrice.how.text')}</p>
        </Panel>
      </div>
    </SidebarLayout>
  )
}
