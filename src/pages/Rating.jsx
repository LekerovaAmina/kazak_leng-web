import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { allWords } from '../data/b2.js'
import { POINTS, RANKS, rankOf, streakOf, useProgress } from '../store/progress.jsx'

// Демо-участники для таблицы. С бэкендом заменить на GET /api/leaderboard
const demoUsers = [
  { name: 'Айгерим', points: 1340 },
  { name: 'Нурлан', points: 980 },
  { name: 'Мадина', points: 760 },
  { name: 'Ержан', points: 540 },
  { name: 'Дана', points: 410 },
  { name: 'Тимур', points: 260 },
  { name: 'Асель', points: 120 },
  { name: 'Арман', points: 45 },
]

export default function Rating() {
  const { points, wordStats, activeDays, reset } = useProgress()
  const rank = rankOf(points)
  const learned = allWords.filter((w) => wordStats[w.id]?.learned).length
  const board = [...demoUsers, { name: 'Вы', points, me: true }].sort((a, b) => b.points - a.points)
  const myPlace = board.findIndex((u) => u.me) + 1

  const onReset = () => {
    if (window.confirm('Сбросить весь прогресс и баллы?')) reset()
  }

  return (
    <div className="page">
      <div className="page-head">
        <Link to="/home" className="back-link">
          <Icon name="back" size={18} /> Главная
        </Link>
        <h1 className="h1">Рейтинг</h1>
      </div>

      <div className="rating-hero card">
        <div className="rating-place">
          <span className="small">Ваше место</span>
          <b>#{myPlace}</b>
        </div>
        <div className="rating-main">
          <span className="rank-title">
            {rank.title} <span className="muted">· {rank.ru}</span>
          </span>
          <b className="rating-points">{points} баллов</b>
          <div className="bar bar-light">
            <div className="bar-fill" style={{ width: `${rank.pct * 100}%` }} />
          </div>
          <span className="small">
            {rank.next ? `До уровня «${rank.next.title}» — ${rank.toNext} баллов` : 'Максимальный уровень!'}
          </span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <Icon name="fire" size={18} />
          <b>{streakOf(activeDays)}</b>
          <span>дней подряд</span>
        </div>
        <div className="stat">
          <Icon name="check" size={18} />
          <b>{learned}</b>
          <span>слов выучено</span>
        </div>
      </div>

      <h2 className="h2">Таблица лидеров</h2>
      <div className="card leaderboard">
        {board.map((u, i) => (
          <div key={u.name} className={`lb-row ${u.me ? 'me' : ''}`}>
            <span className={`lb-place p${i + 1}`}>{i + 1}</span>
            <span className="lb-avatar">{u.name[0]}</span>
            <span className="lb-name">{u.name}</span>
            <span className="lb-points">{u.points}</span>
          </div>
        ))}
      </div>

      <h2 className="h2">Как начисляются баллы</h2>
      <div className="card rules">
        <div><span>«Я выучил»</span><b>+{POINTS.learned}</b></div>
        <div><span>«Учить ещё раз»</span><b>+{POINTS.again}</b></div>
        <div><span>Тема карточек пройдена впервые</span><b>+{POINTS.topicFirst}</b></div>
        <div><span>Повторное прохождение / повторение</span><b>+{POINTS.topicRepeat}</b></div>
        <div><span>Правильный ответ в тесте (сверх лучшего)</span><b>+{POINTS.quizCorrect}</b></div>
      </div>

      <h2 className="h2">Уровни</h2>
      <div className="ranks">
        {RANKS.map((r, i) => (
          <div key={r.title} className={`rank-pill ${i <= rank.index ? 'reached' : ''}`}>
            <b>{r.title}</b>
            <span className="small">{r.min}+</span>
          </div>
        ))}
      </div>

      <button className="btn btn-link" onClick={onReset}>
        Сбросить прогресс
      </button>
    </div>
  )
}
