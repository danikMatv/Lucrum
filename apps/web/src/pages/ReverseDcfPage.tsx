import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CalculatorActions } from '../components/calculators/CalculatorActions.tsx'
import { NumberInput, SliderInput } from '../components/calculators/CalculatorControls.tsx'
import { CompanySearchInput } from '../components/calculators/CompanySearchInput.tsx'
import { HeroMetric, Panel, StatCard, StatGrid } from '../components/calculators/ResultCards.tsx'
import { SidebarLayout } from '../components/calculators/SidebarLayout.tsx'
import { companiesService } from '../services/companiesService.ts'
import { dashboardService } from '../services/dashboardService.ts'
import type { Company } from '../types/api.ts'
import { normalizeCompanyQuery } from '../utils/companySearch.ts'
import { parseApiError } from '../utils/errorHandler.ts'
import { calculateReverseDcf } from '../utils/reverseDcf.ts'
import { getNumberParam, getSearchParams, getStringParam } from '../utils/urlParams.ts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const percent = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const defaultReverseDcfInput = {
  ticker: 'AAPL',
  eps: 6.5,
  marketPrice: 190,
  discountRate: 10,
  terminalGrowth: 3,
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
  const normalizedTicker = normalizeCompanyQuery(rawQuery) || defaultReverseDcfInput.ticker

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

const buildShareUrl = (params: Record<string, string | number>) => {
  if (typeof window === 'undefined') {
    return ''
  }

  const url = new URL(window.location.href)
  url.search = ''
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  return url.toString()
}

export const ReverseDcfPage = () => {
  const { t } = useTranslation('common')
  const params = getSearchParams()
  const [ticker, setTicker] = useState(
    getStringParam(params, 'ticker', defaultReverseDcfInput.ticker).toUpperCase(),
  )
  const [companyName, setCompanyName] = useState('')
  const [eps, setEps] = useState(
    getNumberParam(params, 'eps', defaultReverseDcfInput.eps, { min: 0 }),
  )
  const [marketPrice, setMarketPrice] = useState(
    getNumberParam(params, 'price', defaultReverseDcfInput.marketPrice, { min: 0 }),
  )
  const [discountRate, setDiscountRate] = useState(
    getNumberParam(params, 'discount', defaultReverseDcfInput.discountRate, { min: 1, max: 30 }),
  )
  const [terminalGrowth, setTerminalGrowth] = useState(
    getNumberParam(params, 'terminal', defaultReverseDcfInput.terminalGrowth, { min: -5, max: 8 }),
  )
  const [lookupNotice, setLookupNotice] = useState('')
  const [saveNotice, setSaveNotice] = useState('')

  const result = useMemo(
    () =>
      calculateReverseDcf({
        epsTtm: eps,
        marketPrice,
        discountRatePercent: discountRate,
        terminalGrowthPercent: terminalGrowth,
      }),
    [discountRate, eps, marketPrice, terminalGrowth],
  )

  const shareParams = {
    ticker,
    eps,
    price: marketPrice,
    discount: discountRate,
    terminal: terminalGrowth,
  }
  const hasSolvedResult = result.impliedGrowthPercent !== null
  const unavailableValue = t('tools.reverseDcf.unavailable.value')
  const impliedGrowthValue =
    result.impliedGrowthPercent === null
      ? result.unavailableReason === 'above_range' || result.unavailableReason === 'below_range'
        ? t('tools.reverseDcf.unavailable.outOfRangeValue')
        : unavailableValue
      : `${percent.format(result.impliedGrowthPercent)}%`
  const yearFiveEpsValue =
    result.yearFiveEps === null ? unavailableValue : currency.format(result.yearFiveEps)
  const terminalValue =
    result.terminalValue === null ? unavailableValue : currency.format(result.terminalValue)
  const forecastPvValue =
    result.forecastPresentValue === null
      ? unavailableValue
      : currency.format(result.forecastPresentValue)
  const terminalPvValue =
    result.terminalPresentValue === null
      ? unavailableValue
      : currency.format(result.terminalPresentValue)
  const modeledPriceValue =
    result.modeledPrice === null ? unavailableValue : currency.format(result.modeledPrice)
  const resultTone =
    result.verdict === 'aggressive' || result.verdict === 'unavailable' ? 'danger' : 'primary'

  const fundamentalsMutation = useMutation({
    mutationFn: async (tickerValue: string) => {
      const resolvedTicker = await resolveTickerInput(tickerValue)
      return companiesService.getSnapshot(resolvedTicker)
    },
    onSuccess: ({ ticker: snapshotTicker, company, fundamentals, quote }) => {
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

      setTicker(nextTicker)
      setCompanyName(company?.name ?? quote?.longName ?? quote?.shortName ?? '')
      setEps(nextEps)
      setMarketPrice(nextMarketPrice)
      setLookupNotice(
        nextEps > 0 && nextMarketPrice > 0
          ? t('tools.reverseDcf.lookup.updated', { ticker: nextTicker })
          : t('tools.reverseDcf.lookup.partial', { ticker: nextTicker }),
      )
    },
    onError: (error, tickerValue) => {
      const normalizedTicker = normalizeCompanyQuery(tickerValue) || defaultReverseDcfInput.ticker
      setTicker(normalizedTicker)
      setCompanyName('')
      setLookupNotice(
        t('tools.reverseDcf.lookup.notFound', {
          ticker: normalizedTicker,
          message: parseApiError(error, t('errors.generic'), t('errors.validation')),
        }),
      )
    },
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      dashboardService.saveCalculation(
        'REVERSE_DCF',
        {
          ticker,
          companyName,
          eps,
          marketPrice,
          discountRate,
          terminalGrowth,
          forecastYears: 5,
        },
        {
          impliedGrowthPercent: result.impliedGrowthPercent,
          yearFiveEps: result.yearFiveEps,
          terminalValue: result.terminalValue,
          modeledPrice: result.modeledPrice,
          verdict: result.verdict,
          shareUrl: buildShareUrl(shareParams),
        },
      ),
    onSuccess: () => {
      setSaveNotice(t('tools.reverseDcf.save.saved'))
    },
    onError: (error) => {
      setSaveNotice(parseApiError(error, t('errors.generic'), t('errors.validation')))
    },
  })

  const loadTicker = (tickerValue: string) => {
    setLookupNotice('')
    fundamentalsMutation.mutate(tickerValue)
  }

  const handleReset = () => {
    setTicker(defaultReverseDcfInput.ticker)
    setCompanyName('')
    setEps(defaultReverseDcfInput.eps)
    setMarketPrice(defaultReverseDcfInput.marketPrice)
    setDiscountRate(defaultReverseDcfInput.discountRate)
    setTerminalGrowth(defaultReverseDcfInput.terminalGrowth)
    setLookupNotice('')
    setSaveNotice('')
  }

  const sidebar = (
    <>
      <CompanySearchInput
        id="reverse-dcf-ticker"
        label={t('tools.reverseDcf.inputs.ticker')}
        value={ticker}
        onChange={setTicker}
        onSelect={(company) => {
          setTicker(company.ticker)
          setCompanyName(company.name)
          loadTicker(company.ticker)
        }}
      />
      <NumberInput
        id="reverse-dcf-eps"
        label={t('tools.reverseDcf.inputs.eps')}
        value={eps}
        min={0}
        step={0.1}
        helper={t('tools.reverseDcf.helpers.eps')}
        onChange={setEps}
      />
      <NumberInput
        id="reverse-dcf-market-price"
        label={t('tools.reverseDcf.inputs.marketPrice')}
        value={marketPrice}
        min={0}
        step={1}
        helper={t('tools.reverseDcf.helpers.marketPrice')}
        onChange={setMarketPrice}
      />
      <SliderInput
        id="reverse-dcf-discount"
        label={t('tools.reverseDcf.inputs.discount')}
        value={discountRate}
        min={1}
        max={30}
        step={0.5}
        suffix="%"
        helper={t('tools.reverseDcf.helpers.discount')}
        onChange={setDiscountRate}
      />
      <SliderInput
        id="reverse-dcf-terminal"
        label={t('tools.reverseDcf.inputs.terminalGrowth')}
        value={terminalGrowth}
        min={-5}
        max={8}
        step={0.25}
        suffix="%"
        helper={t('tools.reverseDcf.helpers.terminalGrowth')}
        onChange={setTerminalGrowth}
      />
      <button
        type="button"
        onClick={() => loadTicker(ticker)}
        disabled={fundamentalsMutation.isPending}
        className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {fundamentalsMutation.isPending ? t('common.loading') : t('tools.reverseDcf.loadTicker')}
      </button>
    </>
  )

  return (
    <SidebarLayout
      title={t('tools.reverseDcf.title')}
      description={t('tools.reverseDcf.description')}
      sidebar={sidebar}
    >
      <div className="grid gap-5">
        <CalculatorActions
          onReset={handleReset}
          params={shareParams}
          onSave={hasSolvedResult ? () => saveMutation.mutate() : undefined}
          isSaving={saveMutation.isPending}
          saveLabel={t('tools.common.saveScenario')}
        />

        {saveNotice ? (
          <p className={`text-sm ${saveMutation.isError ? 'text-danger' : 'text-success'}`}>
            {saveNotice}
          </p>
        ) : null}

        {lookupNotice ? (
          <Panel>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('tools.reverseDcf.lookup.title')}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-muted">{lookupNotice}</p>
          </Panel>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <HeroMetric
            label={t('tools.reverseDcf.hero.impliedGrowth', { ticker })}
            value={impliedGrowthValue}
            tone={resultTone}
            helper={t('tools.reverseDcf.hero.helper')}
          />
          <Panel>
            <p className="text-sm font-semibold uppercase text-primary">
              {t('tools.reverseDcf.verdict.title')}
            </p>
            <p className="mt-3 text-2xl font-bold text-text-primary">
              {t(`tools.reverseDcf.verdict.${result.verdict}`)}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {result.unavailableReason
                ? t(`tools.reverseDcf.unavailable.reasons.${result.unavailableReason}`)
                : t(`tools.reverseDcf.verdict.${result.verdict}Text`)}
            </p>
          </Panel>
        </div>

        {hasSolvedResult ? (
          <StatGrid>
            <StatCard
              label={t('tools.reverseDcf.stats.marketPrice')}
              value={currency.format(marketPrice)}
              helper={t('tools.reverseDcf.explain.marketPrice')}
            />
            <StatCard
              label={t('tools.reverseDcf.stats.modeledPrice')}
              value={modeledPriceValue}
              tone="primary"
              helper={t('tools.reverseDcf.explain.modeledPrice')}
            />
            <StatCard
              label={t('tools.reverseDcf.stats.yearFiveEps')}
              value={yearFiveEpsValue}
              helper={t('tools.reverseDcf.explain.yearFiveEps')}
            />
            <StatCard
              label={t('tools.reverseDcf.stats.terminalValue')}
              value={terminalValue}
              helper={t('tools.reverseDcf.explain.terminalValue')}
            />
          </StatGrid>
        ) : null}

        <Panel>
          <h2 className="text-lg font-bold text-text-primary">{t('tools.reverseDcf.guide.title')}</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">{t('tools.reverseDcf.guide.text')}</p>
        </Panel>

        {hasSolvedResult ? (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Panel>
              <h2 className="text-lg font-bold text-text-primary">
                {t('tools.reverseDcf.breakdown.title')}
              </h2>
              <dl className="mt-5 grid gap-4 text-sm">
                <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border pb-3">
                  <dt className="text-text-muted">{t('tools.reverseDcf.breakdown.forecastPv')}</dt>
                  <dd className="font-bold text-text-primary">{forecastPvValue}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border pb-3">
                  <dt className="text-text-muted">{t('tools.reverseDcf.breakdown.terminalPv')}</dt>
                  <dd className="font-bold text-text-primary">{terminalPvValue}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-text-muted">{t('tools.reverseDcf.breakdown.forecastYears')}</dt>
                  <dd className="font-bold text-text-primary">5</dd>
                </div>
              </dl>
            </Panel>

            <Panel>
              <h2 className="mb-4 text-lg font-bold text-text-primary">
                {t('tools.reverseDcf.table.title')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-text-subtle">
                    <tr className="border-b-[0.5px] border-border">
                      <th className="py-3">{t('tools.common.year')}</th>
                      <th>{t('tools.reverseDcf.table.eps')}</th>
                      <th>{t('tools.reverseDcf.table.discountFactor')}</th>
                      <th>{t('tools.reverseDcf.table.presentValue')}</th>
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
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </SidebarLayout>
  )
}
