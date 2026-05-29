import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { learnService, type LearnResourceInput } from '../../services/learnService.ts'
import { useAuthStore } from '../../store/useAuthStore.ts'
import type { LearnResource, LearnResourceType } from '../../types/api.ts'
import { UserRole } from '../../types/api.ts'
import { parseApiError } from '../../utils/errorHandler.ts'

interface LearnResourcesProps {
  topic: string
}

const resourceTypes: LearnResourceType[] = ['article', 'video', 'post', 'podcast', 'tool']

const canManageLinks = (role?: string) => role === UserRole.MODERATOR || role === UserRole.ADMIN

const canManageResource = (resource: LearnResource, userId?: string, role?: string) =>
  role === UserRole.ADMIN || (role === UserRole.MODERATOR && resource.addedBy === userId)

const createInitialForm = (): LearnResourceInput => ({
  title: '',
  url: '',
  type: 'article',
  description: '',
})

export const LearnResources = ({ topic }: LearnResourcesProps) => {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [form, setForm] = useState(createInitialForm)
  const [editingResource, setEditingResource] = useState<LearnResource | null>(null)
  const canManage = canManageLinks(user?.role)

  const resourcesQuery = useQuery({
    queryKey: ['learn-resources', topic],
    queryFn: () => learnService.getResources(topic),
    staleTime: 5 * 60 * 1000,
  })
  const resources = resourcesQuery.data ?? []

  const resetForm = () => {
    setForm(createInitialForm())
    setEditingResource(null)
  }

  const invalidateResources = async () => {
    await queryClient.invalidateQueries({ queryKey: ['learn-resources', topic] })
  }

  const addMutation = useMutation({
    mutationFn: (input: LearnResourceInput) => learnService.addResource(topic, input),
    onSuccess: async () => {
      resetForm()
      await invalidateResources()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: LearnResourceInput) => {
      if (!editingResource) {
        throw new Error(t('learnResources.errors.noResource'))
      }
      return learnService.updateResource(topic, editingResource.id, input)
    },
    onSuccess: async () => {
      resetForm()
      await invalidateResources()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => learnService.deleteResource(topic, id),
    onSuccess: invalidateResources,
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = {
      title: form.title.trim(),
      url: form.url.trim(),
      type: form.type,
      description: form.description?.trim() || undefined,
    }

    if (editingResource) {
      updateMutation.mutate(input)
      return
    }

    addMutation.mutate(input)
  }

  const handleEdit = (resource: LearnResource) => {
    setEditingResource(resource)
    setForm({
      title: resource.title,
      url: resource.url,
      type: resource.type,
      description: resource.description ?? '',
    })
  }

  const mutationError = addMutation.error ?? updateMutation.error ?? deleteMutation.error

  return (
    <section className="rounded-lg border-[0.5px] border-border bg-surface p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">
            {t('learnResources.kicker')}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">
            {t('learnResources.title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            {t('learnResources.description')}
          </p>
        </div>
      </div>

      {resourcesQuery.isLoading ? (
        <p className="mt-6 text-sm text-text-muted">{t('learnResources.loading')}</p>
      ) : resourcesQuery.isError ? (
        <p className="mt-6 rounded-md border-[0.5px] border-danger px-4 py-3 text-sm text-danger">
          {parseApiError(resourcesQuery.error, t('learnResources.error'))}
        </p>
      ) : resources.length === 0 ? (
        <p className="mt-6 rounded-md border-[0.5px] border-border px-4 py-3 text-sm text-text-muted">
          {t('learnResources.empty')}
        </p>
      ) : (
        <div className="mt-6 grid gap-3">
          {resources.map((resource) => (
            <article
              key={resource.id}
              className="rounded-md border-[0.5px] border-border p-4 transition hover:border-border-hover"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <span className="inline-flex rounded-md bg-surface-hover px-2 py-1 text-xs font-bold uppercase text-primary">
                    {t(`learnResources.types.${resource.type}`)}
                  </span>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block text-lg font-bold text-text-primary transition hover:text-primary"
                  >
                    {resource.title}
                  </a>
                  {resource.description ? (
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {resource.description}
                    </p>
                  ) : null}
                  {resource.addedByName ? (
                    <p className="mt-3 text-xs font-semibold uppercase text-text-muted">
                      {t('learnResources.addedBy', { name: resource.addedByName })}
                    </p>
                  ) : null}
                </div>

                {canManageResource(resource, user?.id, user?.role) ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(resource)}
                      className="rounded-md border-[0.5px] border-border px-3 py-2 text-xs font-bold text-text-primary transition hover:border-border-hover hover:bg-surface-hover"
                    >
                      {t('learnResources.actions.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(resource.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded-md border-[0.5px] border-danger px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('learnResources.actions.delete')}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {canManage ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 rounded-md border-[0.5px] border-border p-4"
        >
          <h3 className="text-lg font-bold text-text-primary">
            {editingResource ? t('learnResources.editTitle') : t('learnResources.manageTitle')}
          </h3>

          {mutationError ? (
            <p className="rounded-md border-[0.5px] border-danger px-4 py-3 text-sm text-danger">
              {parseApiError(mutationError, t('learnResources.error'))}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-text-muted">
              {t('learnResources.fields.title')}
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="rounded-md border-[0.5px] border-border bg-background px-3 py-3 text-text-primary outline-none transition focus:border-primary"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-text-muted">
              {t('learnResources.fields.url')}
              <input
                type="url"
                value={form.url}
                onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                className="rounded-md border-[0.5px] border-border bg-background px-3 py-3 text-text-primary outline-none transition focus:border-primary"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-text-muted">
              {t('learnResources.fields.type')}
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as LearnResourceType,
                  }))
                }
                className="rounded-md border-[0.5px] border-border bg-background px-3 py-3 text-text-primary outline-none transition focus:border-primary"
              >
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`learnResources.types.${type}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-text-muted md:col-span-2">
              {t('learnResources.fields.description')}
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="min-h-24 rounded-md border-[0.5px] border-border bg-background px-3 py-3 text-text-primary outline-none transition focus:border-primary"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={addMutation.isPending || updateMutation.isPending}
              className="rounded-md bg-primary px-5 py-3 text-sm font-bold text-background transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingResource
                ? t('learnResources.actions.save')
                : t('learnResources.actions.add')}
            </button>
            {editingResource ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border-[0.5px] border-border px-5 py-3 text-sm font-bold text-text-primary transition hover:border-border-hover hover:bg-surface-hover"
              >
                {t('learnResources.actions.cancel')}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  )
}
