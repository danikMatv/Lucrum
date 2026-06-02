import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminService } from '../services/adminService.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import { parseApiError } from '../utils/errorHandler.ts'
import { UserRole, type AdminUser, type UserRole as UserRoleType } from '../types/api.ts'

const roleOptions: UserRoleType[] = [
  UserRole.USER,
  UserRole.USER_PRO,
  UserRole.MODERATOR,
  UserRole.ADMIN,
]

const sumCounts = (rows: Array<{ count: number }>) =>
  rows.reduce((total, row) => total + row.count, 0)

const formatPercent = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'

export const AdminPage = () => {
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()
  const logout = useAuthStore((state) => state.logout)

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: 'short',
        day: 'numeric',
      }),
    [i18n.language],
  )

  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [i18n.language],
  )

  const userStatsQuery = useQuery({
    queryKey: ['admin', 'stats', 'users'],
    queryFn: adminService.getUserStats,
  })

  const toolStatsQuery = useQuery({
    queryKey: ['admin', 'stats', 'tools'],
    queryFn: adminService.getToolStats,
  })

  const tickerStatsQuery = useQuery({
    queryKey: ['admin', 'stats', 'tickers'],
    queryFn: adminService.getTickerStats,
  })

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminService.getUsers(1, 20),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRoleType }) =>
      adminService.updateUserRole(id, role),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats', 'users'] }),
      ])
    },
  })

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminService.updateUserActiveState(id, isActive),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats', 'users'] }),
      ])
    },
  })

  const userStats = userStatsQuery.data
  const toolStats = toolStatsQuery.data ?? []
  const tickerStats = tickerStatsQuery.data ?? []
  const users = usersQuery.data ?? []
  const newUsers7 = userStats ? sumCounts(userStats.newUsersLast7Days) : 0
  const newUsers30 = userStats ? sumCounts(userStats.newUsersLast30Days) : 0
  const activeUsers = userStats?.activeVsInactive.active ?? 0
  const inactiveUsers = userStats?.activeVsInactive.inactive ?? 0
  const totalUsers = userStats?.total ?? 0
  const isLoading =
    userStatsQuery.isLoading ||
    toolStatsQuery.isLoading ||
    tickerStatsQuery.isLoading ||
    usersQuery.isLoading

  const growthRows =
    userStats?.newUsersLast30Days.map((row) => ({
      ...row,
      label: dateFormatter.format(new Date(`${row.date}T00:00:00.000Z`)),
    })) ?? []

  const roleRows =
    userStats?.breakdownByRole.map((row) => ({
      ...row,
      label: t(`admin.roles.${row.role}`),
    })) ?? []

  const errorMessage = useMemo(() => {
    const error =
      userStatsQuery.error ??
      toolStatsQuery.error ??
      tickerStatsQuery.error ??
      usersQuery.error ??
      roleMutation.error ??
      activeMutation.error
    return error ? parseApiError(error, t('errors.generic'), t('errors.validation')) : ''
  }, [
    activeMutation.error,
    roleMutation.error,
    t,
    tickerStatsQuery.error,
    toolStatsQuery.error,
    userStatsQuery.error,
    usersQuery.error,
  ])

  const formatDate = (date: string) => fullDateFormatter.format(new Date(date))
  const formatChartDate = (date: string) =>
    dateFormatter.format(new Date(`${date}T00:00:00.000Z`))

  const getUserName = (user: AdminUser) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    return fullName || t('admin.users.noName')
  }

  const getToolLabel = (toolType: string) => {
    const key = `admin.toolTypes.${toolType}`
    const label = t(key)
    return label === key ? toolType : label
  }

  const handleLogout = () => {
    void logout()
  }

  return (
    <main className="min-h-svh bg-background text-text-primary">
      <header className="border-b-[0.5px] border-border">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-5 lg:px-8">
          <Link
            to="/"
            className="font-heading text-2xl font-bold tracking-[0.28em] text-primary"
          >
            {t('brand.name')}
          </Link>
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              to="/dashboard"
              className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
            >
              {t('admin.dashboardLink')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border-[0.5px] border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-border-hover hover:bg-surface"
            >
              {t('buttons.logout')}
            </button>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">{t('admin.kicker')}</p>
          <h1 className="mt-3 font-heading text-5xl font-bold leading-tight text-text-primary md:text-7xl">
            {t('admin.title')}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
            {t('admin.description')}
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border-[0.5px] border-danger bg-surface p-4 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('admin.metrics.totalUsers')}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">
              {isLoading ? '—' : totalUsers}
            </p>
          </section>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('admin.metrics.new7')}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{isLoading ? '—' : newUsers7}</p>
          </section>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('admin.metrics.new30')}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">
              {isLoading ? '—' : newUsers30}
            </p>
          </section>
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{t('admin.metrics.activeShare')}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">
              {isLoading ? '—' : formatPercent(activeUsers, totalUsers)}
            </p>
            <p className="mt-2 text-xs text-text-subtle">
              {t('admin.metrics.activeInactive', { active: activeUsers, inactive: inactiveUsers })}
            </p>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-text-primary">{t('admin.charts.growth')}</h2>
              <span className="text-xs font-semibold uppercase text-text-muted">
                {t('admin.charts.last30')}
              </span>
            </div>
            <div className="mt-5 h-72">
              {growthRows.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthRows}>
                    <CartesianGrid stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="label" stroke="#666666" tickLine={false} />
                    <YAxis stroke="#666666" allowDecimals={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#111111',
                        border: '0.5px solid #1E1E1E',
                        color: '#FFFFFF',
                      }}
                      labelFormatter={(_, payload) => {
                        const date = payload?.[0]?.payload?.date as string | undefined
                        return date ? formatChartDate(date) : ''
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#C9A84C"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-text-muted">{t('admin.empty')}</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-text-primary">{t('admin.charts.roles')}</h2>
            <div className="mt-5 h-72">
              {roleRows.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleRows}>
                    <CartesianGrid stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="label" stroke="#666666" tickLine={false} />
                    <YAxis stroke="#666666" allowDecimals={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#111111',
                        border: '0.5px solid #1E1E1E',
                        color: '#FFFFFF',
                      }}
                    />
                    <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-text-muted">{t('admin.empty')}</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-text-primary">{t('admin.activity.tools')}</h2>
            <div className="mt-5 grid gap-3">
              {toolStats.length > 0 ? (
                toolStats.map((tool) => (
                  <div key={tool.toolType} className="rounded-md border-[0.5px] border-border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-bold text-text-primary">{getToolLabel(tool.toolType)}</p>
                      <p className="text-sm font-bold text-primary">{tool.count}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">{t('admin.empty')}</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-text-primary">{t('admin.activity.tickers')}</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {tickerStats.length > 0 ? (
                tickerStats.slice(0, 16).map((ticker) => (
                  <span
                    key={ticker.ticker}
                    className="rounded-md border-[0.5px] border-border px-3 py-2 text-sm font-semibold text-text-muted"
                  >
                    <span className="text-text-primary">{ticker.ticker}</span>
                    <span className="ml-2 text-primary">{ticker.count}</span>
                  </span>
                ))
              ) : (
                <p className="text-sm text-text-muted">{t('admin.empty')}</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-lg border-[0.5px] border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-text-primary">{t('admin.users.title')}</h2>
            <span className="text-xs font-semibold uppercase text-text-muted">
              {t('admin.users.latest')}
            </span>
          </div>

          {usersQuery.isLoading ? (
            <p className="mt-5 text-sm text-text-muted">{t('common.loading')}</p>
          ) : users.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-[0.5px] border-border text-text-muted">
                    <th className="py-3 pr-4 font-semibold">{t('admin.users.user')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('admin.users.role')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('admin.users.status')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('admin.users.created')}</th>
                    <th className="py-3 font-semibold">{t('admin.users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="border-b-[0.5px] border-border last:border-0">
                      <td className="py-4 pr-4">
                        <p className="font-bold text-text-primary">{getUserName(item)}</p>
                        <p className="mt-1 text-text-muted">{item.email}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <select
                          value={item.role}
                          onChange={(event) =>
                            roleMutation.mutate({
                              id: item.id,
                              role: event.target.value as UserRoleType,
                            })
                          }
                          disabled={roleMutation.isPending}
                          className="rounded-md border-[0.5px] border-border bg-background px-3 py-2 text-text-primary outline-none transition focus:border-primary disabled:opacity-60"
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {t(`admin.roles.${role}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`rounded-md px-3 py-1 text-xs font-bold uppercase ${
                            item.isActive
                              ? 'bg-primary-dim text-success'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {item.isActive ? t('admin.users.active') : t('admin.users.inactive')}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-text-muted">{formatDate(item.createdAt)}</td>
                      <td className="py-4">
                        <button
                          type="button"
                          onClick={() =>
                            activeMutation.mutate({ id: item.id, isActive: !item.isActive })
                          }
                          disabled={activeMutation.isPending}
                          className="rounded-md border-[0.5px] border-border px-3 py-2 text-xs font-bold text-text-primary transition hover:border-border-hover hover:bg-surface-hover disabled:opacity-60"
                        >
                          {item.isActive ? t('admin.users.deactivate') : t('admin.users.activate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 text-sm text-text-muted">{t('admin.users.empty')}</p>
          )}
        </section>
      </section>
    </main>
  )
}
