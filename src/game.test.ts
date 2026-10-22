import { describe, expect, it } from 'vitest'
import { createLearnQuestions, createTestQuestions, createWeakQuestions, getWeakTables } from './game'

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

  it('creates a ten-question session from saved weak facts', () => {
    const questions = createWeakQuestions(['7x8', '6x9'], 10, () => 0.5)
    expect(questions).toHaveLength(10)
    expect(questions.every(({ left, right }) => (left === 7 && right === 8) || (left === 6 && right === 9))).toBe(true)
  })

  it('ignores invalid saved weak facts', () => {
    expect(createWeakQuestions(['not-a-question'])).toEqual([])
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
