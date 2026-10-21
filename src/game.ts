import type { AnswerRecord, ProgressData, Question } from './types'

export const TABLES = Array.from({ length: 10 }, (_, index) => index + 1)

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function createLearnQuestions(table: number, random: () => number = Math.random): Question[] {
  return shuffle(
    TABLES.map((right) => ({ left: table, right })),
    random,
  )
}

export function createTestQuestions(random: () => number = Math.random): Question[] {
  const allQuestions = TABLES.flatMap((left) =>
    TABLES.map((right) => ({ left, right })),
  )
  return shuffle(allQuestions, random).slice(0, 20)
}

export function getWeakTables(answers: AnswerRecord[]): number[] {
  const mistakes = new Map<number, number>()

  answers.filter((answer) => !answer.correct).forEach(({ left, right }) => {
    mistakes.set(left, (mistakes.get(left) ?? 0) + 1)
    if (right !== left) mistakes.set(right, (mistakes.get(right) ?? 0) + 1)
  })

  return [...mistakes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 3)
    .map(([table]) => table)
}

export function emptyProgress(): ProgressData {
  return {
    tables: Object.fromEntries(
      TABLES.map((table) => [String(table), { attempts: 0, correct: 0, totalTimeMs: 0 }]),
    ),
    tests: [],
  }
}
