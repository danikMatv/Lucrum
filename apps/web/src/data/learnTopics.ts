export const learnTopics = [
  {
    id: 'bonds',
    path: '/learn/bonds',
    accent: '01',
    toolLinks: ['/tools/invest-calc'],
    resources: [
      {
        key: 'investorBonds',
        href: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products',
      },
      {
        key: 'finraBonds',
        href: 'https://www.finra.org/investors/investing/investment-products/bonds',
      },
    ],
    risks: ['rates', 'credit', 'inflation'],
    mistakes: ['yieldOnly', 'duration', 'cash'],
    terms: ['coupon', 'yield', 'maturity', 'duration'],
    fit: ['income', 'stability', 'knownDate'],
  },
  {
    id: 'stocks',
    path: '/learn/stocks',
    accent: '02',
    toolLinks: ['/tools/stock', '/tools/fair-price'],
    resources: [
      {
        key: 'investorStocks',
        href: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks',
      },
      {
        key: 'investorResearch',
        href: 'https://www.investor.gov/introduction-investing/getting-started/researching-investments',
      },
    ],
    risks: ['business', 'valuation', 'volatility'],
    mistakes: ['storyOnly', 'singleStock', 'priceVsValue'],
    terms: ['eps', 'pe', 'dividend', 'marketCap'],
    fit: ['growth', 'ownership', 'longHorizon'],
  },
  {
    id: 'etfs-funds',
    path: '/learn/etfs-funds',
    accent: '03',
    toolLinks: ['/tools/dca', '/tools/invest-calc'],
    resources: [
      {
        key: 'investorEtfs',
        href: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-2',
      },
      {
        key: 'finraEtps',
        href: 'https://www.finra.org/investors/investing/investment-products/exchange-traded-funds-and-products',
      },
    ],
    risks: ['tracking', 'fees', 'concentration'],
    mistakes: ['tooMany', 'feeBlind', 'overlap'],
    terms: ['expenseRatio', 'indexFund', 'nav', 'distribution'],
    fit: ['diversification', 'simplePlan', 'monthly'],
  },
  {
    id: 'crypto',
    path: '/learn/crypto',
    accent: '04',
    toolLinks: ['/tools/dca'],
    resources: [
      {
        key: 'investorCrypto',
        href: 'https://www.investor.gov/additional-resources/spotlight/crypto-assets',
      },
      {
        key: 'howeyTrade',
        href: 'https://www.investor.gov/additional-resources/spotlight/howeytrade',
      },
    ],
    risks: ['volatility', 'custody', 'cashFlow'],
    mistakes: ['hype', 'keys', 'allIn'],
    terms: ['token', 'wallet', 'exchange', 'stablecoin'],
    fit: ['smallAllocation', 'technologyView', 'riskBudget'],
  },
  {
    id: 'venture',
    path: '/learn/venture',
    accent: '05',
    toolLinks: ['/tools/fair-price'],
    resources: [
      {
        key: 'secPrivate',
        href: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/private',
      },
      {
        key: 'investorPrivateEquity',
        href: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/private-investment-funds/private-equity',
      },
    ],
    risks: ['illiquidity', 'dilution', 'failure'],
    mistakes: ['lottery', 'noTerms', 'noDiversification'],
    terms: ['runway', 'dilution', 'valuationCap', 'liquidity'],
    fit: ['highRisk', 'longLockup', 'expertise'],
  },
  {
    id: 'cash-risk',
    path: '/learn/cash-risk',
    accent: '06',
    toolLinks: ['/tools/fire', '/tools/invest-calc'],
    resources: [
      {
        key: 'investorAssetAllocation',
        href: 'https://www.investor.gov/introduction-investing/getting-started/asset-allocation',
      },
      {
        key: 'fdicDepositInsurance',
        href: 'https://www.fdic.gov/resources/deposit-insurance',
      },
    ],
    risks: ['inflation', 'underinvesting', 'panic'],
    mistakes: ['noEmergency', 'wrongHorizon', 'noRebalance'],
    terms: ['emergencyFund', 'inflation', 'allocation', 'rebalance'],
    fit: ['foundation', 'shortGoals', 'sleep'],
  },
] as const

export type LearnTopic = (typeof learnTopics)[number]
export type LearnTopicId = LearnTopic['id']

export const getLearnTopic = (topicId: string | undefined) =>
  learnTopics.find((topic) => topic.id === topicId)
