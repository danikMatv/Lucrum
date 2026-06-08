import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { companiesService } from '../../services/companiesService.ts'
import type { Company } from '../../types/api.ts'

interface CompanySearchInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onSelect?: (company: CompanySuggestion) => void
  helper?: string
}

export interface CompanySuggestion {
  ticker: string
  name: string
  exchange?: string | null
}

const popularCompanies: CompanySuggestion[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
  { ticker: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ' },
  { ticker: 'SOFI', name: 'SoFi Technologies Inc.', exchange: 'NASDAQ' },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSEARCA' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSEARCA' },
]

const toSuggestion = (company: Company): CompanySuggestion => ({
  ticker: company.ticker,
  name: company.name,
  exchange: company.exchange,
})

const matchesQuery = (company: CompanySuggestion, query: string) => {
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery.length === 0) return false
  return (
    company.ticker.toLowerCase().includes(normalizedQuery) ||
    company.name.toLowerCase().includes(normalizedQuery)
  )
}

export const CompanySearchInput = ({
  id,
  label,
  value,
  onChange,
  onSelect,
  helper,
}: CompanySearchInputProps) => {
  const { t } = useTranslation('common')
  const [isFocused, setIsFocused] = useState(false)
  const query = value.trim()
  const shouldSearch = query.length >= 2

  const companiesQuery = useQuery({
    queryKey: ['companies', 'search', query],
    queryFn: () => companiesService.search(query),
    enabled: shouldSearch,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const suggestions = useMemo(() => {
    const localSuggestions = popularCompanies.filter((company) => matchesQuery(company, query))
    const remoteSuggestions = (companiesQuery.data ?? []).map(toSuggestion)
    const byTicker = new Map<string, CompanySuggestion>()

    ;[...localSuggestions, ...remoteSuggestions].forEach((company) => {
      byTicker.set(company.ticker, company)
    })

    return Array.from(byTicker.values()).slice(0, 6)
  }, [companiesQuery.data, query])

  const handleSelect = (company: CompanySuggestion) => {
    onChange(company.ticker)
    onSelect?.(company)
    setIsFocused(false)
  }

  return (
    <label htmlFor={id} className="relative grid gap-2">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary"
        autoComplete="off"
        aria-describedby={helper ? `${id}-helper` : undefined}
      />
      {helper ? (
        <span id={`${id}-helper`} className="text-xs leading-5 text-text-subtle">
          {helper}
        </span>
      ) : null}
      {isFocused && shouldSearch && (suggestions.length > 0 || companiesQuery.isLoading || companiesQuery.isError) ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border-[0.5px] border-border bg-surface shadow-2xl shadow-black/30">
          {suggestions.length === 0 && companiesQuery.isLoading ? (
            <p className="px-3 py-2 text-sm text-text-muted">{t('tools.common.search.loading')}</p>
          ) : null}
          {suggestions.length === 0 && !companiesQuery.isLoading && companiesQuery.isError ? (
            <p className="px-3 py-2 text-sm text-text-muted">{t('tools.common.search.error')}</p>
          ) : null}
          {suggestions.length > 0
            ? suggestions.map((company) => (
                <button
                  key={company.ticker}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(company)}
                  className="grid w-full gap-1 border-b-[0.5px] border-border px-3 py-2 text-left transition last:border-b-0 hover:bg-surface-alt"
                >
                  <span className="text-sm font-bold text-text-primary">{company.ticker}</span>
                  <span className="text-xs text-text-muted">
                    {company.name}
                    {company.exchange ? ` · ${company.exchange}` : ''}
                  </span>
                </button>
              ))
            : null}
        </div>
      ) : null}
      {isFocused && shouldSearch && !companiesQuery.isLoading && !companiesQuery.isError && suggestions.length === 0 ? (
        <p className="absolute left-0 right-0 top-full z-20 mt-2 rounded-md border-[0.5px] border-border bg-surface px-3 py-2 text-sm text-text-muted shadow-2xl shadow-black/30">
          {t('tools.common.search.empty')}
        </p>
      ) : null}
    </label>
  )
}
