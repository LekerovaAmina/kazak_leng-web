// Логика интервального повторения карточек.
//
// 1. Основной проход: все слова темы по одному разу (в случайном порядке).
//    «Учить ещё раз» откладывает слово в блок повторения.
// 2. Блок повторения (в конце): только отложенные слова. Если слово снова
//    «Учить ещё раз», оно возвращается в очередь не сразу, а через
//    REPEAT_GAP карточек (8–12), чтобы не мелькало каждые 5–7 слов.
//    Если в очереди меньше карточек — слово уходит в конец.
// 3. Режим «Повторение» (все пройденные темы): слова выбираются случайно
//    с весом. Чем чаще слово отмечали «Учить ещё раз» и чем реже «Я выучил»,
//    тем выше вес — трудные слова попадаются заметно чаще.

export const REPEAT_GAP = { min: 8, max: 12 }
export const REVIEW_SIZE = 20

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function reinsert(queue, word) {
  const gap = REPEAT_GAP.min + Math.floor(Math.random() * (REPEAT_GAP.max - REPEAT_GAP.min + 1))
  const q = [...queue]
  q.splice(Math.min(gap, q.length), 0, word)
  return q
}

// Вес слова: новое = 1; каждое «ещё раз» +2; каждое «выучил» −0.5; минимум 0.3.
export function weightOf(stat) {
  if (!stat) return 1
  return Math.max(0.3, 1 + stat.again * 2 - stat.learned * 0.5)
}

export const isHard = (stat) => !!stat && stat.again >= 2 && stat.again >= stat.learned

export function buildReviewDeck(words, stats, size = REVIEW_SIZE) {
  // Взвешенная выборка без возвращения (метод Эфраимидиса–Спиракиса)
  return words
    .map((w) => ({ w, key: Math.pow(Math.random(), 1 / weightOf(stats[w.id])) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, size)
    .map((x) => x.w)
}
