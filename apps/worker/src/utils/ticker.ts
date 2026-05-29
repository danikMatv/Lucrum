const tickerAliases: Record<string, string> = {
  APPLE: 'AAPL',
  'APPLE INC': 'AAPL',
  'APPLE INC.': 'AAPL',
  MICROSOFT: 'MSFT',
  NVIDIA: 'NVDA',
  AMAZON: 'AMZN',
  GOOGLE: 'GOOGL',
  ALPHABET: 'GOOGL',
  FACEBOOK: 'META',
  TESLA: 'TSLA',
  NETFLIX: 'NFLX',
  'NETFLIX INC': 'NFLX',
  'NETFLIX INC.': 'NFLX',
}

export const normalizeTicker = (value: string) => {
  const normalized = value.trim().toUpperCase()
  return tickerAliases[normalized] ?? normalized.replaceAll(' ', '')
}
