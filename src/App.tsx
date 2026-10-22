import { useEffect, useMemo, useRef, useState } from 'react'
import { Decorations, UnicornBadge } from './components/Decorations'
import { Keypad } from './components/Keypad'
import { appendRetryIfNeeded, createLearnQuestions, createTestQuestions, createWeakQuestions, getWeakTables, TABLES } from './game'
import { addDailyMissionTime, DAILY_MISSION_MS, loadProgress, saveAnswer, saveTestResult, setFeedbackEnabled } from './storage'
import type { AnswerRecord, Mode, ProgressData, Question } from './types'

type Screen = 'home' | 'choose' | 'game' | 'result' | 'progress'

function formatSeconds(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(1).replace('.', ',')} сек`
}

function accuracy(correct: number, attempts: number) {
  return attempts ? Math.round((correct / attempts) * 100) : 0
}

let audioContext: AudioContext | null = null

function playFeedback(enabled: boolean, correct: boolean) {
  if (!enabled) return

  if ('vibrate' in navigator) {
    navigator.vibrate(correct ? 35 : [55, 45, 55])
  }

  try {
    audioContext ??= new AudioContext()
    const now = audioContext.currentTime
    const notes = correct ? [660, 880] : [260, 210]
    notes.forEach((frequency, index) => {
      const oscillator = audioContext!.createOscillator()
      const gain = audioContext!.createGain()
      const startsAt = now + index * 0.1
      oscillator.type = correct ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, startsAt)
      gain.gain.exponentialRampToValueAtTime(0.12, startsAt + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.12)
      oscillator.connect(gain).connect(audioContext!.destination)
      oscillator.start(startsAt)
      oscillator.stop(startsAt + 0.13)
    })
  } catch {
    // Feedback is optional; unsupported audio must not block the game.
  }
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
  const [missionCelebration, setMissionCelebration] = useState(false)
  const missionWasCompleted = useRef(progress.dailyMission.completed)
  const startedAt = useRef(Date.now())

  const currentQuestion = questions[questionIndex]
  const correctCount = answers.filter((item) => item.correct).length
  const weakTables = useMemo(() => getWeakTables(answers), [answers])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    }
  }, [])

  useEffect(() => {
    if (screen !== 'game') return

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setProgress((current) => addDailyMissionTime(current, 1000))
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [screen])

  useEffect(() => {
    if (!missionWasCompleted.current && progress.dailyMission.completed) {
      setMissionCelebration(true)
      const timer = window.setTimeout(() => setMissionCelebration(false), 4500)
      missionWasCompleted.current = true
      return () => window.clearTimeout(timer)
    }
    missionWasCompleted.current = progress.dailyMission.completed
  }, [progress.dailyMission.completed])

  const beginRound = (nextMode: Mode, table = selectedTable) => {
    const nextQuestions = nextMode === 'learn'
      ? createLearnQuestions(table)
      : nextMode === 'weak'
        ? createWeakQuestions(progress.weakFacts, 10)
        : createTestQuestions()

    if (!nextQuestions.length) return
    setMode(nextMode)
    setSelectedTable(table)
    setQuestions(nextQuestions)
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
    if (mode !== 'test') {
      setQuestions((current) => appendRetryIfNeeded(current, currentQuestion, isCorrect))
    }
    setAnswers((current) => [...current, record])
    setProgress((current) => saveAnswer(current, record, mode))
    playFeedback(progress.feedbackEnabled, isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')
  }

  const advance = () => {
    if (questionIndex === questions.length - 1) {
      if (mode === 'test') {
        setProgress((current) => saveTestResult(current, answers))
      }
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
    const missionPercent = Math.min(100, Math.round((progress.dailyMission.activeMs / DAILY_MISSION_MS) * 100))
    const missionMinutes = Math.min(15, Math.floor(progress.dailyMission.activeMs / 60000))
    return (
      <main className="app-shell home-screen">
        <Decorations />
        <section className="hero-card">
          <button
            className={`feedback-toggle ${progress.feedbackEnabled ? 'enabled' : ''}`}
            type="button"
            aria-label={progress.feedbackEnabled ? 'Выключить звук и вибрацию' : 'Включить звук и вибрацию'}
            aria-pressed={progress.feedbackEnabled}
            onClick={() => setProgress((current) => setFeedbackEnabled(current, !current.feedbackEnabled))}
          >
            {progress.feedbackEnabled ? '🔊' : '🔇'}
          </button>
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
            <button
              className="mode-card weak-card"
              type="button"
              onClick={() => beginRound('weak')}
              disabled={!progress.weakFacts.length}
            >
              <span className="mode-icon">✦</span>
              <span>
                <strong>Слабые места</strong>
                <small>{progress.weakFacts.length ? `Сложных примеров: ${Math.min(10, new Set(progress.weakFacts).size)}` : 'Появятся после ошибок'}</small>
              </span>
              <b>›</b>
            </button>
          </div>
          <div className={`daily-mission ${progress.dailyMission.completed ? 'completed' : ''}`}>
            <div className="mission-copy">
              <span>{progress.dailyMission.completed ? '✓' : '☀'}</span>
              <div>
                <strong>Задание на сегодня</strong>
                <small>{progress.dailyMission.completed ? 'Выполнено! 15 минут практики' : `${missionMinutes} из 15 минут`}</small>
              </div>
            </div>
            <div className="mission-track"><span style={{ width: `${missionPercent}%` }} /></div>
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
        {missionCelebration && (
          <div className="mission-celebration" role="status">
            ✨ Задание на сегодня выполнено! Продолжай, если хочется.
          </div>
        )}
        <section className="content-card game-card">
          <header className="game-header">
            <button className="back-button" type="button" onClick={() => setScreen('home')} aria-label="Закончить тренировку">×</button>
            <div className="game-title">
              <strong>{mode === 'learn' ? `Таблица на ${selectedTable}` : mode === 'weak' ? 'Слабые места' : 'Проверка знаний'}</strong>
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
          {mode !== 'weak' || progress.weakFacts.length > 0 ? (
            <button className="primary-button" type="button" onClick={() => beginRound(mode, selectedTable)}>↻ Повторить</button>
          ) : (
            <div className="all-fixed">✨ Все слабые места исправлены!</div>
          )}
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
