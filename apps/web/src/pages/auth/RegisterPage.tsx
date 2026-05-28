import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/useAuthStore.ts'
import { parseApiError } from '../../utils/errorHandler.ts'

export const RegisterPage = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t('auth.register.passwordLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.register.passwordMismatch'))
      return
    }

    try {
      await register(firstName, lastName, email, password)
      navigate('/dashboard')
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
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.firstName')}</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.lastName')}</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                required
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-muted">{t('auth.fields.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.password')}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-muted">{t('auth.fields.confirmPassword')}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-md border-[0.5px] border-border bg-surface-alt px-3 py-3 text-sm text-text-primary outline-none focus:border-primary"
                required
              />
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
          <Link to="/auth/login" className="font-semibold text-primary">
            {t('buttons.login')}
          </Link>
        </p>
      </section>
    </main>
  )
}
