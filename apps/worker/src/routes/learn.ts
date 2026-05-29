import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import {
  createLearnResource,
  getLearnResourceById,
  listLearnResources,
  softDeleteLearnResource,
  updateLearnResource,
} from '../db/queries'
import { authMiddleware } from '../middleware/auth'
import { requireMinRole } from '../middleware/role'
import type { AppEnv } from '../types'
import { UserRole } from '../types'
import { createError, createSuccess } from '../utils/response'

const learn = new Hono<AppEnv>()

const topicSchema = z.enum(['bonds', 'stocks', 'etfs-funds', 'crypto', 'venture', 'cash-risk'])
const resourceTypeSchema = z.enum(['article', 'video', 'post', 'podcast', 'tool'])

const topicParamSchema = z.object({
  topic: topicSchema,
})

const resourceParamSchema = topicParamSchema.extend({
  id: z.string().min(1),
})

const createResourceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  url: z.string().trim().url().max(2048),
  type: resourceTypeSchema.default('article'),
  description: z.string().trim().max(500).optional(),
})

const updateResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    url: z.string().trim().url().max(2048).optional(),
    type: resourceTypeSchema.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

const validatorHook = (result: { success: boolean; error?: { message: string } }, c: Context) => {
  if (!result.success) {
    return c.json(createError('VALIDATION_ERROR', result.error?.message ?? 'Invalid request'), 400)
  }
}

const formatUserName = (user: { firstName: string | null; lastName: string | null; email: string }) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return fullName || user.email
}

const canManageResource = (
  user: { id: string; role: UserRole },
  resource: { addedBy: string | null },
) => user.role === UserRole.ADMIN || resource.addedBy === user.id

learn.get(
  '/:topic/resources',
  zValidator('param', topicParamSchema, validatorHook),
  async (c) => {
    const { topic } = c.req.valid('param')
    return c.json(createSuccess(await listLearnResources(c.env.DB, topic)))
  },
)

learn.post(
  '/:topic/resources',
  authMiddleware,
  requireMinRole(UserRole.MODERATOR),
  zValidator('param', topicParamSchema, validatorHook),
  zValidator('json', createResourceSchema, validatorHook),
  async (c) => {
    const user = c.get('user')
    const { topic } = c.req.valid('param')
    const body = c.req.valid('json')
    const resource = await createLearnResource(c.env.DB, {
      topic,
      title: body.title,
      url: body.url,
      type: body.type,
      description: body.description ?? null,
      addedBy: user.id,
      addedByName: formatUserName(user),
    })

    return c.json(createSuccess(resource), 201)
  },
)

learn.patch(
  '/:topic/resources/:id',
  authMiddleware,
  requireMinRole(UserRole.MODERATOR),
  zValidator('param', resourceParamSchema, validatorHook),
  zValidator('json', updateResourceSchema, validatorHook),
  async (c) => {
    const user = c.get('user')
    const { topic, id } = c.req.valid('param')
    const resource = await getLearnResourceById(c.env.DB, topic, id)

    if (!resource) {
      return c.json(createError('RESOURCE_NOT_FOUND', 'Resource not found'), 404)
    }

    if (!canManageResource(user, resource)) {
      return c.json(createError('FORBIDDEN', 'Insufficient permissions'), 403)
    }

    const body = c.req.valid('json')
    const updated = await updateLearnResource(c.env.DB, topic, id, {
      title: body.title,
      url: body.url,
      type: body.type,
      description: body.description,
      isActive: body.is_active,
    })

    if (!updated) {
      return c.json(createError('RESOURCE_NOT_FOUND', 'Resource not found'), 404)
    }

    return c.json(createSuccess(updated))
  },
)

learn.delete(
  '/:topic/resources/:id',
  authMiddleware,
  requireMinRole(UserRole.MODERATOR),
  zValidator('param', resourceParamSchema, validatorHook),
  async (c) => {
    const user = c.get('user')
    const { topic, id } = c.req.valid('param')
    const resource = await getLearnResourceById(c.env.DB, topic, id)

    if (!resource) {
      return c.json(createError('RESOURCE_NOT_FOUND', 'Resource not found'), 404)
    }

    if (!canManageResource(user, resource)) {
      return c.json(createError('FORBIDDEN', 'Insufficient permissions'), 403)
    }

    await softDeleteLearnResource(c.env.DB, topic, id)
    return c.json(createSuccess({ deleted: true }))
  },
)

export default learn
