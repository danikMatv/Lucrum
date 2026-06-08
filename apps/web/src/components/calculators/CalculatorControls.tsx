import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChangeEvent, ReactNode } from 'react'

interface NumberInputProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  helper?: string
  labelAccessory?: ReactNode
}

interface HelpTooltipProps {
  label: string
  children: ReactNode
}

interface TextInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

interface MonthYearInputProps extends TextInputProps {
  minYear?: number
  maxYear?: number
}

interface SelectOption<T extends string | number> {
  value: T
  label: string
}

interface SelectInputProps<T extends string | number> {
  id: string
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  helper?: string
}

interface SegmentedControlProps<T extends string | number> {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
}

const controlClass =
  'w-full rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary'

export const NumberInput = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  helper,
  labelAccessory,
}: NumberInputProps) => {
  const helperId = helper ? `${id}-helper` : undefined
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value))
  }

  return (
    <label htmlFor={id} className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-medium text-text-muted">
        <span>{label}</span>
        {labelAccessory}
      </span>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={controlClass}
          aria-describedby={helperId}
        />
        {suffix ? <span className="w-12 text-sm text-text-subtle">{suffix}</span> : null}
      </div>
      {helper ? (
        <span id={helperId} className="text-xs leading-5 text-text-subtle">
          {helper}
        </span>
      ) : null}
    </label>
  )
}

export const SliderInput = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix,
  helper,
}: NumberInputProps) => {
  const helperId = helper ? `${id}-helper` : undefined
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value))
  }

  return (
    <label htmlFor={id} className="grid gap-2">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <div className="grid gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="h-2 w-full cursor-pointer accent-primary"
          aria-describedby={helperId}
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className={controlClass}
            aria-label={label}
            aria-describedby={helperId}
          />
          {suffix ? <span className="w-12 text-sm text-text-subtle">{suffix}</span> : null}
        </div>
      </div>
      {helper ? (
        <span id={helperId} className="text-xs leading-5 text-text-subtle">
          {helper}
        </span>
      ) : null}
    </label>
  )
}

export const TextInput = ({ id, label, value, onChange }: TextInputProps) => (
  <label htmlFor={id} className="grid gap-2">
    <span className="text-sm font-medium text-text-muted">{label}</span>
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={controlClass}
    />
  </label>
)

export const MonthInput = ({ id, label, value, onChange }: TextInputProps) => (
  <label htmlFor={id} className="grid gap-2">
    <span className="text-sm font-medium text-text-muted">{label}</span>
    <input
      id={id}
      type="month"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={controlClass}
    />
  </label>
)

export const MonthYearInput = ({
  id,
  label,
  value,
  onChange,
  minYear = 1980,
  maxYear = new Date().getFullYear(),
}: MonthYearInputProps) => {
  const { i18n } = useTranslation('common')
  const [selectedYear, selectedMonth] = value.split('-')
  const safeYear = Number(selectedYear) || maxYear
  const safeMonth = Number(selectedMonth) || 1
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1).padStart(2, '0'),
        label: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
          month: 'long',
        }).format(new Date(2026, index, 1)),
      })),
    [i18n.language, i18n.resolvedLanguage],
  )
  const yearOptions = useMemo(
    () =>
      Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index),
    [maxYear, minYear],
  )

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(`${safeYear}-${event.target.value}`)
  }

  const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(`${event.target.value}-${String(safeMonth).padStart(2, '0')}`)
  }

  return (
    <fieldset id={id} className="grid gap-2">
      <legend id={`${id}-label`} className="text-sm font-medium text-text-muted">
        {label}
      </legend>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <select
          aria-labelledby={`${id}-label`}
          value={String(safeMonth).padStart(2, '0')}
          onChange={handleMonthChange}
          className={controlClass}
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <select
          value={safeYear}
          onChange={handleYearChange}
          className={controlClass}
          aria-labelledby={`${id}-label`}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  )
}

export const SelectInput = <T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  helper,
}: SelectInputProps<T>) => (
  <label htmlFor={id} className="grid gap-2">
    <span className="text-sm font-medium text-text-muted">{label}</span>
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={controlClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {helper ? <span className="text-xs leading-5 text-text-subtle">{helper}</span> : null}
  </label>
)

export const SegmentedControl = <T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) => (
  <div className="grid gap-2">
    <span className="text-sm font-medium text-text-muted">{label}</span>
    <div className="flex flex-wrap gap-2 rounded-md border-[0.5px] border-border bg-surface-alt p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-w-fit flex-1 whitespace-normal rounded px-3 py-2 text-sm font-semibold leading-5 transition ${
            value === option.value
              ? 'bg-primary text-background'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
)

export const HelpTooltip = ({ label, children }: HelpTooltipProps) => (
  <span className="group relative inline-flex">
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid h-5 w-5 place-items-center rounded-full border-[0.5px] border-primary text-xs font-bold text-primary transition hover:bg-primary-dim focus:bg-primary-dim focus:outline-none"
    >
      i
    </button>
    <span
      role="tooltip"
      className="pointer-events-none absolute left-0 top-7 z-20 hidden w-64 max-w-[calc(100vw-3rem)] rounded-md border-[0.5px] border-border bg-surface p-3 text-xs font-normal leading-5 text-text-muted shadow-lg group-hover:block group-focus-within:block sm:left-1/2 sm:-translate-x-1/2"
    >
      {children}
    </span>
  </span>
)
