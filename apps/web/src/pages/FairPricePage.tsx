import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  HelpTooltip,
  NumberInput,
  SegmentedControl,
  SliderInput,
} from '../components/calculators/CalculatorControls.tsx'
import { CalculatorActions } from '../components/calculators/CalculatorActions.tsx'
import { CompanySearchInput } from '../components/calculators/CompanySearchInput.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import {
  calculateFairPrice,
  calculateMultipleScenario,
  type MarginOfSafety,
  type ValuationMode,
} from '../utils/fairPrice.ts'
import { normalizeCompanyQuery } from '../utils/companySearch.ts'
import { companiesService } from '../services/companiesService.ts'
import type { Company } from '../types/api.ts'
import { parseApiError } from '../utils/errorHandler.ts'
import { getNumberParam, getSearchParams, getStringParam, getUnionParam } from '../utils/urlParams.ts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const percent = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const GROWTH_TICKERS = [
  'AMZN',
  'TSLA',
  'NVDA',
  'NFLX',
  'UBER',
  'LYFT',
  'SNAP',
  'PINS',
  'RBLX',
  'COIN',
  'PLTR',
  'SHOP',
  'SQ',
  'ROKU',
  'DDOG',
  'NET',
  'CRWD',
  'SNOW',
  'ZM',
  'TWLO',
  'SPOT',
] as const

const FINANCIAL_TICKERS = [
  'SOFI',
  'NU',
  'HOOD',
  'AFRM',
  'UPST',
  'PYPL',
  'SQ',
  'ALLY',
  'COF',
  'JPM',
  'BAC',
  'WFC',
  'GS',
  'MS',
] as const

const growthTickerSet = new Set<string>(GROWTH_TICKERS)
const financialTickerSet = new Set<string>(FINANCIAL_TICKERS)
const valuationModeOptions = ['dcf', 'pe', 'ps'] as const
const marginOptions = [20, 30, 40] as const
const beginnerTermKeys = ['fairPrice', 'safeBuy', 'margin', 'eps', 'pe', 'ps', 'dcf', 'discount'] as const
const beginnerStepKeys = ['chooseModel', 'checkInputs', 'comparePrices', 'useCaution'] as const

const defaultFairPriceInput = {
  ticker: 'AAPL',
  eps: 6.5,
  marketPrice: 190,
  growthRate: 12,
  terminalGrowth: 3,
  discountRate: 10,
  marginOfSafety: 30 as MarginOfSafety,
  valuationMode: 'dcf' as ValuationMode,
  targetPe: 25,
  targetPs: 4,
  revenuePerShare: 0,
}

const isGrowthCompany = (ticker: string): boolean =>
  growthTickerSet.has(normalizeCompanyQuery(ticker) ?? '')

type ValuationFit = 'standard' | 'financial' | 'growth' | 'lowEps'

const hasFinancialTerms = (value: string | null | undefined) =>
  /bank|financial|fintech|credit|lending|loan|capital|insurance|broker|payment/i.test(value ?? '')

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const roundToStep = (value: number, step: number) => Math.round(value / step) * step

const getRevenuePerShare = (fundamentals: {
  revenuePerShare?: number | null
  revenue?: number | null
  sharesOutstanding?: number | null
} | null) => {
  if (typeof fundamentals?.revenuePerShare === 'number' && fundamentals.revenuePerShare > 0) {
    return fundamentals.revenuePerShare
  }

  if (
    typeof fundamentals?.revenue === 'number' &&
    fundamentals.revenue > 0 &&
    typeof fundamentals.sharesOutstanding === 'number' &&
    fundamentals.sharesOutstanding > 0
  ) {
    return fundamentals.revenue / fundamentals.sharesOutstanding
  }

  return 0
}

const inferValuationFit = (input: {
  ticker: string
  sector?: string | null
  industry?: string | null
  eps: number
  marketPrice: number
}): ValuationFit => {
  const normalizedTicker = normalizeCompanyQuery(input.ticker) ?? ''
  if (
    financialTickerSet.has(normalizedTicker) ||
    hasFinancialTerms(input.sector) ||
    hasFinancialTerms(input.industry)
  ) {
    return 'financial'
  }

  if (isGrowthCompany(input.ticker)) {
    return 'growth'
  }

  if (input.eps <= 0 || (input.marketPrice > 0 && input.eps / input.marketPrice < 0.03)) {
    return 'lowEps'
  }

  return 'standard'
}

const getAutoTargetPs = (input: {
  fit: ValuationFit
  marketPrice: number
  revenuePerShare: number
}) => {
  const currentPs =
    input.revenuePerShare > 0 && input.marketPrice > 0
      ? input.marketPrice / input.revenuePerShare
      : 0
  const fallback = input.fit === 'financial' ? 3 : input.fit === 'growth' ? 6 : 4
  const target = currentPs > 0 ? currentPs * (input.fit === 'financial' ? 0.75 : 0.85) : fallback
  return roundToStep(clamp(target, 1, input.fit === 'growth' ? 14 : 10), 0.25)
}

const getAutoTargetPe = (input: { marketPrice: number; eps: number }) => {
  const currentPe = input.eps > 0 && input.marketPrice > 0 ? input.marketPrice / input.eps : 25
  return Math.round(clamp(currentPe * 0.85, 8, 60))
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isMajorUsExchange = (exchange: string | null | undefined) =>
  /nasdaq|nyse|amex|global market|capital market|nms/i.test(exchange ?? '')

const getCompanySearchScore = (company: Company, query: string, normalizedTicker: string) => {
  const companyTicker = normalizeCompanyQuery(company.ticker)
  const normalizedQuery = query.trim().toLowerCase()
  const companyName = company.name.toLowerCase()
  const exchangeBonus = isMajorUsExchange(company.exchange) ? 15 : 0

  if (companyTicker === normalizedTicker) return 100 + exchangeBonus
  if (companyName.startsWith(normalizedQuery) && normalizedQuery.length >= 2) return 90 + exchangeBonus
  if (
    normalizedQuery.length >= 2 &&
    new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedQuery)}([^a-z0-9]|$)`, 'i').test(
      companyName,
    )
  ) {
    return 80 + exchangeBonus
  }
  if (companyTicker.startsWith(normalizedTicker) && normalizedTicker.length >= 2) return 60 + exchangeBonus

  return 0
}

const resolveTickerInput = async (value: string) => {
  const rawQuery = value.trim()
  const normalizedTicker = normalizeCompanyQuery(rawQuery) || 'AAPL'

  try {
    const companies = await companiesService.search(rawQuery || normalizedTicker)
    const bestMatch = companies
      .map((company) => ({
        company,
        score: getCompanySearchScore(company, rawQuery || normalizedTicker, normalizedTicker),
      }))
      .sort((left, right) => right.score - left.score)
      .at(0)

    return bestMatch && bestMatch.score > 0 ? bestMatch.company.ticker : normalizedTicker
  } catch {
    return normalizedTicker
  }
}

export const FairPricePage = () => {
  const { t } = useTranslation('common')
  const params = getSearchParams()
  const [ticker, setTicker] = useState(
    getStringParam(params, 'ticker', defaultFairPriceInput.ticker).toUpperCase(),
  )
  const [eps, setEps] = useState(
    getNumberParam(params, 'eps', defaultFairPriceInput.eps, { min: 0 }),
  )
  const [marketPrice, setMarketPrice] = useState(
    getNumberParam(params, 'price', defaultFairPriceInput.marketPrice, { min: 0 }),
  )
  const [growthRate, setGrowthRate] = useState(
    getNumberParam(params, 'growth', defaultFairPriceInput.growthRate, { min: 0, max: 40 }),
  )
  const [terminalGrowth, setTerminalGrowth] = useState(
    getNumberParam(params, 'terminal', defaultFairPriceInput.terminalGrowth, { min: 0, max: 6 }),
  )
  const [discountRate, setDiscountRate] = useState(
    getNumberParam(params, 'discount', defaultFairPriceInput.discountRate, { min: 5, max: 20 }),
  )
  const [marginOfSafety, setMarginOfSafety] = useState<MarginOfSafety>(
    getUnionParam(params, 'margin', defaultFairPriceInput.marginOfSafety, marginOptions),
  )
  const [valuationMode, setValuationMode] = useState<ValuationMode>(
    getUnionParam(params, 'mode', defaultFairPriceInput.valuationMode, valuationModeOptions),
  )
  const [targetPe, setTargetPe] = useState(
    getNumberParam(params, 'targetPe', defaultFairPriceInput.targetPe, { min: 5, max: 80 }),
  )
  const [targetPs, setTargetPs] = useState(
    getNumberParam(params, 'targetPs', defaultFairPriceInput.targetPs, { min: 0.5, max: 20 }),
  )
  const [revenuePerShare, setRevenuePerShare] = useState(
    getNumberParam(params, 'revenueShare', defaultFairPriceInput.revenuePerShare, { min: 0 }),
  )
  const [valuationFit, setValuationFit] = useState<ValuationFit>('standard')
  const [lookupNotice, setLookupNotice] = useState('')
  const [epsEditedManually, setEpsEditedManually] = useState(false)
  const [growthHintDismissed, setGrowthHintDismissed] = useState(false)

  const fundamentalsMutation = useMutation({
    mutationFn: async (tickerValue: string) => {
      const resolvedTicker = await resolveTickerInput(tickerValue)
      return companiesService.getSnapshot(resolvedTicker)
    },
    onSuccess: ({ ticker: snapshotTicker, company, fundamentals, quote }) => {
      let updatedFields = 0
      const nextTicker = company?.ticker ?? quote?.ticker ?? snapshotTicker
      const nextEps =
        typeof fundamentals?.epsTtm === 'number' && fundamentals.epsTtm > 0
          ? Number(fundamentals.epsTtm.toFixed(2))
          : 0
      const nextMarketPrice =
        quote?.price && quote.price > 0
          ? Number(quote.price.toFixed(2))
          : fundamentals?.peRatio && fundamentals.peRatio > 0 && nextEps > 0
            ? Number((fundamentals.peRatio * nextEps).toFixed(2))
            : 0
      const nextRevenuePerShare = getRevenuePerShare(fundamentals)

      setTicker(nextTicker)
      setEps(nextEps)
      setEpsEditedManually(false)
      if (nextEps > 0) {
        updatedFields += 1
      }

      setMarketPrice(nextMarketPrice)
      if (nextMarketPrice > 0) {
        updatedFields += 1
      }

      setRevenuePerShare(nextRevenuePerShare > 0 ? Number(nextRevenuePerShare.toFixed(2)) : 0)
      if (nextRevenuePerShare > 0) {
        updatedFields += 1
      }

      const nextFit = inferValuationFit({
        ticker: nextTicker,
        sector: company?.sector,
        industry: company?.industry,
        eps: nextEps,
        marketPrice: nextMarketPrice,
      })
      setValuationFit(nextFit)
      if (nextFit !== 'standard') {
        if (nextRevenuePerShare > 0) {
          setTargetPs(
            getAutoTargetPs({
              fit: nextFit,
              marketPrice: nextMarketPrice,
              revenuePerShare: nextRevenuePerShare,
            }),
          )
          setValuationMode('ps')
        } else {
          setTargetPe(getAutoTargetPe({ marketPrice: nextMarketPrice, eps: nextEps }))
          setValuationMode('pe')
        }
      }

      const shouldNeedRevenuePerShare = valuationMode === 'ps' || nextFit === 'financial' || nextFit === 'growth'
      const missingFields = [
        nextEps <= 0 ? t('tools.fairPrice.inputs.eps') : null,
        shouldNeedRevenuePerShare && nextRevenuePerShare <= 0
          ? t('tools.fairPrice.inputs.revenuePerShare')
          : null,
        nextMarketPrice <= 0 ? t('tools.fairPrice.inputs.marketPrice') : null,
      ].filter((field): field is string => Boolean(field))

      if (updatedFields > 0 && missingFields.length > 0) {
        setLookupNotice(
          t('tools.fairPrice.lookup.partial', {
            ticker: nextTicker,
            fields: missingFields.join(', '),
          }),
        )
        return
      }

      setLookupNotice(
        updatedFields > 0
          ? t('tools.fairPrice.lookup.updated', { ticker: nextTicker })
          : t('tools.fairPrice.lookup.noData', { ticker: nextTicker }),
      )
    },
    onError: (error, tickerValue) => {
      const normalizedTicker = normalizeCompanyQuery(tickerValue) || 'AAPL'
      setTicker(normalizedTicker)
      setEps(0)
      setMarketPrice(0)
      setRevenuePerShare(0)
      setEpsEditedManually(false)
      setLookupNotice(
        t('tools.fairPrice.lookup.notFound', {
          ticker: normalizedTicker,
          message: parseApiError(error, t('errors.generic'), t('errors.validation')),
        }),
      )
    },
  })

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

  const peResult = useMemo(
    () =>
      calculateMultipleScenario({
        baseMetricPerShare: eps,
        marketPrice,
        targetMultiple: targetPe,
        marginOfSafetyPercent: marginOfSafety,
      }),
    [eps, marginOfSafety, marketPrice, targetPe],
  )

  const psResult = useMemo(
    () =>
      calculateMultipleScenario({
        baseMetricPerShare: revenuePerShare,
        marketPrice,
        targetMultiple: targetPs,
        marginOfSafetyPercent: marginOfSafety,
      }),
    [marginOfSafety, marketPrice, revenuePerShare, targetPs],
  )

  const activeResult =
    valuationMode === 'pe' ? peResult : valuationMode === 'ps' ? psResult : result

  const isUndervalued = activeResult.verdict === 'undervalued'
  const shouldShowGrowthHint =
    valuationMode !== 'ps' && isGrowthCompany(ticker) && epsEditedManually && !growthHintDismissed
  const shouldShowModelWarning = valuationFit !== 'standard'

  const loadTicker = (tickerValue: string) => {
    setLookupNotice('')
    fundamentalsMutation.mutate(tickerValue)
  }

  const handleCalculate = () => {
    loadTicker(ticker)
  }

  const handleEpsChange = (value: number) => {
    setEps(value)
    setEpsEditedManually(true)
  }

  const sidebar = (
    <>
      <CompanySearchInput
        id="fair-ticker"
        label={t('tools.fairPrice.inputs.ticker')}
        value={ticker}
        onChange={setTicker}
        onSelect={(company) => {
          setTicker(company.ticker)
          loadTicker(company.ticker)
        }}
      />
      <SegmentedControl
        label={t('tools.fairPrice.inputs.mode')}
        value={valuationMode}
        onChange={setValuationMode}
        options={[
          { value: 'dcf', label: t('tools.fairPrice.modes.dcf') },
          { value: 'pe', label: t('tools.fairPrice.modes.pe') },
          { value: 'ps', label: t('tools.fairPrice.modes.ps') },
        ]}
      />
      {valuationMode !== 'ps' ? (
        <NumberInput
          id="fair-eps"
          label={t('tools.fairPrice.inputs.eps')}
          value={eps}
          min={0}
          step={0.1}
          onChange={handleEpsChange}
          labelAccessory={
            <HelpTooltip label={t('tools.fairPrice.epsTooltip')}>
              {t('tools.fairPrice.epsTooltip')}
            </HelpTooltip>
          }
          helper={t('tools.fairPrice.helpers.eps')}
        />
      ) : null}
      {shouldShowGrowthHint ? (
        <div className="rounded-md border-[0.5px] border-border border-l-4 border-l-primary bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[0.5px] border-primary text-xs font-bold text-primary">
              i
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">
                {t('tools.fairPrice.growthHint.title')}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {t('tools.fairPrice.growthHint.body')}
              </p>
              <a
                href="https://www.macrotrends.net"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-primary transition hover:opacity-80"
              >
                {t('tools.fairPrice.growthHint.link')}
              </a>
            </div>
            <button
              type="button"
              aria-label={t('buttons.dismiss')}
              onClick={() => setGrowthHintDismissed(true)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-bold text-text-muted transition hover:bg-surface-alt hover:text-text-primary focus:bg-surface-alt focus:text-text-primary focus:outline-none"
            >
              x
            </button>
          </div>
        </div>
      ) : null}
      <NumberInput
        id="fair-market-price"
        label={t('tools.fairPrice.inputs.marketPrice')}
        value={marketPrice}
        min={0}
        step={1}
        helper={t('tools.fairPrice.helpers.marketPrice')}
        onChange={setMarketPrice}
      />
      {valuationMode === 'dcf' ? (
        <>
          <SliderInput id="fair-growth" label={t('tools.fairPrice.inputs.growth')} value={growthRate} min={0} max={40} step={0.5} suffix="%" helper={t('tools.fairPrice.helpers.growth')} onChange={setGrowthRate} />
          <SliderInput id="fair-terminal" label={t('tools.fairPrice.inputs.terminalGrowth')} value={terminalGrowth} min={0} max={6} step={0.25} suffix="%" helper={t('tools.fairPrice.helpers.terminalGrowth')} onChange={setTerminalGrowth} />
          <SliderInput id="fair-discount" label={t('tools.fairPrice.inputs.discount')} value={discountRate} min={5} max={20} step={0.5} suffix="%" helper={t('tools.fairPrice.helpers.discount')} onChange={setDiscountRate} />
        </>
      ) : null}
      {valuationMode === 'pe' ? (
        <SliderInput id="fair-target-pe" label={t('tools.fairPrice.inputs.targetPe')} value={targetPe} min={5} max={80} step={1} helper={t('tools.fairPrice.helpers.targetPe')} onChange={setTargetPe} />
      ) : null}
      {valuationMode === 'ps' ? (
        <>
          <NumberInput id="fair-revenue-share" label={t('tools.fairPrice.inputs.revenuePerShare')} value={revenuePerShare} min={0} step={0.1} helper={t('tools.fairPrice.helpers.revenuePerShare')} onChange={setRevenuePerShare} />
          <SliderInput id="fair-target-ps" label={t('tools.fairPrice.inputs.targetPs')} value={targetPs} min={0.5} max={20} step={0.25} helper={t('tools.fairPrice.helpers.targetPs')} onChange={setTargetPs} />
        </>
      ) : null}
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
      <button
        type="button"
        onClick={handleCalculate}
        disabled={fundamentalsMutation.isPending}
        className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {fundamentalsMutation.isPending ? t('common.loading') : t('tools.fairPrice.loadTicker')}
      </button>
    </>
  )

  const handleReset = () => {
    setTicker(defaultFairPriceInput.ticker)
    setEps(defaultFairPriceInput.eps)
    setMarketPrice(defaultFairPriceInput.marketPrice)
    setGrowthRate(defaultFairPriceInput.growthRate)
    setTerminalGrowth(defaultFairPriceInput.terminalGrowth)
    setDiscountRate(defaultFairPriceInput.discountRate)
    setMarginOfSafety(defaultFairPriceInput.marginOfSafety)
    setValuationMode(defaultFairPriceInput.valuationMode)
    setTargetPe(defaultFairPriceInput.targetPe)
    setTargetPs(defaultFairPriceInput.targetPs)
    setRevenuePerShare(defaultFairPriceInput.revenuePerShare)
    setValuationFit('standard')
    setLookupNotice('')
    setEpsEditedManually(false)
    setGrowthHintDismissed(false)
  }

  return (
    <SidebarLayout title={t('tools.fairPrice.title')} description={t('tools.fairPrice.description')} sidebar={sidebar}>
      <div className="grid gap-5">
        <CalculatorActions
          onReset={handleReset}
          params={{
            ticker,
            mode: valuationMode,
            eps,
            price: marketPrice,
            growth: growthRate,
            terminal: terminalGrowth,
            discount: discountRate,
            margin: marginOfSafety,
            targetPe,
            targetPs,
            revenueShare: revenuePerShare,
          }}
        />

        {lookupNotice ? (
          <Panel>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('tools.fairPrice.lookup.title')}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-muted">{lookupNotice}</p>
          </Panel>
        ) : null}

        {shouldShowModelWarning ? (
          <Panel className="border-l-4 border-l-primary">
            <p className="text-sm font-semibold uppercase text-primary">
              {t(`tools.fairPrice.modelFit.${valuationFit}.title`)}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {t(`tools.fairPrice.modelFit.${valuationFit}.text`)}
            </p>
          </Panel>
        ) : null}

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase text-primary">
              {t('tools.fairPrice.modeInfo.title', {
                mode: t(`tools.fairPrice.modes.${valuationMode}`),
              })}
            </p>
            {shouldShowModelWarning ? (
              <span className="rounded-md border-[0.5px] border-primary bg-primary-dim px-3 py-1 text-xs font-semibold text-primary">
                {t('tools.fairPrice.modeInfo.autoAdjusted')}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {t(`tools.fairPrice.modeInfo.${valuationMode}`)}
          </p>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <HeroMetric label={t('tools.fairPrice.hero.fairPrice', { ticker: normalizeCompanyQuery(ticker) })} value={currency.format(activeResult.fairPrice)} />
          <HeroMetric label={t('tools.fairPrice.hero.safeBuy')} value={currency.format(activeResult.safeBuyPrice)} tone="success" />
        </div>

        <StatGrid>
          <StatCard label={t('tools.fairPrice.stats.marketPrice')} value={currency.format(marketPrice)} helper={t('tools.fairPrice.explain.marketPrice')} />
          <StatCard label={t('tools.fairPrice.stats.upside')} value={`${percent.format(activeResult.upsidePercent)}%`} tone={isUndervalued ? 'success' : 'danger'} helper={t('tools.fairPrice.explain.upside')} />
          {valuationMode === 'dcf' ? (
            <>
              <StatCard label={t('tools.fairPrice.stats.forecastPv')} value={currency.format(result.forecastPresentValue)} helper={t('tools.fairPrice.explain.forecastPv')} />
              <StatCard label={t('tools.fairPrice.stats.terminalPv')} value={currency.format(result.terminalPresentValue)} tone="primary" helper={t('tools.fairPrice.explain.terminalPv')} />
            </>
          ) : null}
          {valuationMode === 'pe' ? (
            <>
              <StatCard label={t('tools.fairPrice.stats.currentPe')} value={peResult.currentMultiple.toFixed(1)} helper={t('tools.fairPrice.explain.currentPe')} />
              <StatCard label={t('tools.fairPrice.stats.targetPe')} value={targetPe.toFixed(0)} tone="primary" helper={t('tools.fairPrice.explain.targetPe')} />
            </>
          ) : null}
          {valuationMode === 'ps' ? (
            <>
              <StatCard label={t('tools.fairPrice.stats.currentPs')} value={psResult.currentMultiple.toFixed(1)} helper={t('tools.fairPrice.explain.currentPs')} />
              <StatCard label={t('tools.fairPrice.stats.targetPs')} value={targetPs.toFixed(2)} tone="primary" helper={t('tools.fairPrice.explain.targetPs')} />
            </>
          ) : null}
        </StatGrid>

        <Panel className={isUndervalued ? 'bg-primary-dim' : ''}>
          <p className={`text-sm font-semibold uppercase ${isUndervalued ? 'text-success' : 'text-danger'}`}>
            {isUndervalued ? t('tools.fairPrice.verdict.undervalued') : t('tools.fairPrice.verdict.overvalued')}
          </p>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {isUndervalued ? t('tools.fairPrice.verdict.undervaluedText') : t('tools.fairPrice.verdict.overvaluedText')}
          </p>
        </Panel>

        {valuationMode === 'dcf' ? (
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
        ) : (
          <Panel className="overflow-x-auto">
            <h2 className="mb-4 text-lg font-bold text-text-primary">
              {t('tools.fairPrice.scenario.title')}
            </h2>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-text-subtle">
                <tr className="border-b-[0.5px] border-border">
                  <th className="py-3">{t('tools.fairPrice.scenario.metric')}</th>
                  <th>{t('tools.fairPrice.scenario.current')}</th>
                  <th>{t('tools.fairPrice.scenario.target')}</th>
                  <th>{t('tools.fairPrice.scenario.implied')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-[0.5px] border-border text-text-muted">
                  <td className="py-3 text-text-primary">
                    {valuationMode === 'pe'
                      ? t('tools.fairPrice.scenario.peMetric')
                      : t('tools.fairPrice.scenario.psMetric')}
                  </td>
                  <td>
                    {valuationMode === 'pe'
                      ? peResult.currentMultiple.toFixed(1)
                      : psResult.currentMultiple.toFixed(1)}
                  </td>
                  <td>{valuationMode === 'pe' ? targetPe.toFixed(0) : targetPs.toFixed(2)}</td>
                  <td className="text-primary">{currency.format(activeResult.fairPrice)}</td>
                </tr>
                <tr className="text-text-muted">
                  <td className="py-3 text-text-primary">
                    {valuationMode === 'pe'
                      ? t('tools.fairPrice.scenario.epsBase')
                      : t('tools.fairPrice.scenario.revenueBase')}
                  </td>
                  <td>{valuationMode === 'pe' ? currency.format(eps) : currency.format(revenuePerShare)}</td>
                  <td>{t('tools.fairPrice.hero.safeBuy')}</td>
                  <td className="text-success">{currency.format(activeResult.safeBuyPrice)}</td>
                </tr>
              </tbody>
            </table>
          </Panel>
        )}

        <Panel>
          <h2 className="text-lg font-bold text-text-primary">{t('tools.fairPrice.formula.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {t(`tools.fairPrice.formula.${valuationMode}`)}
          </p>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-text-primary">{t('tools.fairPrice.how.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {t(`tools.fairPrice.how.${valuationMode}`)}
          </p>
        </Panel>

        <Panel>
          <div className="grid gap-6">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                {t('tools.fairPrice.beginner.kicker')}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary">
                {t('tools.fairPrice.beginner.title')}
              </h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                {t('tools.fairPrice.beginner.description')}
              </p>
            </div>

            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              {beginnerTermKeys.map((term) => (
                <section key={term} className="border-t-[0.5px] border-border pt-4">
                  <h3 className="text-base font-bold text-text-primary">
                    {t(`tools.fairPrice.beginner.terms.${term}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    {t(`tools.fairPrice.beginner.terms.${term}.text`)}
                  </p>
                </section>
              ))}
            </div>

            <section className="border-t-[0.5px] border-primary/50 pt-5">
              <h3 className="text-base font-bold text-primary">
                {t('tools.fairPrice.beginner.steps.title')}
              </h3>
              <ol className="mt-4 grid gap-3">
                {beginnerStepKeys.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6 text-text-muted">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-background">
                      {index + 1}
                    </span>
                    <span>{t(`tools.fairPrice.beginner.steps.${step}`)}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="border-t-[0.5px] border-danger/50 pt-5">
              <h3 className="text-base font-bold text-danger">
                {t('tools.fairPrice.beginner.warning.title')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {t('tools.fairPrice.beginner.warning.text')}
              </p>
            </section>
          </div>
        </Panel>
      </div>
    </SidebarLayout>
  )
}
