import { describe, expect, it } from 'vitest'
import { appendRetryIfNeeded, createLearnQuestions, createTestQuestions, createWeakQuestions, getWeakTables } from './game'

describe('question generation', () => {
  it('creates every fact for a selected table exactly once', () => {
    const questions = createLearnQuestions(7, () => 0.5)
    expect(questions).toHaveLength(10)
    expect(new Set(questions.map((question) => question.right))).toEqual(new Set([1,2,3,4,5,6,7,8,9,10]))
    expect(questions.every((question) => question.left === 7)).toBe(true)
  })

  it('creates 20 unique test questions', () => {
    const questions = createTestQuestions(() => 0.42)
    expect(questions).toHaveLength(20)
    expect(new Set(questions.map(({ left, right }) => `${left}x${right}`)).size).toBe(20)
  })

  it('creates a session with up to ten unique weak facts', () => {
    const questions = createWeakQuestions(['7x8', '6x9'], 10, () => 0.5)
    expect(questions).toHaveLength(2)
    expect(questions.every(({ left, right }) => (left === 7 && right === 8) || (left === 6 && right === 9))).toBe(true)
  })

  it('does not duplicate repeated entries from saved history', () => {
    expect(createWeakQuestions(['3x9', '3x9'], 10)).toEqual([{ left: 3, right: 9 }])
  })

  it('ignores invalid saved weak facts', () => {
    expect(createWeakQuestions(['not-a-question'])).toEqual([])
  })

  it('queues exactly one retry after a wrong answer', () => {
    const questions = [{ left: 2, right: 3 }]
    const answered = { left: 7, right: 8 }
    expect(appendRetryIfNeeded(questions, answered, false)).toEqual([
      { left: 2, right: 3 },
      { left: 7, right: 8 },
    ])
  })

  it('does not queue a retry after a correct answer', () => {
    const questions = [{ left: 2, right: 3 }]
    expect(appendRetryIfNeeded(questions, { left: 7, right: 8 }, true)).toBe(questions)
  })
})

describe('recommendations', () => {
  it('prioritizes tables involved in the most mistakes', () => {
    const base = { answer: 0, elapsedMs: 1000, correct: false }
    const weak = getWeakTables([
      { ...base, left: 7, right: 8 },
      { ...base, left: 7, right: 6 },
      { ...base, left: 3, right: 7 },
    ])
    expect(weak[0]).toBe(7)
  })
})
