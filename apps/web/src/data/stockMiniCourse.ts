export const stockMiniCourseLessons = [
  'foundation',
  'plan',
  'riskProfile',
  'assetMap',
  'compound',
  'analysisTypes',
  'etfBridge',
  'qualityCompany',
  'profile',
  'statements',
  'valuation',
  'entry',
] as const

export type StockMiniCourseLesson = (typeof stockMiniCourseLessons)[number]
