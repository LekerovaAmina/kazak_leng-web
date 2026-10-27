import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Прогресс пользователя. Сейчас хранится в localStorage;
// когда появится бэкенд на Python, достаточно заменить load/save на запросы к API
// (например GET/PUT /api/progress), интерфейс хука useProgress останется тем же.

const KEY = 'tildes-progress-v1'

export const POINTS = {
  learned: 10, // «Я выучил»
  again: 2, // «Учить ещё раз» — за честность тоже немного
  topicFirst: 30, // первое прохождение темы карточек
  topicRepeat: 10, // повторное прохождение / повторение
  quizCorrect: 5, // за каждый новый правильный ответ сверх лучшего результата
}

const initial = {
  level: null,
  points: 0,
  wordStats: {}, // { [wordId]: { learned, again, last } }
  completedCardTopics: [], // id модулей, пройденных в карточках
  quizBest: {}, // { [moduleId]: число правильных }
  readTopics: {}, // { [moduleId]: { words, grammar, text } }
  activeDays: [], // 'YYYY-MM-DD'
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...initial, ...JSON.parse(raw) } : initial
  } catch {
    return initial
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* приватный режим и т.п. — просто работаем без сохранения */
  }
}

const today = () => new Date().toISOString().slice(0, 10)

const withActivity = (s) => (s.activeDays.includes(today()) ? s : { ...s, activeDays: [...s.activeDays, today()].slice(-60) })

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    save(state)
  }, [state])

  const actions = useMemo(
    () => ({
      setLevel: (level) => setState((s) => ({ ...s, level })),

      markWord: (wordId, result) =>
        setState((s) => {
          const prev = s.wordStats[wordId] || { learned: 0, again: 0 }
          const next = {
            ...prev,
            [result]: prev[result] + 1,
            last: Date.now(),
          }
          return withActivity({
            ...s,
            points: s.points + POINTS[result],
            wordStats: { ...s.wordStats, [wordId]: next },
          })
        }),

      // moduleId = null для режима «Повторение»
      completeCardTopic: (moduleId) =>
        setState((s) => {
          const first = moduleId != null && !s.completedCardTopics.includes(moduleId)
          return withActivity({
            ...s,
            points: s.points + (first ? POINTS.topicFirst : POINTS.topicRepeat),
            completedCardTopics: first ? [...s.completedCardTopics, moduleId] : s.completedCardTopics,
          })
        }),

      saveQuiz: (moduleId, correct) =>
        setState((s) => {
          const best = s.quizBest[moduleId] || 0
          const gained = Math.max(0, correct - best) * POINTS.quizCorrect
          return withActivity({
            ...s,
            points: s.points + gained,
            quizBest: { ...s.quizBest, [moduleId]: Math.max(best, correct) },
          })
        }),

      markRead: (moduleId, section) =>
        setState((s) => ({
          ...s,
          readTopics: { ...s.readTopics, [moduleId]: { ...(s.readTopics[moduleId] || {}), [section]: true } },
        })),

      reset: () => setState({ ...initial }),
    }),
    []
  )

  return <ProgressContext.Provider value={{ ...state, ...actions }}>{children}</ProgressContext.Provider>
}

export const useProgress = () => useContext(ProgressContext)

// Сколько дней подряд пользователь занимается (включая сегодня или вчера)
export function streakOf(days) {
  const set = new Set(days)
  let n = 0
  const d = new Date()
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (set.has(d.toISOString().slice(0, 10))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export const RANKS = [
  { min: 0, title: 'Бастаушы', ru: 'Новичок' },
  { min: 150, title: 'Үйренуші', ru: 'Ученик' },
  { min: 500, title: 'Білгір', ru: 'Знаток' },
  { min: 1200, title: 'Шебер', ru: 'Мастер' },
  { min: 2500, title: 'Шешен', ru: 'Оратор' },
]

export function rankOf(points) {
  let i = RANKS.length - 1
  while (points < RANKS[i].min) i--
  const next = RANKS[i + 1]
  return { ...RANKS[i], index: i, next, toNext: next ? next.min - points : 0, pct: next ? (points - RANKS[i].min) / (next.min - RANKS[i].min) : 1 }
}
