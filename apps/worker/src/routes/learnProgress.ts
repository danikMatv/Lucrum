import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import {
  insertUserBadge,
  listLessonProgress,
  listUserBadges,
  upsertLessonProgress,
} from '../db/queries'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv, LessonProgress } from '../types'
import { createError, createSuccess } from '../utils/response'

const learnProgress = new Hono<AppEnv>()

const stockLessons = [
  'foundation',
  'plan',
  'truthsMyths',
  'riskProfile',
  'assetMap',
  'compound',
  'analysisTypes',
  'etfBridge',
  'qualityCompany',
  'profile',
  'statements',
  'balanceSheet',
  'cashFlow',
  'profitability',
  'valuation',
  'entry',
  'technicalIndicators',
] as const

const badgeIds = ['first_lesson', 'half_course', 'course_complete', 'quiz_master'] as const

const topicSchema = z.enum(['bonds', 'stocks', 'etfs-funds', 'crypto', 'venture', 'cash-risk'])
const stockLessonSchema = z.enum(stockLessons)

const topicParamSchema = z.object({
  topic: topicSchema,
})

const progressParamSchema = topicParamSchema.extend({
  lesson: z.string().min(1),
})

const progressBodySchema = z
  .object({
    quizScore: z.number().int().min(0).optional(),
    quizTotal: z.number().int().min(1).optional(),
  })
  .refine((value) => (value.quizScore === undefined) === (value.quizTotal === undefined), {
    message: 'quizScore and quizTotal must be sent together',
  })
  .refine(
    (value) =>
      value.quizScore === undefined ||
      value.quizTotal === undefined ||
      value.quizScore <= value.quizTotal,
    {
      message: 'quizScore cannot be greater than quizTotal',
    },
  )

const validatorHook = (result: { success: boolean; error?: { message: string } }, c: Context) => {
  if (!result.success) {
    return c.json(createError('VALIDATION_ERROR', result.error?.message ?? 'Invalid request'), 400)
  }
}

const isPerfectCourse = (progress: LessonProgress[]) => {
  const perfectLessons = new Set(
    progress
      .filter(
        (item) =>
          item.quizTotal !== null && item.quizTotal > 0 && item.quizScore === item.quizTotal,
      )
      .map((item) => item.lessonId),
  )

  return stockLessons.every((lesson) => perfectLessons.has(lesson))
}

const calculateBadges = (topic: string, progress: LessonProgress[]) => {
  if (topic !== 'stocks') {
    return []
  }

  const completedCount = new Set(progress.map((item) => item.lessonId)).size
  const earned: Array<(typeof badgeIds)[number]> = []

  if (completedCount >= 1) {
    earned.push('first_lesson')
  }
  if (completedCount >= Math.ceil(stockLessons.length / 2)) {
    earned.push('half_course')
  }
  if (completedCount >= stockLessons.length) {
    earned.push('course_complete')
  }
  if (isPerfectCourse(progress)) {
    earned.push('quiz_master')
  }

  return earned
}

learnProgress.get('/badges', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json(createSuccess(await listUserBadges(c.env.DB, user.id)))
})

learnProgress.get(
  '/:topic/progress',
  authMiddleware,
  zValidator('param', topicParamSchema, validatorHook),
  async (c) => {
    const user = c.get('user')
    const { topic } = c.req.valid('param')
    return c.json(createSuccess(await listLessonProgress(c.env.DB, user.id, topic)))
  },
)

learnProgress.post(
  '/:topic/:lesson/progress',
  authMiddleware,
  zValidator('param', progressParamSchema, validatorHook),
  zValidator('json', progressBodySchema, validatorHook),
  async (c) => {
    const user = c.get('user')
    const { topic, lesson } = c.req.valid('param')
    const body = c.req.valid('json')

    if (topic === 'stocks' && !stockLessonSchema.safeParse(lesson).success) {
      return c.json(createError('VALIDATION_ERROR', 'Unknown stock lesson'), 400)
    }

    if (topic !== 'stocks') {
      return c.json(createError('VALIDATION_ERROR', 'Progress is only available for stocks'), 400)
    }

    const progress = await upsertLessonProgress(c.env.DB, {
      userId: user.id,
      topic,
      lessonId: lesson,
      quizScore: body.quizScore ?? null,
      quizTotal: body.quizTotal ?? null,
    })

    const allProgress = await listLessonProgress(c.env.DB, user.id, topic)
    const existingBadges = new Set((await listUserBadges(c.env.DB, user.id)).map((badge) => badge.badgeId))
    const earnedBadges = calculateBadges(topic, allProgress)
    const newBadges = earnedBadges.filter((badgeId) => !existingBadges.has(badgeId))

    await Promise.all(newBadges.map((badgeId) => insertUserBadge(c.env.DB, user.id, badgeId)))

    return c.json(createSuccess({ progress, newBadges }))
  },
)

export default learnProgress
