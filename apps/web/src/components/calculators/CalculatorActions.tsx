import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type ShareParamValue = string | number | boolean | null | undefined

interface CalculatorActionsProps {
  params: Record<string, ShareParamValue>
  onReset: () => void
  onSave?: () => void
  saveLabel?: string
  isSaving?: boolean
}

const buildShareUrl = (params: Record<string, ShareParamValue>) => {
  if (typeof window === 'undefined') {
    return ''
  }

  const url = new URL(window.location.href)
  url.search = ''

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

export const CalculatorActions = ({
  params,
  onReset,
  onSave,
  saveLabel,
  isSaving = false,
}: CalculatorActionsProps) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const shareUrl = buildShareUrl(params)

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt(t('tools.common.shareFallback'), shareUrl)
    }
  }

  return (
    <div className={`grid gap-3 rounded-lg border-[0.5px] border-border bg-surface p-4 ${onSave ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border-[0.5px] border-border px-4 py-3 text-sm font-bold text-text-muted transition hover:border-danger/70 hover:bg-danger/10 hover:text-danger"
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
      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-md border-[0.5px] border-primary px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t('common.loading') : saveLabel ?? t('tools.common.saveScenario')}
        </button>
      ) : null}
    </div>
  )
}
