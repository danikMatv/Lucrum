export const stockMiniCourseLessons = [
  'foundation',
  'plan',
  'truthsMyths',
  'riskProfile',
  'assetMap',
  'compound',
  'analysisTypes',
  'etfBridge',
  'qualityCompany',
  'profile',
  'statements',
  'balanceSheet',
  'cashFlow',
  'profitability',
  'valuation',
  'entry',
  'technicalIndicators',
] as const

export type StockMiniCourseLesson = (typeof stockMiniCourseLessons)[number]
