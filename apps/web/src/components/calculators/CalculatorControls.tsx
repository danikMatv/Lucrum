import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChangeEvent } from 'react'

interface NumberInputProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
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
}: NumberInputProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value))
  }

  return (
    <label htmlFor={id} className="grid gap-2">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={controlClass}
        />
        {suffix ? <span className="w-8 text-sm text-text-subtle">{suffix}</span> : null}
      </div>
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
}: NumberInputProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value))
  }

  return (
    <label htmlFor={id} className="grid gap-2">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-text-muted">
        <span>{label}</span>
        <span className="text-primary">
          {value}
          {suffix}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="h-2 w-full cursor-pointer accent-primary"
      />
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
      <legend className="text-sm font-medium text-text-muted">{label}</legend>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <select
          aria-label={label}
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
        <select value={safeYear} onChange={handleYearChange} className={controlClass}>
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
    <div className="grid gap-2 rounded-md border-[0.5px] border-border bg-surface-alt p-1 sm:grid-flow-col sm:auto-cols-fr">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-2 text-sm font-semibold transition ${
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
