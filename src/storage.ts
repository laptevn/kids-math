import { emptyProgress, localDateKey, questionKey } from './game'
import type { AnswerRecord, Mode, ProgressData } from './types'

const STORAGE_KEY = 'kristina-math-progress-v1'
export const DAILY_MISSION_MS = 15 * 60 * 1000

function persist(progress: ProgressData): ProgressData {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  return progress
}

function currentDailyMission(progress: ProgressData): ProgressData['dailyMission'] {
  const today = localDateKey()
  return progress.dailyMission.date === today
    ? progress.dailyMission
    : { date: today, activeMs: 0, completed: false }
}

export function loadProgress(): ProgressData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return emptyProgress()
    const parsed = JSON.parse(saved) as Partial<ProgressData>
    const empty = emptyProgress()
    const loaded: ProgressData = {
      ...empty,
      ...parsed,
      tables: { ...empty.tables, ...parsed.tables },
      weakFacts: Array.isArray(parsed.weakFacts) ? parsed.weakFacts : [],
      dailyMission: parsed.dailyMission ?? empty.dailyMission,
      feedbackEnabled: parsed.feedbackEnabled ?? true,
    }
    return { ...loaded, dailyMission: currentDailyMission(loaded) }
  } catch {
    return emptyProgress()
  }
}

export function saveAnswer(
  current: ProgressData,
  answer: AnswerRecord,
  mode: Mode,
): ProgressData {
  const next: ProgressData = structuredClone(current)
  const touchedTables = answer.left === answer.right
    ? [answer.left]
    : [answer.left, answer.right]

  touchedTables.forEach((table) => {
    const stats = next.tables[String(table)]
    stats.attempts += 1
    stats.correct += answer.correct ? 1 : 0
    stats.totalTimeMs += answer.elapsedMs
  })

  const key = questionKey(answer)
  if (!answer.correct && !next.weakFacts.includes(key)) {
    next.weakFacts.push(key)
  } else if (answer.correct && mode !== 'test') {
    next.weakFacts = next.weakFacts.filter((fact) => fact !== key)
  }

  return persist(next)
}

export function saveTestResult(current: ProgressData, answers: AnswerRecord[]): ProgressData {
  const next: ProgressData = structuredClone(current)
  const correct = answers.filter((answer) => answer.correct).length
  const averageTimeMs = Math.round(
    answers.reduce((sum, answer) => sum + answer.elapsedMs, 0) / Math.max(answers.length, 1),
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
  return persist(next)
}

export function addDailyMissionTime(current: ProgressData, elapsedMs: number): ProgressData {
  const next: ProgressData = structuredClone(current)
  const mission = currentDailyMission(next)
  const activeMs = Math.min(DAILY_MISSION_MS, mission.activeMs + elapsedMs)
  next.dailyMission = {
    ...mission,
    activeMs,
    completed: activeMs >= DAILY_MISSION_MS,
  }
  return persist(next)
}

export function setFeedbackEnabled(current: ProgressData, enabled: boolean): ProgressData {
  return persist({ ...current, feedbackEnabled: enabled })
}
