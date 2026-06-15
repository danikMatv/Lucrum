export type ContributionFrequency = 'monthly' | 'quarterly' | 'yearly'

export interface InvestCalcInput {
  years: number
  startingCapital: number
  contributionAmount: number
  contributionFrequency: ContributionFrequency
  annualReturnPercent: number
  inflationPercent: number
  contributionGrowthPercent: number
}

export interface InvestYearResult {
  year: number
  contributionYear: number
  totalContributed: number
  nominalValue: number
  realValue: number
  profit: number
  realProfit: number
  inflationLoss: number
}

export interface InvestCalcResult {
  rows: InvestYearResult[]
  totalContributions: number
  netProfit: number
  realNetProfit: number
  nominalValue: number
  realValue: number
  inflationLoss: number
}

const contributionsPerYear: Record<ContributionFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
}

export const calculateInvestProjection = (input: InvestCalcInput): InvestCalcResult => {
  const annualReturn = input.annualReturnPercent / 100
  const inflation = input.inflationPercent / 100
  const contributionGrowth = input.contributionGrowthPercent / 100
  const periodsPerYear = contributionsPerYear[input.contributionFrequency]
  const periodReturn = Math.pow(1 + annualReturn, 1 / periodsPerYear) - 1

  let nominalValue = input.startingCapital
  let totalContributed = input.startingCapital
  const rows: InvestYearResult[] = []

  for (let year = 1; year <= input.years; year += 1) {
    const contributionAmount =
      input.contributionAmount * Math.pow(1 + contributionGrowth, year - 1)
    let contributionYear = 0

    for (let period = 0; period < periodsPerYear; period += 1) {
      nominalValue *= 1 + periodReturn
      nominalValue += contributionAmount
      contributionYear += contributionAmount
      totalContributed += contributionAmount
    }

    const realValue = nominalValue / Math.pow(1 + inflation, year)
    const profit = nominalValue - totalContributed
    const realProfit = realValue - totalContributed
    rows.push({
      year,
      contributionYear,
      totalContributed,
      nominalValue,
      realValue,
      profit,
      realProfit,
      inflationLoss: nominalValue - realValue,
    })
  }

  const lastRow = rows.at(-1)
  const finalNominalValue = lastRow?.nominalValue ?? input.startingCapital
  const finalRealValue = lastRow?.realValue ?? input.startingCapital

  return {
    rows,
    totalContributions: totalContributed,
    netProfit: finalNominalValue - totalContributed,
    realNetProfit: finalRealValue - totalContributed,
    nominalValue: finalNominalValue,
    realValue: finalRealValue,
    inflationLoss: finalNominalValue - finalRealValue,
  }
}
