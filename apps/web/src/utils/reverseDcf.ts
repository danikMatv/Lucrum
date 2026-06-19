export type ReverseDcfVerdict = 'conservative' | 'reasonable' | 'aggressive' | 'unavailable'

export interface ReverseDcfInput {
  epsTtm: number
  marketPrice: number
  discountRatePercent: number
  terminalGrowthPercent: number
}

export interface ReverseDcfYearResult {
  year: number
  epsForecast: number
  discountFactor: number
  presentValue: number
}

export interface ReverseDcfResult {
  rows: ReverseDcfYearResult[]
  impliedGrowthPercent: number | null
  yearFiveEps: number | null
  terminalValue: number | null
  terminalPresentValue: number | null
  forecastPresentValue: number | null
  modeledPrice: number | null
  verdict: ReverseDcfVerdict
  unavailableReason:
    | 'invalid_eps'
    | 'invalid_price'
    | 'invalid_rates'
    | 'below_range'
    | 'above_range'
    | null
}

const forecastYears = 5
const minGrowth = -0.3
const maxGrowth = 0.6
const iterations = 80

const calculateDcfPrice = (
  epsTtm: number,
  growthRate: number,
  discountRate: number,
  terminalGrowth: number,
) => {
  const rows: ReverseDcfYearResult[] = []

  for (let year = 1; year <= forecastYears; year += 1) {
    const epsForecast = epsTtm * Math.pow(1 + growthRate, year)
    const discountFactor = 1 / Math.pow(1 + discountRate, year)
    rows.push({
      year,
      epsForecast,
      discountFactor,
      presentValue: epsForecast * discountFactor,
    })
  }

  const yearFiveEps = rows.at(-1)?.epsForecast ?? 0
  const terminalValue = (yearFiveEps * (1 + terminalGrowth)) / (discountRate - terminalGrowth)
  const terminalPresentValue = terminalValue / Math.pow(1 + discountRate, forecastYears)
  const forecastPresentValue = rows.reduce((sum, row) => sum + row.presentValue, 0)
  const modeledPrice = forecastPresentValue + terminalPresentValue

  return {
    rows,
    yearFiveEps,
    terminalValue,
    terminalPresentValue,
    forecastPresentValue,
    modeledPrice,
  }
}

const getVerdict = (impliedGrowthPercent: number): ReverseDcfVerdict => {
  if (impliedGrowthPercent < 5) {
    return 'conservative'
  }
  if (impliedGrowthPercent <= 15) {
    return 'reasonable'
  }
  return 'aggressive'
}

export const calculateReverseDcf = (input: ReverseDcfInput): ReverseDcfResult => {
  const discountRate = input.discountRatePercent / 100
  const terminalGrowth = input.terminalGrowthPercent / 100

  if (input.epsTtm <= 0) {
    return {
      rows: [],
      impliedGrowthPercent: null,
      yearFiveEps: null,
      terminalValue: null,
      terminalPresentValue: null,
      forecastPresentValue: null,
      modeledPrice: null,
      verdict: 'unavailable',
      unavailableReason: 'invalid_eps',
    }
  }

  if (input.marketPrice <= 0) {
    return {
      rows: [],
      impliedGrowthPercent: null,
      yearFiveEps: null,
      terminalValue: null,
      terminalPresentValue: null,
      forecastPresentValue: null,
      modeledPrice: null,
      verdict: 'unavailable',
      unavailableReason: 'invalid_price',
    }
  }

  if (discountRate <= terminalGrowth) {
    return {
      rows: [],
      impliedGrowthPercent: null,
      yearFiveEps: null,
      terminalValue: null,
      terminalPresentValue: null,
      forecastPresentValue: null,
      modeledPrice: null,
      verdict: 'unavailable',
      unavailableReason: 'invalid_rates',
    }
  }

  const lowResult = calculateDcfPrice(input.epsTtm, minGrowth, discountRate, terminalGrowth)
  const highResult = calculateDcfPrice(input.epsTtm, maxGrowth, discountRate, terminalGrowth)

  if (input.marketPrice < lowResult.modeledPrice) {
    return {
      rows: [],
      impliedGrowthPercent: null,
      yearFiveEps: null,
      terminalValue: null,
      terminalPresentValue: null,
      forecastPresentValue: null,
      modeledPrice: null,
      verdict: 'unavailable',
      unavailableReason: 'below_range',
    }
  }

  if (input.marketPrice > highResult.modeledPrice) {
    return {
      rows: [],
      impliedGrowthPercent: null,
      yearFiveEps: null,
      terminalValue: null,
      terminalPresentValue: null,
      forecastPresentValue: null,
      modeledPrice: null,
      verdict: 'unavailable',
      unavailableReason: 'above_range',
    }
  }

  let low = minGrowth
  let high = maxGrowth

  for (let index = 0; index < iterations; index += 1) {
    const mid = (low + high) / 2
    const midPrice = calculateDcfPrice(input.epsTtm, mid, discountRate, terminalGrowth).modeledPrice

    if (midPrice < input.marketPrice) {
      low = mid
    } else {
      high = mid
    }
  }

  const impliedGrowth = (low + high) / 2
  const finalResult = calculateDcfPrice(input.epsTtm, impliedGrowth, discountRate, terminalGrowth)
  const impliedGrowthPercent = impliedGrowth * 100

  return {
    ...finalResult,
    impliedGrowthPercent,
    verdict: getVerdict(impliedGrowthPercent),
    unavailableReason: null,
  }
}
