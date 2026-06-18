import { useCallback, useEffect, useMemo, useState } from 'react'
import { learnProgressService } from '../services/learnProgressService.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import type { LessonProgress } from '../types/api.ts'

export interface StoredLessonProgress {
  completed: boolean
  quizScore?: number
  quizTotal?: number
  completedAt?: string
}

export type LessonProgressRecord = Record<string, StoredLessonProgress>

const storageKey = (topic: string) => `lesson-progress:${topic}`

const isNumberOrUndefined = (value: unknown) =>
  value === undefined || typeof value === 'number'

const isStringOrUndefined = (value: unknown) =>
  value === undefined || typeof value === 'string'

const sanitizeProgress = (value: unknown): LessonProgressRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value).reduce<LessonProgressRecord>((record, [lessonId, progress]) => {
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      return record
    }

    const candidate = progress as {
      completed?: unknown
      quizScore?: unknown
      quizTotal?: unknown
      completedAt?: unknown
    }

    if (
      typeof candidate.completed !== 'boolean' ||
      !isNumberOrUndefined(candidate.quizScore) ||
      !isNumberOrUndefined(candidate.quizTotal) ||
      !isStringOrUndefined(candidate.completedAt)
    ) {
      return record
    }

    record[lessonId] = {
      completed: candidate.completed,
      quizScore: candidate.quizScore,
      quizTotal: candidate.quizTotal,
      completedAt: candidate.completedAt,
    }
    return record
  }, {})
}

const readLocalProgress = (topic: string): LessonProgressRecord => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    return sanitizeProgress(JSON.parse(window.localStorage.getItem(storageKey(topic)) ?? '{}'))
  } catch {
    return {}
  }
}

const writeLocalProgress = (topic: string, progress: LessonProgressRecord) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey(topic), JSON.stringify(progress))
}

const scoreValue = (progress: StoredLessonProgress | LessonProgress) => {
  const score = 'quizScore' in progress ? progress.quizScore : undefined
  return typeof score === 'number' ? score : -1
}

const toStoredProgress = (progress: LessonProgress): StoredLessonProgress => ({
  completed: true,
  quizScore: progress.quizScore ?? undefined,
  quizTotal: progress.quizTotal ?? undefined,
  completedAt: progress.completedAt,
})

const mergeServerProgress = (localProgress: LessonProgressRecord, serverProgress: LessonProgress[]) => {
  const next: LessonProgressRecord = { ...localProgress }
  const uploads: Array<{ lessonId: string; progress: StoredLessonProgress }> = []

  serverProgress.forEach((serverItem) => {
    const localItem = localProgress[serverItem.lessonId]
    const storedServerItem = toStoredProgress(serverItem)

    if (localItem?.completed && scoreValue(localItem) > scoreValue(serverItem)) {
      next[serverItem.lessonId] = {
        ...localItem,
        completedAt: serverItem.completedAt,
      }
      uploads.push({ lessonId: serverItem.lessonId, progress: next[serverItem.lessonId] })
      return
    }

    next[serverItem.lessonId] = storedServerItem
  })

  const serverLessonIds = new Set(serverProgress.map((item) => item.lessonId))
  Object.entries(localProgress).forEach(([lessonId, progress]) => {
    if (progress.completed && !serverLessonIds.has(lessonId)) {
      uploads.push({ lessonId, progress })
    }
  })

  return { progress: next, uploads }
}

export const useLessonProgress = (topic: string) => {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const [progress, setProgress] = useState<LessonProgressRecord>(() => readLocalProgress(topic))
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    writeLocalProgress(topic, progress)
  }, [progress, topic])

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      return
    }

    let cancelled = false

    const syncProgress = async () => {
      setIsSyncing(true)
      try {
        const localProgress = readLocalProgress(topic)
        const serverProgress = await learnProgressService.getProgress(topic)
        const merged = mergeServerProgress(localProgress, serverProgress)

        if (!cancelled) {
          setProgress(merged.progress)
          writeLocalProgress(topic, merged.progress)
        }

        await Promise.all(
          merged.uploads.map(({ lessonId, progress: item }) =>
            learnProgressService.completeLesson(topic, lessonId, {
              quizScore: item.quizScore,
              quizTotal: item.quizTotal,
            }),
          ),
        )

        if (!cancelled && merged.uploads.length > 0) {
          const refreshedProgress = await learnProgressService.getProgress(topic)
          const refreshed = mergeServerProgress(merged.progress, refreshedProgress)
          setProgress(refreshed.progress)
          writeLocalProgress(topic, refreshed.progress)
        }
      } finally {
        if (!cancelled) {
          setIsSyncing(false)
        }
      }
    }

    void syncProgress()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, topic, user])

  const markLessonComplete = useCallback(
    (lessonId: string, quizScore?: number, quizTotal?: number) => {
      const completedAt = new Date().toISOString()
      const nextProgress: StoredLessonProgress = {
        completed: true,
        quizScore,
        quizTotal,
        completedAt,
      }

      setProgress((current) => {
        const currentProgress = current[lessonId]
        const shouldKeepCurrent =
          currentProgress?.completed && scoreValue(currentProgress) > scoreValue(nextProgress)

        return {
          ...current,
          [lessonId]: shouldKeepCurrent
            ? { ...currentProgress, completedAt: currentProgress.completedAt ?? completedAt }
            : nextProgress,
        }
      })

      if (isAuthenticated && user) {
        void learnProgressService
          .completeLesson(topic, lessonId, { quizScore, quizTotal })
          .catch(() => undefined)
      }
    },
    [isAuthenticated, topic, user],
  )

  const completedCount = useMemo(
    () => Object.values(progress).filter((item) => item.completed).length,
    [progress],
  )

  return {
    progress,
    completedCount,
    isSyncing,
    markLessonComplete,
  }
}
