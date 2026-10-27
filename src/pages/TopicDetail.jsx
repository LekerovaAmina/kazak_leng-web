import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { getModule } from '../data/b2.js'
import { POINTS, useProgress } from '../store/progress.jsx'

const tabs = [
  { id: 'words', label: 'Сөздер', ru: 'Слова' },
  { id: 'grammar', label: 'Грамматика', ru: 'Грамматика' },
  { id: 'text', label: 'Мәтін', ru: 'Текст' },
  { id: 'quiz', label: 'Сұрақтар', ru: 'Вопросы' },
]

export default function TopicDetail() {
  const { id } = useParams()
  const m = getModule(id)
  const [tab, setTab] = useState('words')
  const { markRead, readTopics, quizBest } = useProgress()

  useEffect(() => {
    if (m && tab !== 'quiz') markRead(m.id, tab)
  }, [m, tab, markRead])

  if (!m) return <Navigate to="/topics" replace />
  const read = readTopics[m.id] || {}
  const go = (t) => {
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const idx = tabs.findIndex((t) => t.id === tab)

  return (
    <div className="page">
      <div className="page-head">
        <Link to="/topics" className="back-link">
          <Icon name="back" size={18} /> Темы
        </Link>
        <div className="topic-hero" style={{ '--c': m.color }}>
          <span className="topic-emoji lg">{m.emoji}</span>
          <div>
            <span className="topic-num">Модуль {m.id}</span>
            <h1 className="h1">{m.title}</h1>
            <p className="muted">{m.titleRu}</p>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => go(t.id)}
          >
            {t.label}
            {(t.id === 'quiz' ? quizBest[m.id] != null : read[t.id]) && <span className="tab-dot" />}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {tab === 'words' && <Words m={m} />}
        {tab === 'grammar' && <Grammar g={m.grammar} />}
        {tab === 'text' && <Text t={m.text} />}
        {tab === 'quiz' && <Quiz m={m} key={m.id} />}
      </div>

      {idx < tabs.length - 1 && (
        <button className="btn btn-primary btn-lg btn-block" onClick={() => go(tabs[idx + 1].id)}>
          Далее: {tabs[idx + 1].ru} <Icon name="arrow" size={18} />
        </button>
      )}
    </div>
  )
}

function Words({ m }) {
  return (
    <>
      <div className="panel-head">
        <h2 className="h2">Жаңа сөздер</h2>
        <Link to={`/cards/${m.id}`} className="btn btn-ghost btn-sm">
          <Icon name="cards" size={16} /> Учить карточками
        </Link>
      </div>
      <div className="word-list card">
        {m.words.map((w) => (
          <div key={w.id} className="word-row">
            <b>{w.kz}</b>
            <span className="muted">{w.ru}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function Grammar({ g }) {
  return (
    <>
      <div className="card grammar-card">
        <span className="eyebrow">Есте сақтаңыз!</span>
        <h2 className="h2">{g.title}</h2>
        <p className="grammar-ru">{g.titleRu}</p>
        <p>{g.explanation}</p>
      </div>
      <div className="grammar-table card">
        {g.table.map((row, i) => (
          <div key={i} className={`g-row ${row[0] ? '' : 'g-cont'}`}>
            <span className="g-form">{row[0]}</span>
            <span className="g-rule muted">{row[1]}</span>
            <span className="g-ex">{row[2]}</span>
          </div>
        ))}
      </div>
      <h3 className="h3">Мысалдар · Примеры</h3>
      <div className="examples">
        {g.examples.map(([kz, ru]) => (
          <div key={kz} className="card example">
            <b>{kz}</b>
            <span className="muted">{ru}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function Text({ t }) {
  return (
    <article className="card reading">
      <span className="eyebrow">Оқыңыз</span>
      <h2 className="h2">{t.title}</h2>
      {t.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </article>
  )
}

function Quiz({ m }) {
  const { saveQuiz, quizBest } = useProgress()
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const total = m.questions.length
  const correct = m.questions.filter((q, i) => answers[i] === q.answer).length
  const prevBest = quizBest[m.id] || 0
  const [gained, setGained] = useState(0)

  const check = () => {
    setGained(Math.max(0, correct - prevBest) * POINTS.quizCorrect)
    saveQuiz(m.id, correct)
    setChecked(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const retry = () => {
    setAnswers({})
    setChecked(false)
    setGained(0)
  }

  return (
    <>
      <p className="muted">Мәтін бойынша дұрыс жауапты таңдаңыз · Выберите правильный ответ по тексту</p>
      {checked && (
        <div className={`card quiz-result ${correct === total ? 'perfect' : ''}`}>
          <b>
            {correct} / {total}
          </b>
          <span>{correct === total ? 'Тамаша! Всё верно 🎉' : 'Посмотрите ошибки ниже и попробуйте ещё раз'}</span>
          {gained > 0 && <span className="chip chip-points">+{gained} баллов</span>}
        </div>
      )}
      <div className="quiz">
        {m.questions.map((q, i) => (
          <div key={i} className="card question">
            <p className="q-text">
              <span className="q-num">{i + 1}</span>
              {q.q}
            </p>
            <div className="options">
              {q.options.map((o, j) => {
                const chosen = answers[i] === j
                let cls = chosen ? 'chosen' : ''
                if (checked) cls = j === q.answer ? 'right' : chosen ? 'wrong' : 'dim'
                return (
                  <button
                    key={j}
                    className={`option ${cls}`}
                    disabled={checked}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                  >
                    <span className="opt-letter">{'ABCD'[j]}</span>
                    {o}
                    {checked && j === q.answer && <Icon name="check" size={16} className="opt-mark" />}
                    {checked && chosen && j !== q.answer && <Icon name="x" size={16} className="opt-mark" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {checked ? (
        <button className="btn btn-ghost btn-lg btn-block" onClick={retry}>
          <Icon name="repeat" size={18} /> Пройти ещё раз
        </button>
      ) : (
        <button
          className="btn btn-primary btn-lg btn-block"
          disabled={Object.keys(answers).length < total}
          onClick={check}
        >
          Проверить ({Object.keys(answers).length}/{total})
        </button>
      )}
    </>
  )
}
