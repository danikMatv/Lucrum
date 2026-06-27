import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/useAuthStore.ts'
import { parseApiError } from '../../utils/errorHandler.ts'

const getSafeReturnTo = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type RegisterField = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword'

export const RegisterPage = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const register = useAuthStore((state) => state.register)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterField, string>>>({})
  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const loginPath = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const nextFieldErrors: Partial<Record<RegisterField, string>> = {}
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedFirstName) {
      nextFieldErrors.firstName = t('auth.validation.required')
    }

    if (!trimmedLastName) {
      nextFieldErrors.lastName = t('auth.validation.required')
    }

    if (!trimmedEmail) {
      nextFieldErrors.email = t('auth.validation.required')
    } else if (!emailPattern.test(trimmedEmail)) {
      nextFieldErrors.email = t('auth.validation.email')
    }

    if (password.length < 8) {
      nextFieldErrors.password = password
        ? t('auth.register.passwordLength')
        : t('auth.validation.required')
    }

    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = t('auth.validation.required')
    } else if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = t('auth.register.passwordMismatch')
    }

    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      if (nextFieldErrors.firstName) firstNameRef.current?.focus()
      else if (nextFieldErrors.lastName) lastNameRef.current?.focus()
      else if (nextFieldErrors.email) emailRef.current?.focus()
      else if (nextFieldErrors.password) passwordRef.current?.focus()
      else confirmPasswordRef.current?.focus()
      return
    }

    try {
      await register(trimmedFirstName, trimmedLastName, trimmedEmail, password)
      navigate(returnTo)
    } catch (registerError) {
      setError(parseApiError(registerError, t('errors.generic')))
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-10 text-text-primary">
      <section className="w-full max-w-xl rounded-lg border-[0.5px] border-border bg-surface p-6">
        <Link to="/" className="block text-center font-heading text-3xl font-bold tracking-[0.28em] text-primary">
          {t('brand.name')}
        </Link>
        <h1 className="mt-8 font-heading text-4xl font-bold text-text-primary">{t('auth.register.title')}</h1>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.firstName')}</span>
              <input
                ref={firstNameRef}
                id="register-first-name"
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value)
                  setFieldErrors((current) => ({ ...current, firstName: undefined }))
                }}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                autoComplete="given-name"
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? 'register-first-name-error' : undefined}
              />
              {fieldErrors.firstName ? (
                <span id="register-first-name-error" className="text-sm text-danger">
                  {fieldErrors.firstName}
                </span>
              ) : null}
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.lastName')}</span>
              <input
                ref={lastNameRef}
                id="register-last-name"
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value)
                  setFieldErrors((current) => ({ ...current, lastName: undefined }))
                }}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                autoComplete="family-name"
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={fieldErrors.lastName ? 'register-last-name-error' : undefined}
              />
              {fieldErrors.lastName ? (
                <span id="register-last-name-error" className="text-sm text-danger">
                  {fieldErrors.lastName}
                </span>
              ) : null}
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-muted">{t('auth.fields.email')}</span>
            <input
              ref={emailRef}
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setFieldErrors((current) => ({ ...current, email: undefined }))
              }}
              className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            />
            {fieldErrors.email ? (
              <span id="register-email-error" className="text-sm text-danger">
                {fieldErrors.email}
              </span>
            ) : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.password')}</span>
              <input
                ref={passwordRef}
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((current) => ({ ...current, password: undefined }))
                }}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
              />
              {fieldErrors.password ? (
                <span id="register-password-error" className="text-sm text-danger">
                  {fieldErrors.password}
                </span>
              ) : null}
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.confirmPassword')}</span>
              <input
                ref={confirmPasswordRef}
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setFieldErrors((current) => ({ ...current, confirmPassword: undefined }))
                }}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined
                }
              />
              {fieldErrors.confirmPassword ? (
                <span id="register-confirm-password-error" className="text-sm text-danger">
                  {fieldErrors.confirmPassword}
                </span>
              ) : null}
            </label>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('auth.common.loading') : t('auth.register.submit')}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-text-muted">
          {t('auth.register.hasAccount')}{' '}
          <Link to={loginPath} className="font-semibold text-primary">
            {t('buttons.login')}
          </Link>
        </p>
      </section>
    </main>
  )
}
