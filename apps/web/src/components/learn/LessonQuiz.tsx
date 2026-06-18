import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface LessonQuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface LessonQuizProps {
  questions: LessonQuizQuestion[]
  previousScore?: number
  previousTotal?: number
  onComplete: (score: number, total: number) => void
}

export const LessonQuiz = ({
  questions,
  previousScore,
  previousTotal,
  onComplete,
}: LessonQuizProps) => {
  const { t } = useTranslation('common')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentQuestion = questions[currentIndex]
  const hasAnswered = selectedIndex !== null
  const isCorrect = selectedIndex === currentQuestion?.correctIndex
  const hasPreviousScore = previousScore !== undefined && previousTotal !== undefined

  const scoreLabel = useMemo(() => {
    if (isFinished) {
      return t('learnAcademy.quiz.score', { score, total: questions.length })
    }

    if (hasPreviousScore) {
      return t('learnAcademy.quiz.bestScore', {
        score: previousScore,
        total: previousTotal,
      })
    }

    return t('learnAcademy.quiz.notCompleted')
  }, [hasPreviousScore, isFinished, previousScore, previousTotal, questions.length, score, t])

  if (questions.length === 0 || !currentQuestion) {
    return null
  }

  const handleSelect = (optionIndex: number) => {
    if (hasAnswered || isFinished) {
      return
    }

    setSelectedIndex(optionIndex)
    if (optionIndex === currentQuestion.correctIndex) {
      setScore((current) => current + 1)
    }
  }

  const handleNext = () => {
    if (!hasAnswered) {
      return
    }

    if (currentIndex === questions.length - 1) {
      const finalScore = score
      setIsFinished(true)
      onComplete(finalScore, questions.length)
      return
    }

    setCurrentIndex((current) => current + 1)
    setSelectedIndex(null)
  }

  return (
    <section className="rounded-lg border-[0.5px] border-border bg-background/40 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">
            {t('learnAcademy.quiz.kicker')}
          </p>
          <h2 className="mt-2 text-xl font-bold text-text-primary">
            {t('learnAcademy.quiz.title')}
          </h2>
        </div>
        <p className="rounded-md border-[0.5px] border-border bg-surface px-3 py-2 text-xs font-semibold text-text-muted">
          {scoreLabel}
        </p>
      </div>

      {isFinished ? (
        <div className="mt-5 rounded-md border-[0.5px] border-primary/40 bg-primary-dim p-4">
          <p className="text-sm font-semibold text-text-primary">
            {t('learnAcademy.quiz.completed', { score, total: questions.length })}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-text-subtle">
              {t('learnAcademy.quiz.questionCount', {
                current: currentIndex + 1,
                total: questions.length,
              })}
            </p>
            <p className="mt-2 text-base font-semibold leading-7 text-text-primary">
              {currentQuestion.question}
            </p>
          </div>

          <div className="grid gap-2">
            {currentQuestion.options.map((option, optionIndex) => {
              const isSelected = selectedIndex === optionIndex
              const isAnswer = currentQuestion.correctIndex === optionIndex
              const answerClass = hasAnswered
                ? isAnswer
                  ? 'border-primary bg-primary-dim text-text-primary'
                  : isSelected
                    ? 'border-danger text-danger'
                    : 'border-border text-text-muted'
                : 'border-border text-text-primary hover:border-border-hover hover:bg-surface'

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(optionIndex)}
                  disabled={hasAnswered}
                  className={`rounded-md border-[0.5px] px-4 py-3 text-left text-sm font-semibold leading-6 transition ${answerClass}`}
                >
                  {option}
                </button>
              )
            })}
          </div>

          {hasAnswered ? (
            <div className="rounded-md border-[0.5px] border-border bg-surface p-4">
              <p className={`text-sm font-bold ${isCorrect ? 'text-primary' : 'text-danger'}`}>
                {isCorrect ? t('learnAcademy.quiz.correct') : t('learnAcademy.quiz.incorrect')}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {currentQuestion.explanation}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleNext}
            disabled={!hasAnswered}
            className="w-fit rounded-md bg-primary px-5 py-3 text-sm font-bold text-background transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {currentIndex === questions.length - 1
              ? t('learnAcademy.quiz.finish')
              : t('learnAcademy.quiz.next')}
          </button>
        </div>
      )}
    </section>
  )
}
