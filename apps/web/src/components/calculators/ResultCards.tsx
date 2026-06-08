import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger' | 'primary'
  helper?: string
}

interface PanelProps {
  children: ReactNode
  className?: string
}

const toneClass = {
  default: 'text-text-primary',
  success: 'text-success',
  danger: 'text-danger',
  primary: 'text-primary',
} as const

export const Panel = ({ children, className = '' }: PanelProps) => (
  <div className={`rounded-lg border-[0.5px] border-border bg-surface p-5 ${className}`}>
    {children}
  </div>
)

export const StatCard = ({ label, value, tone = 'default', helper }: StatCardProps) => (
  <Panel>
    <p className="text-sm text-text-muted">{label}</p>
    <p className={`mt-2 text-2xl font-bold ${toneClass[tone]}`}>{value}</p>
    {helper ? <p className="mt-3 text-xs leading-5 text-text-subtle">{helper}</p> : null}
  </Panel>
)

export const StatGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>
)

export const HeroMetric = ({
  label,
  value,
  helper,
  tone = 'primary',
}: StatCardProps & { helper?: string }) => (
  <Panel className="bg-surface-alt">
    <p className="text-sm font-semibold uppercase text-text-subtle">{label}</p>
    <p
      key={value}
      className={`metric-pop mt-3 font-heading text-5xl font-bold leading-tight ${toneClass[tone]}`}
    >
      {value}
    </p>
    {helper ? <p className="mt-3 text-sm leading-6 text-text-muted">{helper}</p> : null}
  </Panel>
)
