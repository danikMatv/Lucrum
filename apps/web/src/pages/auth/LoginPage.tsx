import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/useAuthStore.ts'
import { parseApiError } from '../../utils/errorHandler.ts'

const getSafeReturnTo = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'

export const LoginPage = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const registerPath = `/auth/register?returnTo=${encodeURIComponent(returnTo)}`

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate(returnTo)
    } catch (loginError) {
      setError(parseApiError(loginError, t('errors.generic')))
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-10 text-text-primary">
      <section className="w-full max-w-md rounded-lg border-[0.5px] border-border bg-surface p-6">
        <Link to="/" className="block text-center font-heading text-3xl font-bold tracking-[0.28em] text-primary">
          {t('brand.name')}
        </Link>
        <h1 className="mt-8 font-heading text-4xl font-bold text-text-primary">{t('auth.login.title')}</h1>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
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
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('auth.common.loading') : t('buttons.login')}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-text-muted">
          {t('auth.login.noAccount')}{' '}
          <Link to={registerPath} className="font-semibold text-primary">
            {t('buttons.getStarted')}
          </Link>
        </p>
      </section>
    </main>
  )
}
