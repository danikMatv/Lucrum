export const popularCompanyAliases: Record<string, string> = {
  AAPL: 'AAPL',
  APPLE: 'AAPL',
  'APPLE INC': 'AAPL',
  'APPLE INC.': 'AAPL',
  MSFT: 'MSFT',
  MICROSOFT: 'MSFT',
  NVDA: 'NVDA',
  NVIDIA: 'NVDA',
  AMZN: 'AMZN',
  AMAZON: 'AMZN',
  GOOGL: 'GOOGL',
  GOOGLE: 'GOOGL',
  ALPHABET: 'GOOGL',
  META: 'META',
  FACEBOOK: 'META',
  TSLA: 'TSLA',
  TESLA: 'TSLA',
  NFLX: 'NFLX',
  NETFLIX: 'NFLX',
  'NETFLIX INC': 'NFLX',
  'NETFLIX INC.': 'NFLX',
  SOFI: 'SOFI',
  SPY: 'SPY',
  'S&P 500': 'SPY',
  SP500: 'SPY',
  VOO: 'VOO',
}

export const normalizeCompanyQuery = (value: string) => {
  const normalized = value.trim()
  const aliasKey = normalized.toUpperCase()
  return popularCompanyAliases[aliasKey] ?? aliasKey.replaceAll(' ', '')
}
