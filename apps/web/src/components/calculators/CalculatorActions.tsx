import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ShareParamValue = string | number | boolean | null | undefined

interface CalculatorActionsProps {
  params: Record<string, ShareParamValue>
  onReset: () => void
}

const buildShareUrl = (params: Record<string, ShareParamValue>) => {
  const url = new URL(window.location.href)
  url.search = ''

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

export const CalculatorActions = ({ params, onReset }: CalculatorActionsProps) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => buildShareUrl(params), [params])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt(t('tools.common.shareFallback'), shareUrl)
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border-[0.5px] border-border bg-surface p-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border-[0.5px] border-border px-4 py-3 text-sm font-bold text-text-primary transition hover:border-border-hover hover:bg-surface-alt"
      >
        {t('tools.common.reset')}
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90"
      >
        {copied ? t('tools.common.linkCopied') : t('tools.common.copyLink')}
      </button>
    </div>
  )
}
