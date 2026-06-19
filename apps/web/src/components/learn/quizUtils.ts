import type { LessonQuizQuestion } from './LessonQuiz.tsx'

const isQuizQuestion = (value: unknown): value is LessonQuizQuestion => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as {
    question?: unknown
    options?: unknown
    correctIndex?: unknown
    explanation?: unknown
  }

  return (
    typeof candidate.question === 'string' &&
    Array.isArray(candidate.options) &&
    candidate.options.every((option) => typeof option === 'string') &&
    typeof candidate.correctIndex === 'number' &&
    typeof candidate.explanation === 'string'
  )
}

export const getQuizQuestions = (value: unknown) =>
  Array.isArray(value) ? value.filter(isQuizQuestion) : []
