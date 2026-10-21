import { emptyProgress } from './game'
import type { AnswerRecord, Mode, ProgressData } from './types'

const STORAGE_KEY = 'kristina-math-progress-v1'

export function loadProgress(): ProgressData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return emptyProgress()
    const parsed = JSON.parse(saved) as ProgressData
    return { ...emptyProgress(), ...parsed, tables: { ...emptyProgress().tables, ...parsed.tables } }
  } catch {
    return emptyProgress()
  }
}

export function saveRound(
  current: ProgressData,
  answers: AnswerRecord[],
  mode: Mode,
): ProgressData {
  const next: ProgressData = structuredClone(current)

  answers.forEach((answer) => {
    const touchedTables = answer.left === answer.right
      ? [answer.left]
      : [answer.left, answer.right]

    touchedTables.forEach((table) => {
      const stats = next.tables[String(table)]
      stats.attempts += 1
      stats.correct += answer.correct ? 1 : 0
      stats.totalTimeMs += answer.elapsedMs
    })
  })

  if (mode === 'test') {
    const correct = answers.filter((answer) => answer.correct).length
    const averageTimeMs = Math.round(
      answers.reduce((sum, answer) => sum + answer.elapsedMs, 0) / answers.length,
    )
    next.tests = [
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        correct,
        total: answers.length,
        averageTimeMs,
      },
      ...next.tests,
    ].slice(0, 10)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
