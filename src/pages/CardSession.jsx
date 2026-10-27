import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { getModule, modules } from '../data/b2.js'
import { POINTS, useProgress } from '../store/progress.jsx'
import { buildReviewDeck, isHard, reinsert, shuffle } from '../store/srs.js'

// key по location.key — чтобы «Повторение» с экрана результата начиналось заново
export default function CardSessionRoute(props) {
  const location = useLocation()
  return <CardSession key={location.key} {...props} />
}

function CardSession({ review = false }) {
  const { id } = useParams()
  const progress = useProgress()
  const { wordStats, completedCardTopics, markWord, completeCardTopic } = progress
  const module = review ? null : getModule(id)

  const [session, setSession] = useState(() => {
    let deck = []
    if (review) {
      const pool = modules.filter((m) => completedCardTopics.includes(m.id)).flatMap((m) => m.words)
      deck = buildReviewDeck(pool, wordStats)
    } else if (module) {
      deck = shuffle(module.words)
    }
    return { queue: deck, phase: 'main', againList: [], total: deck.length, learned: 0, again: 0, gained: 0 }
  })
  const [flipped, setFlipped] = useState(false)

  const { queue, phase } = session
  const current = queue[0]

  const answer = useCallback(
    (result) => {
      if (!current) return
      markWord(current.id, result)
      setFlipped(false)
      setSession((s) => {
        const rest = s.queue.slice(1)
        const base = {
          ...s,
          [result]: s[result] + 1,
          gained: s.gained + POINTS[result],
        }
        if (s.phase === 'main') {
          const againList = result === 'again' ? [...s.againList, current] : s.againList
          if (rest.length > 0) return { ...base, queue: rest, againList }
          // основной проход закончен → блок повторения или финиш
          if (againList.length > 0) return { ...base, queue: shuffle(againList), againList, phase: 'repeat' }
          return { ...base, queue: [], againList, phase: 'done' }
        }
        // блок повторения: «ещё раз» → вернуть через 8–12 карточек
        const q = result === 'again' ? reinsert(rest, current) : rest
        return { ...base, queue: q, phase: q.length ? 'repeat' : 'done' }
      })
    },
    [current, markWord]
  )

  // Бонус за завершение — один раз, при переходе в 'done'
  const [bonus, setBonus] = useState(0)
  useEffect(() => {
    if (phase !== 'done' || session.total === 0) return
    const moduleId = module ? module.id : null
    const first = moduleId != null && !completedCardTopics.includes(moduleId)
    setBonus(first ? POINTS.topicFirst : POINTS.topicRepeat)
    completeCardTopic(moduleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Клавиатура на ноутбуке: пробел — перевернуть, → — выучил, ← — ещё раз
  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'done') return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') answer('learned')
      else if (e.key === 'ArrowLeft') answer('again')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, phase])

  if (!review && !module) return <Navigate to="/cards" replace />
  if (review && session.total === 0) return <Navigate to="/cards" replace />

  const title = review ? 'Повторение' : module.title
  const doneMain = phase === 'main' ? session.total - queue.length : session.total
  const pct = phase === 'main' ? (doneMain / session.total) * 100 : 100

  if (phase === 'done') {
    return (
      <div className="page session-done">
        <div className="card result-card">
          <div className="result-emoji">🎉</div>
          <h1 className="h1">Керемет!</h1>
          <p className="muted">{review ? 'Повторение завершено' : `Тема «${module.title}» пройдена`}</p>
          <div className="result-stats">
            <div>
              <b>{session.total}</b>
              <span>карточек</span>
            </div>
            <div>
              <b>{session.againList.length}</b>
              <span>было трудных</span>
            </div>
            <div className="accent-stat">
              <b>+{session.gained + bonus}</b>
              <span>баллов</span>
            </div>
          </div>
          {session.againList.length > 0 && (
            <div className="hard-list">
              <p className="small muted">Эти слова попадутся чаще в повторении:</p>
              <div className="chips">
                {session.againList.map((w) => (
                  <span key={w.id} className="chip">
                    {w.kz}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="result-actions">
            <Link to="/cards" className="btn btn-primary btn-lg">
              К темам
            </Link>
            <Link to="/cards/review" className="btn btn-ghost btn-lg">
              <Icon name="repeat" size={18} /> Повторение
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const stat = wordStats[current.id]
  const wordModule = getModule(current.moduleId)

  return (
    <div className="page session">
      <div className="session-head">
        <Link to="/cards" className="icon-btn" aria-label="Закрыть">
          <Icon name="x" size={20} />
        </Link>
        <div className="session-title">
          <b>{title}</b>
          <span className="small muted">
            {phase === 'main' ? `${doneMain + 1} из ${session.total}` : `Блок повторения · осталось ${queue.length}`}
          </span>
        </div>
        <span className="chip chip-points">+{session.gained}</span>
      </div>
      <div className={`bar bar-lg ${phase === 'repeat' ? 'bar-repeat' : ''}`}>
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {phase === 'repeat' && (
        <div className="repeat-note">
          <Icon name="repeat" size={16} /> Повторяем слова, отмеченные «Учить ещё раз»
        </div>
      )}

      <div className="flip-wrap">
        <button
          key={current.id + queue.length}
          className={`flip-card ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped((f) => !f)}
          aria-label="Перевернуть карточку"
        >
          <div className="flip-face flip-front">
            {review && <span className="card-topic">{wordModule.emoji} {wordModule.title}</span>}
            {isHard(stat) && <span className="hard-tag">трудное</span>}
            <span className="card-word">{current.kz}</span>
            <span className="card-hint">Нажмите, чтобы увидеть перевод</span>
          </div>
          <div className="flip-face flip-back">
            <span className="card-word-small">{current.kz}</span>
            <span className="card-translation">{current.ru}</span>
            {stat && (
              <span className="card-hint">
                выучено {stat.learned} · ещё раз {stat.again}
              </span>
            )}
          </div>
        </button>
      </div>

      <div className="answer-btns">
        <button className="btn btn-again btn-lg" onClick={() => answer('again')}>
          <Icon name="repeat" size={18} /> Учить ещё раз
        </button>
        <button className="btn btn-primary btn-lg" onClick={() => answer('learned')}>
          <Icon name="check" size={18} /> Я выучил
        </button>
      </div>
      <p className="kbd-hint muted small">Пробел — перевернуть · ← ещё раз · → выучил</p>
    </div>
  )
}
