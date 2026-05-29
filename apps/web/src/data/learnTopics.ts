export const learnTopics = [
  {
    id: 'bonds',
    path: '/learn/bonds',
    accent: '01',
    toolLinks: ['/tools/invest-calc'],
    resources: [
      {
        key: 'investorIntro',
        href: 'https://www.investor.gov/introduction-investing',
      },
      {
        key: 'finraBasics',
        href: 'https://www.finra.org/investors/investing/investing-basics',
      },
      {
        key: 'treasuryDirect',
        href: 'https://treasurydirect.gov',
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
        key: 'investorIntro',
        href: 'https://www.investor.gov/introduction-investing',
      },
      {
        key: 'finraBasics',
        href: 'https://www.finra.org/investors/investing/investing-basics',
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
        key: 'investorIntro',
        href: 'https://www.investor.gov/introduction-investing',
      },
      {
        key: 'finraBasics',
        href: 'https://www.finra.org/investors/investing/investing-basics',
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
        key: 'investorIntro',
        href: 'https://www.investor.gov/introduction-investing',
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
        key: 'investorIntro',
        href: 'https://www.investor.gov/introduction-investing',
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
        key: 'investorRisk',
        href: 'https://www.investor.gov/introduction-investing/getting-started/assessing-your-risk-tolerance',
      },
      {
        key: 'finraBasics',
        href: 'https://www.finra.org/investors/investing/investing-basics',
      },
      {
        key: 'fred',
        href: 'https://fred.stlouisfed.org/',
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
