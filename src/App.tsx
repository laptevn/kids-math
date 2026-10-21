import { useEffect, useMemo, useRef, useState } from 'react'
import { Decorations, UnicornBadge } from './components/Decorations'
import { Keypad } from './components/Keypad'
import { createLearnQuestions, createTestQuestions, getWeakTables, TABLES } from './game'
import { loadProgress, saveRound } from './storage'
import type { AnswerRecord, Mode, ProgressData, Question } from './types'

type Screen = 'home' | 'choose' | 'game' | 'result' | 'progress'

function formatSeconds(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(1).replace('.', ',')} сек`
}

function accuracy(correct: number, attempts: number) {
  return attempts ? Math.round((correct / attempts) * 100) : 0
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<Mode>('learn')
  const [selectedTable, setSelectedTable] = useState(1)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [progress, setProgress] = useState<ProgressData>(() => loadProgress())
  const startedAt = useRef(Date.now())

  const currentQuestion = questions[questionIndex]
  const correctCount = answers.filter((item) => item.correct).length
  const weakTables = useMemo(() => getWeakTables(answers), [answers])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    }
  }, [])

  const beginRound = (nextMode: Mode, table = selectedTable) => {
    setMode(nextMode)
    setSelectedTable(table)
    setQuestions(nextMode === 'learn' ? createLearnQuestions(table) : createTestQuestions())
    setQuestionIndex(0)
    setAnswers([])
    setAnswer('')
    setFeedback(null)
    startedAt.current = Date.now()
    setScreen('game')
  }

  const submitAnswer = () => {
    if (!answer || feedback || !currentQuestion) return
    const numericAnswer = Number(answer)
    const isCorrect = numericAnswer === currentQuestion.left * currentQuestion.right
    const record: AnswerRecord = {
      ...currentQuestion,
      answer: numericAnswer,
      correct: isCorrect,
      elapsedMs: Date.now() - startedAt.current,
    }
    setAnswers((current) => [...current, record])
    setFeedback(isCorrect ? 'correct' : 'wrong')
  }

  const advance = () => {
    if (questionIndex === questions.length - 1) {
      const nextProgress = saveRound(progress, answers, mode)
      setProgress(nextProgress)
      setScreen('result')
      return
    }
    setQuestionIndex((index) => index + 1)
    setAnswer('')
    setFeedback(null)
    startedAt.current = Date.now()
  }

  if (screen === 'home') {
    const latest = progress.tests[0]
    return (
      <main className="app-shell home-screen">
        <Decorations />
        <section className="hero-card">
          <div className="eyebrow">Волшебная математика</div>
          <UnicornBadge />
          <h1>Кристина считает</h1>
          <p className="hero-copy">Тренируй таблицу умножения<br />и собирай звёзды!</p>
          <div className="mode-grid">
            <button className="mode-card learn-card" type="button" onClick={() => setScreen('choose')}>
              <span className="mode-icon">★</span>
              <span><strong>Учить</strong><small>Выбрать таблицу</small></span>
              <b>›</b>
            </button>
            <button className="mode-card test-card" type="button" onClick={() => beginRound('test')}>
              <span className="mode-icon">⚡</span>
              <span><strong>Проверить себя</strong><small>20 примеров</small></span>
              <b>›</b>
            </button>
          </div>
          <button className="progress-link" type="button" onClick={() => setScreen('progress')}>
            <span>♕</span>
            <span><strong>Мои успехи</strong>{latest ? `Последний тест: ${latest.correct} из ${latest.total}` : 'Начни первую тренировку'}</span>
            <b>›</b>
          </button>
        </section>
      </main>
    )
  }

  if (screen === 'choose') {
    return (
      <main className="app-shell">
        <Decorations />
        <section className="content-card choose-card">
          <header className="topbar">
            <button className="back-button" type="button" onClick={() => setScreen('home')} aria-label="Назад">‹</button>
            <UnicornBadge small />
            <span className="topbar-title">Выбери таблицу</span>
          </header>
          <div className="choose-copy">
            <span className="mini-crown">♕</span>
            <h2>Что учим сегодня?</h2>
            <p>Выбери число — и начнём!</p>
          </div>
          <div className="table-grid">
            {TABLES.map((table) => {
              const stats = progress.tables[String(table)]
              return (
                <button key={table} type="button" className="table-button" onClick={() => beginRound('learn', table)}>
                  <strong>{table}</strong>
                  <span>{stats.attempts ? `${accuracy(stats.correct, stats.attempts)}%` : 'новая'}</span>
                </button>
              )
            })}
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'game' && currentQuestion) {
    const visibleCorrectCount = correctCount
    return (
      <main className="app-shell game-screen">
        <Decorations />
        <section className="content-card game-card">
          <header className="game-header">
            <button className="back-button" type="button" onClick={() => setScreen('home')} aria-label="Закончить тренировку">×</button>
            <div className="game-title">
              <strong>{mode === 'learn' ? `Таблица на ${selectedTable}` : 'Проверка знаний'}</strong>
              <span>{questionIndex + 1} из {questions.length}</span>
            </div>
            <div className="score-chip">★ {visibleCorrectCount}</div>
          </header>
          <div className="progress-track"><span style={{ width: `${((questionIndex + (feedback ? 1 : 0)) / questions.length) * 100}%` }} /></div>
          <div className="question-area">
            <p className="prompt">Сколько получится?</p>
            <div className="equation">
              <span>{currentQuestion.left}</span><i>×</i><span>{currentQuestion.right}</span><i>=</i>
              <span className={`answer-box ${feedback ?? ''}`}>{answer || '?'}</span>
            </div>
            {feedback ? (
              <div className={`feedback ${feedback}`} role="status">
                <strong>{feedback === 'correct' ? 'Верно! ✨' : 'Почти получилось!'}</strong>
                <span>{feedback === 'correct' ? 'Отличный ответ' : `Правильный ответ: ${currentQuestion.left * currentQuestion.right}`}</span>
                <button type="button" onClick={advance}>{questionIndex === questions.length - 1 ? 'Узнать результат' : 'Дальше'} →</button>
              </div>
            ) : (
              <Keypad value={answer} disabled={false} onChange={setAnswer} onSubmit={submitAnswer} />
            )}
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'result') {
    const totalTime = answers.reduce((sum, item) => sum + item.elapsedMs, 0)
    const averageTime = totalTime / Math.max(answers.length, 1)
    const perfect = correctCount === answers.length
    return (
      <main className="app-shell result-screen">
        <Decorations />
        <section className="content-card result-card">
          <div className="result-stars">✦ ★ ✦</div>
          <UnicornBadge />
          <p className="eyebrow">Тренировка закончена</p>
          <h2>{perfect ? 'Великолепно, Кристина!' : 'Умница, Кристина!'}</h2>
          <p className="result-copy">Каждая тренировка делает тебя быстрее</p>
          <div className="result-score"><strong>{correctCount}</strong><span>из {answers.length}</span></div>
          <div className="result-stats">
            <span><b>{accuracy(correctCount, answers.length)}%</b>верных ответов</span>
            <span><b>{formatSeconds(averageTime)}</b>в среднем</span>
          </div>
          {mode === 'test' && weakTables.length > 0 && (
            <div className="recommendation">
              <strong>Стоит потренировать</strong>
              <div>{weakTables.map((table) => <span key={table}>× {table}</span>)}</div>
            </div>
          )}
          <button className="primary-button" type="button" onClick={() => beginRound(mode, selectedTable)}>↻ Повторить</button>
          <button className="secondary-button" type="button" onClick={() => setScreen('home')}>На главную</button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <Decorations />
      <section className="content-card progress-card">
        <header className="topbar">
          <button className="back-button" type="button" onClick={() => setScreen('home')} aria-label="Назад">‹</button>
          <span className="topbar-title">Мои успехи</span>
          <span className="topbar-spacer" />
        </header>
        <div className="progress-heading"><span>♕</span><h2>Так держать, Кристина!</h2><p>Твои результаты по каждой таблице</p></div>
        <div className="stats-list">
          {TABLES.map((table) => {
            const stats = progress.tables[String(table)]
            const percent = accuracy(stats.correct, stats.attempts)
            return (
              <div className="stat-row" key={table}>
                <strong>× {table}</strong>
                <div className="stat-track"><span style={{ width: `${percent}%` }} /></div>
                <span>{stats.attempts ? `${percent}%` : '—'}</span>
              </div>
            )
          })}
        </div>
        <button className="primary-button" type="button" onClick={() => setScreen('choose')}>Продолжить учиться</button>
      </section>
    </main>
  )
}
