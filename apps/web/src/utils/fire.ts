export interface FireInput {
  monthlyExpenses: number
  currentPortfolio: number
  monthlyContribution: number
  annualReturnPercent: number
  withdrawalRatePercent: number
}

export interface FireYearResult {
  year: number
  portfolioValue: number
  fireTarget: number
  totalContributions: number
  growthProfit: number
}

export interface FireResult {
  fireNumber: number
  progressPercent: number
  yearsToFire: number
  monthlyPassiveIncome: number
  totalContributions: number
  growthProfit: number
  rows: FireYearResult[]
}

export const calculateFireProjection = (input: FireInput): FireResult => {
  const fireNumber = (input.monthlyExpenses * 12) / (input.withdrawalRatePercent / 100)
  const annualReturn = input.annualReturnPercent / 100
  const rows: FireYearResult[] = []
  let portfolioValue = input.currentPortfolio
  let totalContributions = 0
  let yearsToFire = 0

  while (portfolioValue < fireNumber && yearsToFire < 80) {
    yearsToFire += 1
    const yearlyContribution = input.monthlyContribution * 12
    portfolioValue = portfolioValue * (1 + annualReturn) + yearlyContribution
    totalContributions += yearlyContribution
    rows.push({
      year: yearsToFire,
      portfolioValue,
      fireTarget: fireNumber,
      totalContributions,
      growthProfit: portfolioValue - input.currentPortfolio - totalContributions,
    })
  }

  if (rows.length === 0) {
    rows.push({
      year: 0,
      portfolioValue,
      fireTarget: fireNumber,
      totalContributions,
      growthProfit: 0,
    })
  }

  const lastRow = rows.at(-1)

  return {
    fireNumber,
    progressPercent: Math.min((input.currentPortfolio / fireNumber) * 100, 100),
    yearsToFire,
    monthlyPassiveIncome: (fireNumber * (input.withdrawalRatePercent / 100)) / 12,
    totalContributions: lastRow?.totalContributions ?? 0,
    growthProfit: lastRow?.growthProfit ?? 0,
    rows,
  }
}
