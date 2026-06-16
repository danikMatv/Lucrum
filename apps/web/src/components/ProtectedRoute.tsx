import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRole } from '../types/api.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { t } = useTranslation('common')
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="grid min-h-svh place-items-center bg-background text-text-primary">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </main>
    )
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  if (requireAdmin && user?.role !== UserRole.ADMIN) {
    return (
      <main className="grid min-h-svh place-items-center bg-background px-6 text-text-primary">
        <section className="max-w-md rounded-lg border-[0.5px] border-border bg-surface p-6 text-center">
          <p className="text-sm font-semibold uppercase text-danger">{t('auth.forbidden.kicker')}</p>
          <h1 className="mt-3 font-heading text-4xl font-bold text-text-primary">
            {t('auth.forbidden.title')}
          </h1>
          <p className="mt-4 text-sm leading-6 text-text-muted">{t('auth.forbidden.description')}</p>
        </section>
      </main>
    )
  }

  return children
}
