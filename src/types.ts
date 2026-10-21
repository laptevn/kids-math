export type Mode = 'learn' | 'test'

export interface Question {
  left: number
  right: number
}

export interface AnswerRecord extends Question {
  answer: number
  correct: boolean
  elapsedMs: number
}

export interface TableStats {
  attempts: number
  correct: number
  totalTimeMs: number
}

export interface TestHistoryItem {
  id: string
  date: string
  correct: number
  total: number
  averageTimeMs: number
}

export interface ProgressData {
  tables: Record<string, TableStats>
  tests: TestHistoryItem[]
}
