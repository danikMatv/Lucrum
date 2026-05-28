export type MarginOfSafety = 20 | 30 | 40

export interface FairPriceInput {
  epsTtm: number
  marketPrice: number
  growthRatePercent: number
  terminalGrowthPercent: number
  discountRatePercent: number
  marginOfSafetyPercent: MarginOfSafety
}

export interface DcfYearResult {
  year: number
  epsForecast: number
  discountFactor: number
  presentValue: number
}

export interface FairPriceResult {
  rows: DcfYearResult[]
  terminalValue: number
  terminalPresentValue: number
  forecastPresentValue: number
  fairPrice: number
  safeBuyPrice: number
  verdict: 'undervalued' | 'overvalued'
  upsidePercent: number
}

export const calculateFairPrice = (input: FairPriceInput): FairPriceResult => {
  const growthRate = input.growthRatePercent / 100
  const terminalGrowth = input.terminalGrowthPercent / 100
  const discountRate = input.discountRatePercent / 100
  const rows: DcfYearResult[] = []

  for (let year = 1; year <= 5; year += 1) {
    const epsForecast = input.epsTtm * Math.pow(1 + growthRate, year)
    const discountFactor = 1 / Math.pow(1 + discountRate, year)
    rows.push({
      year,
      epsForecast,
      discountFactor,
      presentValue: epsForecast * discountFactor,
    })
  }

  const yearFiveEps = rows.at(-1)?.epsForecast ?? 0
  const terminalValue =
    discountRate > terminalGrowth
      ? (yearFiveEps * (1 + terminalGrowth)) / (discountRate - terminalGrowth)
      : 0
  const terminalPresentValue = terminalValue / Math.pow(1 + discountRate, 5)
  const forecastPresentValue = rows.reduce((sum, row) => sum + row.presentValue, 0)
  const fairPrice = forecastPresentValue + terminalPresentValue
  const safeBuyPrice = fairPrice * (1 - input.marginOfSafetyPercent / 100)
  const upsidePercent =
    input.marketPrice > 0 ? ((fairPrice - input.marketPrice) / input.marketPrice) * 100 : 0

  return {
    rows,
    terminalValue,
    terminalPresentValue,
    forecastPresentValue,
    fairPrice,
    safeBuyPrice,
    verdict: input.marketPrice <= safeBuyPrice ? 'undervalued' : 'overvalued',
    upsidePercent,
  }
}
