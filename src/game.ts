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

export function questionKey({ left, right }: Question): string {
  return `${left}x${right}`
}

export function parseQuestionKey(key: string): Question | null {
  const match = /^(10|[1-9])x(10|[1-9])$/.exec(key)
  if (!match) return null
  return { left: Number(match[1]), right: Number(match[2]) }
}

export function createWeakQuestions(
  weakFacts: string[],
  count = 10,
  random: () => number = Math.random,
): Question[] {
  const facts = [...new Set(weakFacts)]
    .map(parseQuestionKey)
    .filter((question): question is Question => question !== null)

  return shuffle(facts, random).slice(0, count)
}

export function appendRetryIfNeeded(
  questions: Question[],
  answeredQuestion: Question,
  correct: boolean,
): Question[] {
  return correct ? questions : [...questions, answeredQuestion]
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
    weakFacts: [],
    dailyMission: {
      date: localDateKey(),
      activeMs: 0,
      completed: false,
    },
    feedbackEnabled: true,
  }
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
