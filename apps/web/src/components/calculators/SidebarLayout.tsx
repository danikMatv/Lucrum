import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { AppFooter } from '../AppFooter.tsx'
import { AppHeader } from '../AppHeader.tsx'

interface SidebarLayoutProps {
  title: string
  description: string
  sidebar: ReactNode
  children: ReactNode
}

export const SidebarLayout = ({ title, description, sidebar, children }: SidebarLayoutProps) => {
  const { t } = useTranslation('common')

  return (
    <main className="min-h-svh bg-background text-text-primary">
      <AppHeader compact />

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="self-start rounded-lg border-[0.5px] border-border bg-surface p-5 lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase text-primary">{t('tools.common.inputs')}</p>
          <div className="mt-5 grid gap-5">{sidebar}</div>
        </aside>

        <section className="min-w-0">
          <div className="mb-6">
            <h1 className="font-heading text-4xl font-bold leading-tight text-text-primary md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">{description}</p>
          </div>
          {children}
        </section>
      </div>
      <AppFooter />
    </main>
  )
}
